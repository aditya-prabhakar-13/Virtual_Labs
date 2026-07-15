# Data Formats

Every payload that crosses a wire (WebSocket or HTTP) or lands in the database. All shapes are defined as TypeScript interfaces in `src/lib/socket.ts` (physics + room types) and `src/app/page.tsx` (UI-facing types).

---

## 1. Room types

Source: `src/lib/socket.ts`.

### `RoomUser`
```ts
interface RoomUser {
  id: string;        // Socket.io socket id
  username: string;  // display name entered on join
}
```

### `RoomJoinedPayload` — server → the joining client (`room:joined`)
```ts
interface RoomJoinedPayload {
  roomId: string;
  isHost: boolean;   // are you the room host?
  hostId: string;    // socket id of the host
  users: RoomUser[];
}
```

### `RoomUsersPayload` — server → whole room (`room:users`)
```ts
interface RoomUsersPayload {
  users: RoomUser[];
  hostId: string;
  userCount: number;
}
```

---

## 2. Physics sync types

Source: `src/lib/socket.ts`. These are the authoritative wire formats for multiplayer and for scenario persistence.

### `BodySnapshot`
One rigid body's serialized state.
```ts
interface BodySnapshot {
  id: number;             // matter-js body id (spawner's local id)
  label: string;          // e.g. "synced_42" or "Body 42"
  posX: number;
  posY: number;
  angle: number;          // radians
  velX: number;
  velY: number;
  angularVel: number;
  isStatic: boolean;
  shapeType: string;      // "circle" | "rectangle" | "triangle" | "polygon"
  circleRadius?: number;  // present for circles
  width?: number;         // reserved (not currently populated)
  height?: number;        // reserved
  sides?: number;         // reserved (polygon side count)
  fillStyle: string;      // hex color
  strokeStyle: string;    // hex color

  // Material properties (persisted on save; omitted from 20Hz host snapshots)
  mass?: number;
  friction?: number;
  frictionStatic?: number;
  frictionAir?: number;
  restitution?: number;
}
```

