# Architecture

This document explains how Virtual Labs is put together: the runtime topology, the peer-host physics authority model, the data flow for every kind of interaction, and the internals of the physics loop.

## 1. High-level topology

```
                         ┌───────────────────────────────────────────────┐
                         │             server.ts  (Node process)          │
                         │                                                 │
   ┌──────────────┐      │   ┌──────────────┐        ┌─────────────────┐   │
   │  Host browser │◄────┼──►│  Socket.io   │◄──────►│  Room registry  │   │
   │  (authority)  │      │   │   server     │        │  (in-memory Map)│   │
   └──────┬───────┘      │   └──────────────┘        └─────────────────┘   │
          │ snapshots     │          ▲                                      │
          │ 20 Hz         │          │ relay                                │
   ┌──────▼───────┐      │          │                ┌─────────────────┐   │
   │ Peer browser  │◄────┼──────────┘                │  Next.js request│   │
   │ (interpolates)│      │                           │  handler        │   │
   └──────┬───────┘      │                           └────────┬────────┘   │
          │ HTTP          │                                    │            │
          │ fetch         └────────────────────────────────────┼────────────┘
          ▼                                                    ▼
   /api/scenarios  ─────────────────────────────────────►  MongoDB (Mongoose)
```

Two transport channels run over the **same HTTP server**:

1. **Socket.io** — low-latency, bidirectional, real-time room + physics events.
2. **Next.js HTTP** — the React app plus REST API routes under `/api/scenarios` for persistence.

## 2. The custom server (`server.ts`)

Virtual Labs does **not** use the stock `next start`. Instead `server.ts`:

1. Creates a Next.js app (`next({ dev, hostname, port })`) and grabs its request handler.
2. Creates a raw Node `http` server that delegates all requests to Next.js.
3. Attaches a Socket.io server to that same HTTP server (CORS `*`, transports `websocket` + `polling`).
4. Maintains an **in-memory `rooms` map**: `roomId → { hostId, users }`.

Because room state lives in process memory and WebSockets need a persistent connection, the app **requires a long-lived Node process** and cannot run on stateless serverless platforms (Vercel). See [INSTALLATION.md](./INSTALLATION.md) for deployment.

### Room lifecycle (server-side)

| Event | Server behavior |
|-------|-----------------|
| `room:join` | Creates the room if new; adds the user; **first user becomes host** (`hostId`). Emits `room:users` to everyone and `room:joined` to the joiner. |
| `room:leave` / `disconnect` | Removes the user. If the room is now empty, deletes it. If the **host** left, promotes the next user (`room.users.keys().next()`) and emits `room:promoted` to them. Broadcasts an updated `room:users`. |
| `physics:snapshot` | **Only relayed if the sender is the current host.** Rebroadcast to the rest of the room. |
| `physics:action` | Relayed to the rest of the room from any user (spawn/delete/constraint/reset). |

The server is a **dumb relay + registry**. It never runs physics, never validates payloads, and never persists anything. All simulation lives in the browser.

## 3. The peer-host authority model

Running physics on a central server is expensive and hard to keep deterministic. Running it independently on every client causes divergence (floating-point drift makes each engine wander). Virtual Labs resolves this with a **peer-host** model:

- The **first user to join a room is the Host.** Their browser runs the authoritative `matter-js` engine loop.
- The host emits **state snapshots** (positions, angles, velocities of every dynamic body + all constraints) at **20 Hz** (every 50 ms).
- **Peers do not resolve physics.** Their engine exists but they overwrite body transforms from each incoming snapshot — effectively interpolating toward the host's truth. This keeps everyone visually in sync and cheap.
- **Structural actions** (spawn, delete, add constraint, reset) are broadcast separately as `physics:action` events so that both host and peers apply the same structural change immediately, rather than waiting for it to appear in a snapshot.
- If the host disconnects, the server **promotes another peer** to host. That client starts emitting snapshots and running authoritative physics.

### Why two channels (snapshots vs. actions)?

- **Snapshots** are high-frequency, lossy-tolerant *state* (where things are right now). Missing one is fine — the next arrives in 50 ms.
- **Actions** are low-frequency, must-not-miss *structural changes* (a body was created/deleted). These are broadcast the moment they happen so structure stays consistent even between snapshots.
- Snapshots **also** carry the full constraint list so peers can *reconcile* any constraint they missed (belt-and-suspenders — see [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md), "constraint reconciliation").

