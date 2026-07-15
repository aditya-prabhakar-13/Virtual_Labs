# Application Structure

A directory-level map and a file-by-file breakdown of the codebase.

## Directory tree

```
Virtual_Labs/
├── server.ts                 # Custom Node server: Next.js + Socket.io + room registry
├── next.config.ts            # Next.js config (empty/default)
├── package.json              # Scripts & dependencies
├── tsconfig.json             # TypeScript config (path alias @/* → src/*)
├── postcss.config.mjs        # Tailwind v4 via @tailwindcss/postcss
├── .env.local                # MONGODB_URI (git-ignored)
├── README.md                 # Top-level project readme
├── PROJECT_RULES.md          # GSD methodology rules (process, not app code)
├── GSD-STYLE.md              # Style conventions
│
├── docs/                     # ← This documentation
│
└── src/
    ├── app/                              # Next.js App Router
    │   ├── layout.tsx                    # Root layout, <head>, Google Fonts, metadata
    │   ├── page.tsx                      # Home — the single client page & orchestrator
    │   ├── globals.css                   # Design system: CSS vars + glass utilities
    │   └── api/
    │       └── scenarios/
    │           ├── route.ts              # GET (list) + POST (create) scenarios
    │           └── [id]/route.ts         # GET one scenario by id
    │
    ├── components/                       # React UI (all "use client")
    │   ├── PhysicsCanvas.tsx             # ★ The engine host (matter-js + sockets)
    │   ├── Toolbar.tsx                   # Left vertical tool rail
    │   ├── RoomManager.tsx               # Multiplayer join/leave UI + socket room events
    │   ├── ObjectPanel.tsx               # Object Inspector: live editable properties
    │   ├── AnalyticsPanel.tsx            # Recharts sparklines for inspected body
    │   ├── SimControls.tsx               # Play/pause, reset, save, library bar
    │   ├── LibraryModal.tsx              # Saved-scenario gallery
    │   └── WorkspaceHeader.tsx           # Branding block
    │
    ├── lib/
    │   ├── db.ts                         # Cached Mongoose connection
    │   └── socket.ts                     # Socket.io client singleton + shared TS types
    │
    └── models/
        └── Scenario.ts                   # Mongoose Scenario model
```

`★` = the most important, most complex file (~1230 lines).

## The `src/app` layer (routing + pages)

### `layout.tsx`
Root layout. Sets page `metadata` (title/description), imports `globals.css`, and loads `Inter` + `JetBrains Mono` from Google Fonts. Renders `{children}` in a full-viewport body.

### `page.tsx` — `Home`
The single client-rendered page and top-level orchestrator (~285 lines). Responsibilities:

- Declares the shared **TypeScript types** re-used across the UI: `ToolType`, `PhysicsCanvasHandle`, `InspectedBodyData`, `BodyListItem`, `ConstraintListItem`, `WorldData`.
- Holds all top-level UI state: `activeTool`, `roomId`, `isHost`, `paused`, `worldData`, `inspectedBodyData`, and the four panel-visibility toggles.
- Holds `canvasRef: RefObject<PhysicsCanvasHandle>` — the imperative handle into the engine.
- Wires **room callbacks** (`handleRoomJoined/Left/HostPromoted`).
- Implements **save/load** (`handleSaveScenario` → `POST /api/scenarios`, `handleLoadScenario` → `GET /api/scenarios/:id` → `canvasRef.loadSnapshot`).
- Provides `useCallback` **delegators** that forward ObjectPanel edits into the canvas handle.
- Lays out every component over the canvas.

### `globals.css`
The design system. Defines CSS custom properties (colors, gradients, shadows) under `:root`, a CSS reset, and utility classes: `.vl-glass` / `.vl-glass-strong` (glassmorphism surfaces), `.vl-slider` (gradient range input), `.vl-dot-grid` / `.vl-canvas-aura` (canvas overlays), `.vl-pulse` (connection-dot animation), plus scrollbar/selection/number-input styling.

### `api/scenarios/route.ts`
- `GET` — returns all scenarios, **excluding** the heavy `snapshot` field, newest first (`.select("-snapshot").sort({createdAt:-1}).lean()`).
- `POST` — validates `name` + `snapshot`, then `Scenario.create()`. Returns `201` with the created doc.

### `api/scenarios/[id]/route.ts`
- `GET` — returns one full scenario (including `snapshot`) by `id`, or `404`.

See [API_REFERENCE.md](./API_REFERENCE.md) for full request/response contracts.

## The `src/components` layer (UI)

### `PhysicsCanvas.tsx` ★
The heart of the app. A `forwardRef` component that:
- Creates and owns the `matter-js` **Engine**, **Render**, **Runner**, and **MouseConstraint**.
- Adds the ground boundary and enables **screen-wrapping** (left/right walls replaced by wrap-around).
- Handles **all pointer input** by tool: spawn shapes, delete bodies (+ their constraints), create rope/spring/pivot constraints, grab/drag, and inspect-click selection.
- Handles **keyboard shortcuts** (Space = pause via `timeScale`, R = reset).
- Runs the per-tick event pipeline: `beforeUpdate` (force capture + screen-wrap), `afterUpdate` (inspected-body metrics with peak-force tracking), `afterRender` (velocity/force arrows + highlight ring).
- Exposes the imperative `PhysicsCanvasHandle` (pause/reset/snapshot/load + body & constraint setters).
- Runs the **multiplayer sync effect**: as host, emits `physics:snapshot` at 20 Hz; as peer, applies incoming snapshots and reconciles constraints; both handle `physics:action` (spawn/delete/constraint/reset).
- Renders small in-canvas overlays: the "click a second body" hint and the inspect tooltip.

