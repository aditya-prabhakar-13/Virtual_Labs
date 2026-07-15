# Models Documentation

Virtual Labs has two kinds of "models":

1. **The database model** — the MongoDB/Mongoose `Scenario` schema (persistence).
2. **The physics models** — the `matter-js` bodies and constraints that make up the simulation, and the parameters that govern them.

---

## Part 1 — Database model: `Scenario`

Source: `src/models/Scenario.ts`. The **only** persisted collection.

### Schema

```ts
interface IScenario {
  name: string;
  description?: string;
  snapshot: any;      // Mixed — the full PhysicsSnapshot payload
  createdAt: Date;
}

const ScenarioSchema = new Schema<IScenario>({
  name:        { type: String, required: true },
  description: { type: String },
  snapshot:    { type: Schema.Types.Mixed, required: true },
  createdAt:   { type: Date, default: Date.now },
});

export const Scenario =
  models.Scenario || model<IScenario>("Scenario", ScenarioSchema);
```

### Fields

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `_id` | ObjectId | auto | auto | Mongo primary key; used in `GET /api/scenarios/:id`. |
| `name` | String | ✅ | — | Display title in the Library gallery. |
| `description` | String | — | — | Optional free text shown on the card. |
| `snapshot` | Mixed | ✅ | — | A complete `PhysicsSnapshot` (bodies + constraints + timestamp). Stored as arbitrary JSON. |
| `createdAt` | Date | — | `Date.now` | Sort key (newest first) and shown on the card. |
| `__v` | Number | auto | 0 | Mongoose version key. |

### Design notes

- **Why `Schema.Types.Mixed` for `snapshot`?** The physics payload format is expected to evolve (new shape types, new material props). `Mixed` avoids coupling the DB schema to the exact physics format and lets `getSnapshot()`/`loadSnapshot()` own the contract. The tradeoff: **no DB-level validation** of snapshot contents — the loader must defensively sanitize (it does, via `safeN`).
- **The `models.Scenario || model(...)` guard** prevents Mongoose from throwing `OverwriteModelError` when Next.js hot-reloads the module and tries to re-register the model.
- **No update/delete model methods** — V1 scenarios are create-and-read only. There is no `PUT`/`DELETE` route.

### Connection model (`src/lib/db.ts`)