## 4. Client architecture (React)

```
app/page.tsx  (Home — the single client page, "use client")
│
├── state: activeTool, roomId, isHost, paused, worldData,
│          inspectedBodyData, panel toggles
├── canvasRef: PhysicsCanvasHandle  (imperative bridge to the engine)
│
├── <Toolbar>          tool selection + panel toggles
├── <PhysicsCanvas>    ← owns matter-js engine, render, runner, sockets
├── <WorkspaceHeader>  branding
├── <RoomManager>      join/leave UI + socket room events
├── <ObjectPanel>      live editable body/constraint properties
├── <AnalyticsPanel>   Recharts sparklines for the inspected body
├── <SimControls>      play/pause, reset, save, library
└── <LibraryModal>     browse + load saved scenarios
```

- **`page.tsx`** is the orchestrator. It holds top-level UI state and a `ref` to the canvas. It exposes callback delegators (e.g. `handleSetBodyMass`) that forward panel edits into the imperative canvas handle.
- **`PhysicsCanvas`** is the engine host. It creates the `matter-js` Engine/Render/Runner, wires all mouse/keyboard input, runs the multiplayer sync effect, and exposes a rich imperative API (`PhysicsCanvasHandle`) via `useImperativeHandle` so the rest of the UI can mutate the world without prop-drilling into the engine.

### The imperative bridge (`PhysicsCanvasHandle`)

Rather than represent every body in React state (which would be far too chatty at 60 fps), the canvas keeps `matter-js` as the source of truth and exposes methods:

```ts
togglePause, resetWorld, isPaused,
getSnapshot, loadSnapshot,
setBodyMass, setBodyAngle, setBodyVelocity, applyBodyForce,
setBodyFriction, setBodyRestitution, setBodyFrictionAir,
setConstraintLength, setConstraintStiffness, setConstraintDamping
```

Two low-frequency streams flow **out** of the canvas back into React state:
- `onWorldUpdate(worldData)` every **100 ms** — the list of bodies/constraints for the Object Inspector.
- `onInspectedBodyUpdate(data)` at ~**20 fps** — live metrics for the inspected body (drives Analytics).

This "engine owns truth, throttled snapshots to React" pattern keeps the UI reactive without re-rendering per physics tick.

## 5. The physics loop (inside PhysicsCanvas)

