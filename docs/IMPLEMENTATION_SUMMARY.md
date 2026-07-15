# Implementation Summary

This document captures the **hard engineering problems** in Virtual Labs and how they were solved. Most of them live in `src/components/PhysicsCanvas.tsx` and `server.ts`. The code comments reference these as numbered "Tasks"; they are collected and explained here.

---

## 1. Energy conservation (lossless pendulums)

**Problem:** A pendulum with zero friction and zero damping should swing forever. In a naive matter-js setup it slowly loses energy and dies — even though nothing should be removing energy.

**Root causes & fixes:**

1. **Variable timestep drift.** Matter's Verlet integrator scales velocity by `delta / deltaLast` each frame. Browser frame timing is never perfectly uniform, so that ratio wobbles around 1.0 and silently bleeds (or injects) energy.
   → **Fix:** a fixed-timestep runner: `Matter.Runner.create({ isFixed: true, delta: 1000/60 })`. Constant delta ⇒ correction factor is exactly 1 every tick.

2. **Constraint solver energy leak.** Too few solver iterations lets constraints "give," dissipating energy.
   → **Fix:** raised iterations — `positionIterations: 10`, `velocityIterations: 8`, `constraintIterations: 4`.

3. **Sleeping zeroes velocity.** With `enableSleeping: true`, a body that momentarily "settles" has its velocity zeroed — fatal for a pendulum at the top of its arc.
   → **Fix:** `enableSleeping: false`.

4. **Residual surface friction.** Even air-drag-free bodies lose energy to surface friction.
   → **Fix:** `setBodyFrictionAir(id, 0)` *also* zeroes `friction` and `frictionStatic`, giving a truly lossless "mode" from a single control.

**Result:** a pinned body with `frictionAir = 0` swings indefinitely, letting students observe true energy conservation.

---

## 2. Net-force capture (before matter-js zeroes it)

**Problem:** matter-js **resets `body.force` to `{0,0}` at the end of every tick.** Any code that reads `body.force` in an `afterUpdate` handler or a render loop always sees zero, so force arrows and the analytics "Net Force" chart would be blank.

**Fix:** capture force in the **`beforeUpdate`** event, *before* the integration step consumes and clears it:

```ts
Matter.Events.on(engine, "beforeUpdate", () => {
  const gx = engine.gravity.x * engine.gravity.scale;
  const gy = engine.gravity.y * engine.gravity.scale;
  for (const body of allBodies) {
    // Net force = user-applied force + gravity contribution this tick
    capturedForcesRef.current.set(body.id, {
      x: body.force.x + body.mass * gx,
      y: body.force.y + body.mass * gy,
    });
  }
});
```

`capturedForcesRef` (a `Map<bodyId, {x,y}>`) is then read by both the render loop (arrows) and the analytics emitter. Gravity is added explicitly because at `beforeUpdate` time gravity hasn't yet been folded into `body.force`.

---

## 3. Peak-force tracking under throttling

**Problem:** Live analytics update at ~20 fps (every 3rd tick) to avoid flooding React with 60 re-renders/sec. But a collision impulse might occur on a tick that gets skipped, so the force chart would miss the spike entirely.

**Fix:** in `afterUpdate`, run **every tick** but only *emit* every 3rd. Between emissions, track the **peak-magnitude** force seen:

```ts
if (Math.hypot(capturedF.x, capturedF.y) > Math.hypot(peakFx, peakFy)) {
  peakFx = capturedF.x; peakFy = capturedF.y;
}
inspectTick++;
if (inspectTick % 3 !== 0) return;   // only emit at ~20 fps
// ... emit peakFx/peakFy, then reset peak for next window
```

So the chart samples at 20 fps but never drops an impulse spike that happened in between.

---

## 4. The peer-host multiplayer model

**Problem:** Server-side physics is costly; independent per-client physics diverges (floating-point drift).

**Fix:** the **first joiner is the authoritative host**. Only the host runs meaningful physics; peers overwrite their body transforms from the host's snapshots. The server (`server.ts`) is a pure relay + in-memory room registry.