> **Two flavors of `BodySnapshot`:**
> - **Live host snapshots** (20 Hz) send only the *motion* fields (position/angle/velocity), rounded to 2 decimals to shrink the payload, and set `shapeType` to `"circle"`/`"rectangle"` only. Material props are omitted (peers don't need them every tick).
> - **Saved snapshots** (`getSnapshot()`) include the full set — material props and triangle detection — so a scenario reloads faithfully.

### `ConstraintSnapshot`
One constraint (rope/spring/pivot).
```ts
interface ConstraintSnapshot {
  id: number;
  bodyAId: number | null;   // id of body A (always set in practice)
  bodyBId: number | null;   // id of body B, or null for pivots (pinned to a point)
  pointBX?: number;         // world anchor X (pivots / point-anchored constraints)
  pointBY?: number;
  stiffness: number;        // 0.001–1
  damping: number;          // ≥ 0
  length: number;           // rest length in px
  strokeStyle: string;
  lineWidth: number;
  constraintType?: string;  // "rope" | "spring" | "pivot"
}
```

### `PhysicsSnapshot`
A complete world state. Emitted by the host, and stored as the `snapshot` of a saved scenario.
```ts
interface PhysicsSnapshot {
  bodies: BodySnapshot[];
  constraints: ConstraintSnapshot[];
  timestamp: number;        // Date.now() when captured
}
```

**Example (saved scenario snapshot):**
```json
{
  "bodies": [
    {
      "id": 12, "label": "Body 12", "posX": 400, "posY": 150,
      "angle": 0, "velX": 0, "velY": 0, "angularVel": 0,
      "isStatic": false, "shapeType": "circle", "circleRadius": 25,
      "fillStyle": "#3b82f6", "strokeStyle": "#60a5fa",
      "mass": 1.96, "friction": 0.3, "frictionStatic": 0.5,
      "frictionAir": 0.01, "restitution": 0.5
    }
  ],
  "constraints": [
    {
      "id": 3, "bodyAId": 12, "bodyBId": null,
      "pointBX": 400, "pointBY": 100,
      "stiffness": 1, "damping": 0, "length": 0,
      "strokeStyle": "rgba(168, 85, 247, 0.9)", "lineWidth": 2,
      "constraintType": "pivot"
    }
  ],
  "timestamp": 1721126400000
}
```

### `PhysicsAction`
A structural change broadcast over `physics:action`.
```ts
interface PhysicsAction {
  type: "spawn" | "delete" | "constraint" | "reset";
  payload: any;   // shape depends on type — see below
}
```

**Payload shapes by `type`:**

`spawn`
```ts
{ shapeType: "circle"|"rectangle"|"triangle"|"wall",
  x: number, y: number,
  fillStyle: string, strokeStyle: string,
  bodyId: number }
```

`delete`
```ts
{ bodyId: number }
```

`constraint` — rope / spring
```ts
{ constraintType: "rope"|"spring",
  bodyAId: number, bodyBId: number,
  stiffness: number, damping: number,
  length: number }
```

`constraint` — pivot
```ts
{ constraintType: "pivot",
  bodyAId: number,
  pointBX: number, pointBY: number }
```

`reset`
```ts
{}
```

---

## 3. UI-facing types

Source: `src/app/page.tsx`. These live in React state and feed the panels; they are derived from the engine, not sent over the wire.

### `ToolType`
```ts
type ToolType =
  | "circle" | "rectangle" | "triangle" | "wall"   // spawn shapes
  | "rope" | "spring" | "pivot"                     // constraints
  | "delete" | "grab" | "inspect";                  // interaction modes
```

### `InspectedBodyData`
Live metrics for the inspected body (drives the tooltip + Analytics). Emitted ~20 fps.
```ts
interface InspectedBodyData {
  id: number;
  label: string;
  mass: number;
  posX: number; posY: number;
  velX: number; velY: number;
  velMag: number;          // sqrt(velX² + velY²)
  angle: number;           // radians
  kineticEnergy: number;   // 0.5 · m · velMag²
  forceX: number; forceY: number;
  forceMag: number;        // peak net force magnitude this window
  timestamp: number;
}
```

### `BodyListItem`
A body row for the Object Inspector. Refreshed every 100 ms.
```ts
interface BodyListItem {
  id: number;
  label: string;
  mass: number;
  friction: number;
  frictionStatic: number;
  frictionAir: number;
  restitution: number;
  posX: number; posY: number;
  velX: number; velY: number;
  angle: number;
  isStatic: boolean;
}
```

### `ConstraintListItem`
A constraint row for the Object Inspector.
```ts
interface ConstraintListItem {
  id: number;
  label: string;
  length: number;
  stiffness: number;
  damping: number;
  bodyAId?: number;
  bodyBId?: number;
  constraintType: string;   // "rope" | "spring" | "pivot"
}
```

### `WorldData`
The full snapshot pushed to `onWorldUpdate` (100 ms cadence).
```ts
interface WorldData {
  bodies: BodyListItem[];
  constraints: ConstraintListItem[];
}
```

---

## 4. Persistence format (MongoDB)

Source: `src/models/Scenario.ts`. A saved scenario document:
```ts
{
  _id: ObjectId,
  name: string,           // required
  description?: string,   // optional
  snapshot: PhysicsSnapshot,  // stored as Schema.Types.Mixed (arbitrary JSON)
  createdAt: Date,        // defaults to now
  __v: number             // Mongoose version key
}
```

The `GET /api/scenarios` list endpoint returns every field **except `snapshot`**. The `GET /api/scenarios/:id` detail endpoint returns the full document. See [MODELS_DOCUMENTATION.md](./MODELS_DOCUMENTATION.md).

---

## 5. Custom DOM events

Not a wire format, but part of the client contract: the physics engine and the Sim Controls stay in sync via a `window` `CustomEvent`.

| Event name | `detail` | Dispatched by | Consumed by |
|------------|----------|---------------|-------------|
| `physics-pause-toggle` | `{ paused: boolean }` | `PhysicsCanvas` (Space bar / R key) | `SimControls` |

---

## 6. Value ranges & clamping

Setters in `PhysicsCanvas` sanitize inputs so bad values can't corrupt the simulation:

| Property | Clamp | Why |
|----------|-------|-----|
| `mass` | ≥ 0.01 | `setMass(0)` → `inverseMass = Infinity` → `NaN` position. |
| `restitution` | [0, 1] | Physical bounciness range. |
| `frictionAir` | [0, 1] | `0` also zeroes surface friction for lossless pendulums. |
| `friction`, `frictionStatic` | ≥ 0 | No negative friction. |
| `constraint.stiffness` | [0.001, 1] | Avoid degenerate constraints. |
| `constraint.length`, `constraint.damping` | ≥ 0 | Non-negative. |

On `loadSnapshot`, every numeric field passes through `safeN(value, fallback)` which rejects `NaN`/`Infinity` and substitutes a safe default (e.g. position → `(400, 300)`, mass fallback handled specially).