The engine is created with tuned settings for **energy conservation** (so a frictionless pendulum doesn't slowly die):

```ts
Matter.Engine.create({
  gravity: { x: 0, y: 1, scale: 0.001 },
  positionIterations: 10,     // more iterations → less constraint energy leak
  velocityIterations: 8,
  constraintIterations: 4,
  enableSleeping: false,      // sleeping zeroes velocity; fatal for pendulums
});
```

The runner uses a **fixed timestep**:

```ts
Matter.Runner.create({ isFixed: true, delta: 1000 / 60 });
```

`isFixed: true` forces a constant delta every tick. Without it, Matter's Verlet integrator scales velocity by `delta / deltaLast` each frame; browser frame timing is never perfectly uniform, so that ratio drifts from 1.0 and silently bleeds energy even with zero friction and zero damping.

### Per-tick event pipeline

| Matter event | What Virtual Labs does |
|--------------|------------------------|
| `beforeUpdate` (engine) | **Captures net force per body** (`body.force + mass·gravity`) into `capturedForcesRef` *before* Matter resets `body.force` to 0 at tick end. Also performs **screen-wrapping** (a body that exits the right edge re-enters on the left). |
| `afterUpdate` (engine) | Computes live metrics for the inspected body (velocity, KE, force). Throttled to ~20 fps but **tracks peak force across the throttle window** so impulse spikes are never dropped. |
| `afterRender` (render) | Draws **velocity (cyan) and force (orange) arrows** when the Inspect tool is active or the global vector overlay is on, plus a pulsing highlight ring around the inspected body. |

A separate `setInterval(100ms)` publishes the world's body/constraint list to `onWorldUpdate` for the Object Inspector.

### Pause implementation

Pause sets `engine.timing.timeScale = 0` (and back to `1` to resume) rather than stopping the runner. This freezes integration reliably while keeping rendering and input alive. Triggered by the Space bar or the Sim Controls play/pause button, which also dispatch a `physics-pause-toggle` `CustomEvent` on `window` so the UI stays in sync.

## 6. Data flow walkthroughs

### A) Spawning a shape (multiplayer)

```
User clicks canvas with Circle tool
      │
      ▼
PhysicsCanvas.handleMouseUp
  • Matter.Bodies.circle(...) added to local world
  • if in a room: socket.emit("physics:action", {roomId, action:{type:"spawn", payload:{shapeType,x,y,colors,bodyId}}})
      │
      ▼  server relays to rest of room
Peer receives "physics:action" (spawn)
  • spawnBodyFromAction() re-creates the same body, labeled `synced_<bodyId>`
```

### B) Host streaming state

```
Host sync interval (every 50 ms, if not paused)
  • builds BodySnapshot[] (rounded to 2 decimals) + ConstraintSnapshot[]
  • socket.emit("physics:snapshot", {roomId, snapshot})
      │
      ▼  server relays ONLY because sender is host
Peer.handleSnapshot
  • for each remote body → find local by id OR `synced_<id>` → setPosition/Angle/Velocity/AngularVelocity
  • reconcile any missing constraints from snapshot.constraints
```

### C) Saving & loading a scenario

```
Save:  page.handleSaveScenario
  • canvasRef.getSnapshot()  → PhysicsSnapshot (bodies+constraints+timestamp)
  • POST /api/scenarios {name, description, snapshot}
  • API route → connectDB() → Scenario.create(...) → MongoDB

Load:  LibraryModal → page.handleLoadScenario(id)
  • GET /api/scenarios/:id → {snapshot}
  • canvasRef.loadSnapshot(snapshot)
      • clears world, re-adds ground
      • recreates each body with safeN() guards against NaN/Infinity
      • recreates each constraint, mapping bodyAId/bodyBId → new bodies
```

## 7. Persistence layer

- **`src/lib/db.ts`** — a cached Mongoose connection. It memoizes the connection promise on `global.mongoose` so Next.js hot-reloads and repeated API calls reuse a single connection instead of opening a new one each time (`bufferCommands: false`).
- **`src/models/Scenario.ts`** — the sole Mongoose model. `snapshot` is stored as `Schema.Types.Mixed` (arbitrary JSON), because the physics payload shape may evolve. See [MODELS_DOCUMENTATION.md](./MODELS_DOCUMENTATION.md).
- **API routes** (`src/app/api/scenarios/...`) — thin CRUD handlers. The list endpoint excludes the heavy `snapshot` field for a fast gallery; the detail endpoint returns the full document.

## 8. Design system

Styling is a hand-rolled **glassmorphism** system, defined once in `src/app/globals.css` as CSS custom properties (`--bg-glass`, `--accent-cyan`, `--gradient-brand`, `--shadow-panel`, …) plus utility classes (`.vl-glass-strong`, `.vl-slider`, `.vl-pulse`, `.vl-dot-grid`, `.vl-canvas-aura`). Components consume these variables through inline styles and Tailwind classes. The palette is a dark, neon cyan→purple→pink theme. Fonts (`Inter`, `JetBrains Mono`) load from Google Fonts in `layout.tsx`.

## 9. Key architectural decisions & tradeoffs

| Decision | Rationale | Tradeoff |
|----------|-----------|----------|
| Peer-host physics | No server compute cost; deterministic single authority | Host's machine/network quality affects everyone; host handoff causes a brief hiccup |
| Engine owns truth, throttled to React | 60 fps physics without 60 fps React re-renders | UI values lag the true state by up to 100 ms |
| Custom server (not serverless) | Persistent WebSockets + in-memory rooms | Can't deploy to Vercel; needs a stateful host |
| `Mixed` snapshot in DB | Schema flexibility as the physics format evolves | No DB-level validation of snapshot contents |
| In-memory room registry | Simple, fast | Rooms vanish on server restart; no horizontal scaling without a shared store |
| Fixed timestep + high iterations | Energy conservation for lossless pendulums | Slightly more CPU per tick |

See [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) for the specific bugs each of these decisions fixed.