Key details:
- **Host-only snapshot relay:** the server checks `room.hostId === socket.id` before rebroadcasting `physics:snapshot`. A malicious/lagging peer can't inject state.
- **Host handoff:** on host disconnect, the next user (`room.users.keys().next().value`) is promoted and receives `room:promoted`; they start emitting snapshots.
- **Snapshot payload minimization:** live snapshots round every number to 2 decimals and omit material properties (peers don't need mass/friction every 50 ms).

See [ARCHITECTURE.md](./ARCHITECTURE.md) §3 for the full model.

---

## 5. Structural actions vs. state snapshots

**Problem:** If body creation/deletion were only conveyed through 20 Hz snapshots, there'd be up to 50 ms of inconsistency, and diffing snapshots to detect "a body appeared" is fragile.

**Fix:** two separate channels:
- **`physics:action`** — immediate, must-not-miss structural events (`spawn`, `delete`, `constraint`, `reset`), broadcast the instant they happen by *any* client.
- **`physics:snapshot`** — high-frequency, lossy-tolerant *state*, host-only.

Spawned bodies are labeled `synced_<originalId>` so every client can match the same body across later actions and snapshots.

---

## 6. Constraint reconciliation (belt & suspenders)

**Problem:** A `physics:action` constraint event could be dropped (packet loss, a peer joining mid-session), leaving a peer without a constraint the host has.

**Fix:** the host **also includes the full constraint list in every snapshot.** On receiving a snapshot, peers diff local constraint ids against the snapshot's and **add any they're missing**:

```ts
const localIds = new Set(allLocalConstraints.map(c => c.id));
for (const cs of snapshot.constraints) {
  if (localIds.has(cs.id)) continue;   // already have it
  // rebuild the constraint from cs, matching bodies by id or synced_<id>
}
```

The broadcast rest `length` is used so both sides agree regardless of where their body copies currently sit.

---

## 7. NaN / Infinity protection on load

**Problem:** A corrupt or hand-edited snapshot (e.g. `mass: 0`, `posX: NaN`) would poison the engine: `setMass(0)` → `inverseMass = Infinity` → the body's position becomes `NaN` after one tick → it vanishes and can destabilize neighbors.

**Fix:** `loadSnapshot` funnels every numeric field through a guard:

```ts
const safeN = (v, fallback) =>
  typeof v === "number" && isFinite(v) && !isNaN(v) ? v : fallback;
```

- Positions fall back to `(400, 300)`.
- Mass is clamped to `≥ 0.01` (and only applied if `> 0`).
- Velocity/angle/angularVelocity fall back to 0.

The same clamping philosophy applies to all runtime setters (see [DATA_FORMATS.md](./DATA_FORMATS.md) §6).

---

## 8. Tool-aware input handling

**Problem:** matter-js's `MouseConstraint` wants to grab bodies on any mousedown, which conflicts with tools that use clicks for other purposes (spawn, delete, link, inspect).

**Fixes:**
- **Grab mode is a fast-path:** `handleMouseDown/Up` bail immediately when the tool is `grab`, letting the native MouseConstraint do its thing.
- **Non-grab tools suppress dragging:** a `startdrag` listener nulls out `mouseConstraint.constraint.bodyB` unless the tool is `grab`, so you can click a body to link/inspect it without accidentally flinging it.
- **Click vs. drag discrimination:** a mouseup more than 8 px from the mousedown is treated as a drag and ignored by the tool actions, so a small hand-wobble doesn't spawn/delete unintentionally.
- **Constraint tools are two-click:** click body A (it highlights cyan + shows a hint banner), then click body B to create the link.
- **Inspect click** selects a body, or falls back to hit-testing constraint line segments via `distToConstraint` (point-to-segment distance) within 12 px.

---

## 9. Screen-wrapping instead of side walls

**Problem:** Side walls trap objects and make the small canvas feel cramped; students want continuous motion (e.g. orbits).

**Fix:** only a ground boundary exists. In `beforeUpdate`, a body exiting the right edge (`x > width + 30`) is teleported to the left (`x = -28`) and vice-versa, so the world wraps horizontally.

---

## 10. Reliable pause via `timeScale`

**Problem:** Stopping the runner to pause is clumsy (rendering/input also stall, and resuming can jump). 

**Fix:** pause sets `engine.timing.timeScale = 0` (resume → `1`). Integration freezes while rendering and input stay live. Both the Space key and the Sim Controls button drive this, and dispatch a `physics-pause-toggle` `CustomEvent` so the UI's pause indicator stays in sync no matter how pause was triggered.

---

## 11. Engine-owns-truth, throttled to React

**Problem:** Mirroring 60 fps physics into React state would cause thousands of re-renders per second and destroy performance.

**Fix:** matter-js is the single source of truth; React only receives **throttled projections**:
- `onWorldUpdate` — the body/constraint list every **100 ms** (Object Inspector).
- `onInspectedBodyUpdate` — inspected-body metrics at **~20 fps** (tooltip + Analytics).

Panels mutate the world back through the **imperative `PhysicsCanvasHandle`** (via `useImperativeHandle`), never by re-rendering the engine. Refs (`onWorldUpdateRef`, `showVectorsRef`, etc.) are used inside the long-lived effect so the latest callbacks/flags are read without re-subscribing engine events on every render.

---

## 12. Deployment constraint (not serverless)

**Problem:** Vercel and similar serverless platforms are stateless and terminate WebSocket connections.

**Fix / consequence:** the app ships a **custom persistent server** (`server.ts`) combining Next.js + Socket.io, and must be deployed to a host that keeps a Node process alive (Render/Railway/VPS). Additionally, build/runtime tooling (TypeScript, `@types/*`, `tsx`, `tailwindcss`, `postcss`) is deliberately placed in `dependencies` (not `devDependencies`) so hosts that prune dev deps during production installs can still build and run. See [INSTALLATION.md](./INSTALLATION.md).

---

## Quick reference: where each fix lives

| # | Concern | File(s) |
|---|---------|---------|
| 1 | Energy conservation | `PhysicsCanvas.tsx` (engine + runner config) |
| 2 | Force capture | `PhysicsCanvas.tsx` `beforeUpdate` |
| 3 | Peak-force throttling | `PhysicsCanvas.tsx` `afterUpdate` |
| 4 | Peer-host model | `server.ts`, `PhysicsCanvas.tsx` sync effect |
| 5 | Actions vs snapshots | `server.ts`, `PhysicsCanvas.tsx` |
| 6 | Constraint reconciliation | `PhysicsCanvas.tsx` `handleSnapshot` |
| 7 | NaN protection | `PhysicsCanvas.tsx` `loadSnapshot` (`safeN`) |
| 8 | Tool-aware input | `PhysicsCanvas.tsx` mouse/click handlers |
| 9 | Screen-wrapping | `PhysicsCanvas.tsx` `beforeUpdate` |
| 10 | Pause | `PhysicsCanvas.tsx` + `SimControls.tsx` |
| 11 | Throttled React bridge | `PhysicsCanvas.tsx`, `page.tsx` |
| 12 | Deployment | `server.ts`, `package.json` |