`connectDB()` returns a **cached** Mongoose connection, memoized on `global.mongoose` (`{ conn, promise }`). This ensures a single connection pool is reused across API-route invocations and hot reloads instead of opening a fresh connection each time. Uses `bufferCommands: false` so queries fail fast if the connection is down rather than silently buffering. If `MONGODB_URI` is unset it warns (doesn't throw) — the sandbox still runs, only persistence is disabled.

### Example document

```json
{
  "_id": "665f1a2b3c4d5e6f7a8b9c0d",
  "name": "Simple Pendulum",
  "description": "Mass on a pivot, zero air drag",
  "snapshot": {
    "bodies": [ /* BodySnapshot[] */ ],
    "constraints": [ /* ConstraintSnapshot[] */ ],
    "timestamp": 1721126400000
  },
  "createdAt": "2026-07-16T10:32:00.000Z",
  "__v": 0
}
```

---

## Part 2 — Physics models (matter-js)

The simulation is built from `matter-js` primitives. Virtual Labs wraps them with conventions for identity, materials, and rendering.

### 2.1 Bodies

Created via `Matter.Bodies.*`. Four spawnable kinds:

| Tool | Factory | Dimensions | Default material |
|------|---------|-----------|------------------|
| **Circle** | `Bodies.circle(x, y, 25)` | radius 25 | `restitution 0.5, friction 0.3` |
| **Rectangle** | `Bodies.rectangle(x, y, 50, 50)` | 50×50 | `restitution 0.4, friction 0.4` |
| **Triangle** | `Bodies.polygon(x, y, 3, 30)` | 3 sides, radius 30 | `restitution 0.3, friction 0.5` |
| **Wall** | `Bodies.rectangle(x, y, 120, 20)` | 120×20, **static** | static; no restitution |
| **Ground** | `Bodies.rectangle(w/2, h-15, w+100, 30)` | full-width static floor | label `__ground__` |

**Body conventions:**
- **Identity:** each body has a numeric `id`. When a body is created from a remote action, it is labeled `synced_<originalId>` so all clients can match it (`b.id === id || b.label === "synced_" + id`).
- **The ground** is labeled `__ground__` (constant `GROUND_LABEL`) and excluded from snapshots, deletion, inspection, and analytics via `isStaticBoundary()`.
- **Rendering:** `body.render.fillStyle` / `strokeStyle` come from a fixed neon palette (`shapeColors`); walls use slate gray. `lineWidth` is 2.
- **Screen-wrapping:** in `beforeUpdate`, a body whose `x > width+30` teleports to `x = -28` (and vice-versa), so objects loop horizontally instead of hitting side walls.

### 2.2 Material properties

Editable per-body via the Object Inspector → the imperative handle. All are standard matter-js body fields:

| Property | Meaning | Range (clamped) | Default (dynamic) |
|----------|---------|-----------------|-------------------|
| `mass` | Inertial mass (kg) | ≥ 0.01 | area-derived (~1.96 for a circle) |
| `friction` | Kinetic surface friction | ≥ 0 | 0.3–0.5 |
| `frictionStatic` | Static friction threshold | ≥ 0 | 0.5 |
| `frictionAir` | Air drag per tick | [0, 1] | 0.01 |
| `restitution` | Bounciness (elasticity) | [0, 1] | 0.3–0.5 |
| `angle` | Orientation (radians) | any | 0 |
| `velocity` `{x,y}` | Linear velocity | any | 0 |
| `angularVelocity` | Spin | any | 0 |

> **Lossless mode:** setting `frictionAir = 0` via `setBodyFrictionAir` *also* zeroes `friction` and `frictionStatic`. This lets a pendulum or orbit run indefinitely without energy loss — useful for demonstrating conservation of energy.

> **Applying force:** `applyBodyForce(id, fx, fy)` calls `Matter.Body.applyForce` at the body's center — a one-shot impulse, not a persistent force. Force magnitudes are tiny (Matter units); the UI's "Apply Impulse" field steps in `0.001`.

### 2.3 Constraints

Created via `Matter.Constraint.create`. Three types, distinguished by a custom `_constraintType` tag stored on the constraint:

| Type | Stiffness | Damping | Length | Anchors | Visual |
|------|-----------|---------|--------|---------|--------|
| **Rope** | 0.8 | 0 | auto (rest = current distance) | body ↔ body | cyan line |
| **Spring** | 0.15 | 0.05 | auto | body ↔ body | orange line |
| **Pivot / Pin** | 1 | 0 | 0 | body ↔ world point | purple line |

**Constraint conventions:**
- `_constraintType` is a **non-standard** property Virtual Labs attaches to remember whether a constraint is a rope/spring/pivot (matter-js itself only knows stiffness/length). It's preserved through snapshots and reconstruction.
- A **pivot** has `bodyB = null` and a fixed `pointB` (world coordinate) — that's how a body gets pinned in space to swing around.
- Constraints editable via the inspector: `length`, `stiffness` ([0.001, 1]), `damping` (≥ 0). Pivots hide these (length 0, stiffness 1 are fixed).
- The **Mouse Constraint** (used for grab-dragging) is always filtered out of snapshots and world data by `c.label !== "Mouse Constraint"`.
- **Rest length on create** is auto-computed by matter-js from the initial body distance. When broadcast, this `length` is included so the remote client builds the constraint with the *same* rest length regardless of where its body copies happen to be.

### 2.4 Engine configuration

The engine and runner are tuned for **energy conservation** (see [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)):

```ts
Matter.Engine.create({
  gravity: { x: 0, y: 1, scale: 0.001 },
  positionIterations: 10,     // default 6 — higher = less constraint energy leak
  velocityIterations: 8,      // default 4
  constraintIterations: 4,    // default 2
  enableSleeping: false,      // sleeping would zero a pendulum's velocity
});

Matter.Runner.create({ isFixed: true, delta: 1000 / 60 });  // constant timestep
```

| Setting | Value | Purpose |
|---------|-------|---------|
| `gravity.scale` | 0.001 | Matter's gravity is `y · scale`; keeps fall speed reasonable. |
| `positionIterations` | 10 | More solver passes → tighter constraints, less energy drift. |
| `velocityIterations` | 8 | Better velocity resolution for collisions. |
| `constraintIterations` | 4 | Stiffer, more accurate constraint solving. |
| `enableSleeping` | false | Prevents "settled" bodies from having velocity zeroed. |
| `Runner.isFixed` | true | Constant delta prevents Verlet energy drift from frame-timing jitter. |

### 2.5 Derived analytics quantities

Computed on the fly (not stored on the body):

| Quantity | Formula | Where |
|----------|---------|-------|
| Velocity magnitude | `√(vx² + vy²)` | inspected-body tooltip, analytics |
| Kinetic energy | `½ · m · velMag²` | analytics |
| Net force | `body.force + m · g` (captured in `beforeUpdate`) | force arrows, analytics |
| Force magnitude | `√(fx² + fy²)`, tracked as **peak** over each ~50 ms window | analytics |

Net force must be captured in `beforeUpdate` because matter-js resets `body.force` to zero at the end of each tick — reading it afterward would always give zero. See [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md).