Helper functions: `distToConstraint` (click-to-select constraint hit-testing), `randomColor`, `hexToRGBA`, `drawArrow`, `isStaticBoundary`.

### `Toolbar.tsx`
The 64px left rail. Renders the brand logo, `ToolButton`s for each `ToolType` (shape / constraint / grab / inspect / delete, grouped by dividers), and `ToggleButton`s for the three panels (Object Inspector, Vector overlay, Analytics) plus an Exit button (reloads the page). Each button carries an accent color, an inline SVG icon, and a hover tooltip.

### `RoomManager.tsx`
Top-center multiplayer widget. Two states:
- **Offline** — a compact pill that expands into a join form (name + Room ID + 🎲 random generator + Join).
- **Joined** — shows the room id (click-to-copy), a HOST badge if applicable, stacked user avatars (stable gradient per username), and a Leave button.

Manages the socket room event lifecycle (`room:join`, `room:joined`, `room:users`, `room:promoted`, `room:leave`) and lifts room/host state up via props.

### `ObjectPanel.tsx`
The **Object Inspector** (left-docked). Two tabs — **bodies** and **constraints** — with a dropdown selector. For a selected body: `GradientSlider`s for Mass/Friction/Restitution, `NumberField`s for Angle/Air-drag/Velocity X&Y, and an **Apply Impulse** (Fx/Fy) control. For a constraint: Length/Stiffness/Damping sliders (hidden for pivots). Auto-selects the first dynamic body; clears selection when the target disappears. All edits are committed through the delegator callbacks into the canvas handle. Reusable inputs: `GradientSlider`, `NumberField`, `SectionTitle`.

### `AnalyticsPanel.tsx`
Right-docked **Analytics** dashboard. Accumulates up to **100** `InspectedBodyData` samples into a rolling `history` (resets when the inspected body changes or clears) and renders three Recharts `Sparkline` area charts: **Velocity** (cyan), **Kinetic Energy** (purple), **Net Force** (orange). Shows an empty state prompting the user to pick the Inspect tool. Reusable: `Sparkline`, `MetricBlock`.

### `SimControls.tsx`
Bottom-center control pill: play/pause (color-coded green/orange, primary button), reset, save, library, and a live Running/Paused status dot. Listens for the `physics-pause-toggle` `CustomEvent` so keyboard-driven pauses stay reflected in the UI. Reusable: `GhostButton`.

### `LibraryModal.tsx`
Full-screen modal gallery. On open, fetches `GET /api/scenarios` and renders each saved scenario as a card (name, description, created date, **Load** button). Handles loading and empty states.

### `WorkspaceHeader.tsx`
Static top-left branding: gradient "Virtual Labs" title + "Physics Workspace" subtitle. Pointer-events disabled so it never blocks the canvas.

## The `src/lib` layer (infrastructure)

### `db.ts`
Exports `connectDB()` — a **cached** Mongoose connection memoized on `global.mongoose` to survive hot reloads and reuse a single pool across API calls. Warns (doesn't throw) if `MONGODB_URI` is unset.

### `socket.ts`
The client-side Socket.io singleton and the **shared type contracts**:
- `getSocket()` / `connectSocket()` / `disconnectSocket()` — manage one lazy socket instance (`autoConnect: false`).
- Types: `RoomUser`, `RoomJoinedPayload`, `RoomUsersPayload`, `BodySnapshot`, `ConstraintSnapshot`, `PhysicsSnapshot`, `PhysicsAction`. These are the canonical wire formats — see [DATA_FORMATS.md](./DATA_FORMATS.md).

## The `src/models` layer (data)

### `Scenario.ts`
The single Mongoose model. Fields: `name` (required), `description` (optional), `snapshot` (`Mixed`, required), `createdAt` (defaults to now). Uses the `models.Scenario || model(...)` guard to avoid re-compiling the model on hot reload. See [MODELS_DOCUMENTATION.md](./MODELS_DOCUMENTATION.md).

## Configuration & tooling files

| File | Purpose |
|------|---------|
| `server.ts` | Custom combined Next.js + Socket.io server; owns the room registry. |
| `package.json` | Scripts (`dev`, `dev:next`, `build`, `start`, `lint`) and deps. Build/runtime tooling lives in `dependencies` for Render compatibility. |
| `tsconfig.json` | Strict TS; path alias `@/* → ./src/*`; `jsx: react-jsx`; bundler resolution. |
| `next.config.ts` | Empty default config. |
| `postcss.config.mjs` | Registers `@tailwindcss/postcss` (Tailwind v4). |

## Process/meta files (not application code)

`PROJECT_RULES.md`, `GSD-STYLE.md`, and the `.gsd/`, `.agent/`, `.gemini/`, `.claude/` folders belong to the **GSD ("Get Shit Done") methodology** used to build the project (spec → plan → execute → verify → commit). They document process, not runtime behavior, and are git-ignored where appropriate.
