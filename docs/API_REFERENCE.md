# API Reference

Virtual Labs exposes two interfaces:

1. **REST API** (Next.js route handlers) — scenario persistence.
2. **Socket.io events** — real-time rooms and physics sync.

For the exact shape of every payload, see [DATA_FORMATS.md](./DATA_FORMATS.md).

---

## Part 1 — REST API

Base path: `/api`. All responses are JSON. Handlers live in `src/app/api/scenarios/`.

### `GET /api/scenarios`

List all saved scenarios, newest first. **Excludes the heavy `snapshot` field** for a fast gallery view.

**Request:** no parameters, no body.

**Response `200`:**
```json
[
  {
    "_id": "665f1a2b3c4d5e6f7a8b9c0d",
    "name": "Double Pendulum",
    "description": "Chaotic motion demo",
    "createdAt": "2026-07-16T10:32:00.000Z",
    "__v": 0
  }
]
```

**Response `500`:**
```json
{ "error": "Failed to fetch scenarios" }
```
(DB unreachable or misconfigured `MONGODB_URI`.)

**Example:**
```bash
curl http://localhost:3000/api/scenarios
```

---

### `POST /api/scenarios`

Create (save) a new scenario.

**Request body:**
```json
{
  "name": "Double Pendulum",
  "description": "Chaotic motion demo",   // optional
  "snapshot": { "bodies": [ ... ], "constraints": [ ... ], "timestamp": 1721126400000 }
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | ✅ | Rejected with `400` if missing. |
| `description` | string | — | Free text. |
| `snapshot` | object | ✅ | A full `PhysicsSnapshot` (from `canvasRef.getSnapshot()`). Rejected with `400` if missing. |

**Response `201`:** the created Mongoose document (includes `snapshot`, `_id`, `createdAt`, `__v`).

**Response `400`:**
```json
{ "error": "Name and snapshot are required" }
```

**Response `500`:**
```json
{ "error": "Failed to create scenario" }
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/scenarios \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","snapshot":{"bodies":[],"constraints":[],"timestamp":0}}'
```

---

### `GET /api/scenarios/:id`

Fetch one scenario **including** its full `snapshot` (used by Load).

**Path parameter:** `id` — the MongoDB ObjectId string.

**Response `200`:** the full scenario document with `snapshot`.

**Response `404`:**
```json
{ "error": "Scenario not found" }
```

**Response `500`:**
```json
{ "error": "Failed to fetch scenario" }
```
(A malformed id also lands here, since `findById` throws a CastError.)

**Example:**
```bash
curl http://localhost:3000/api/scenarios/665f1a2b3c4d5e6f7a8b9c0d
```

> There is **no** `PUT`/`PATCH`/`DELETE` endpoint in V1. Scenarios are create-and-read only.

---

## Part 2 — Socket.io events

Real-time transport over the same HTTP server. Client helper: `src/lib/socket.ts` (`getSocket`, `connectSocket`, `disconnectSocket`). Server handlers: `server.ts`.

Connection options (client): `transports: ["websocket", "polling"]`, `autoConnect: false` (call `connectSocket()` explicitly).

### Event flow at a glance

```
CLIENT ──► SERVER            SERVER ──► CLIENT(S)
─────────────────           ─────────────────────
room:join         ─────►    room:joined   (to joiner)
                            room:users    (to whole room)
room:leave        ─────►    room:users    (to whole room)
physics:snapshot  ─────►    physics:snapshot (to peers, host-only)
physics:action    ─────►    physics:action   (to peers)
(disconnect)      ─────►    room:users / room:promoted
                            room:promoted (to new host on host handoff)
```

---

### Client → Server events

#### `room:join`
Join (or create) a room.
```ts
socket.emit("room:join", { roomId: string, username: string });
```
- Creates the room if it doesn't exist.
- First joiner becomes **host**.
- Server responds with `room:joined` (to you) and `room:users` (to everyone).

#### `room:leave`
Leave the current room.
```ts
socket.emit("room:leave");
```
Triggers the same cleanup as a disconnect (host promotion if needed, room deletion if empty).

#### `physics:snapshot`
Host broadcasts authoritative physics state (~20 Hz / every 50 ms).
```ts
socket.emit("physics:snapshot", { roomId: string, snapshot: PhysicsSnapshot });
```
> The server **only relays this if the sender is the room's current host.** Non-host emissions are silently ignored.

#### `physics:action`
Broadcast a structural change (any user, host or peer).
```ts
socket.emit("physics:action", { roomId: string, action: PhysicsAction });
```
`action.type` ∈ `"spawn" | "delete" | "constraint" | "reset"`. Relayed to the rest of the room.

---

### Server → Client events

#### `room:joined` (to the joining socket only)
```ts
{
  roomId: string,
  isHost: boolean,     // true if you are the room host
  hostId: string,      // socket id of the current host
  users: RoomUser[]    // [{ id, username }]
}
```

#### `room:users` (to the whole room)
Sent whenever room membership changes.
```ts
{
  users: RoomUser[],   // [{ id, username }]
  hostId: string,      // current host socket id
  userCount: number
}
```
The client re-derives its own host status by comparing `hostId` to its socket id.

#### `room:promoted` (to the new host only)
Sent when the previous host leaves and this client is promoted.
```ts
{ roomId: string }
```
The client sets `isHost = true` and begins emitting snapshots.

#### `physics:snapshot` (to peers)
The relayed host snapshot. Payload is the bare `PhysicsSnapshot` (not wrapped in `{roomId, snapshot}`):
```ts
{ bodies: BodySnapshot[], constraints: ConstraintSnapshot[], timestamp: number }
```
Peers apply body transforms and reconcile any missing constraints.

#### `physics:action` (to peers)
The relayed structural action. Payload is the bare `PhysicsAction`:
```ts
{ type: "spawn" | "delete" | "constraint" | "reset", payload: any }
```

---

### `PhysicsAction` payloads by type

| `type` | `payload` shape | Effect on receiver |
|--------|-----------------|--------------------|
| `spawn` | `{ shapeType, x, y, fillStyle, strokeStyle, bodyId }` | Recreates the body, labeled `synced_<bodyId>`. |
| `delete` | `{ bodyId }` | Removes the matching body and its constraints. |
| `constraint` (rope/spring) | `{ constraintType, bodyAId, bodyBId, stiffness, damping, length }` | Recreates the link between the two synced bodies using the broadcast rest `length`. |
| `constraint` (pivot) | `{ constraintType: "pivot", bodyAId, pointBX, pointBY }` | Pins the body to the given world point. |
| `reset` | `{}` | Clears the world and re-adds the ground. |

> **Body identity across clients:** the spawner's local `body.id` is sent as `bodyId`. Receivers create the body with label `synced_<bodyId>` and match on `id === bodyId || label === "synced_" + bodyId`, so both sides agree on which body a later action/snapshot refers to.

---

## Part 3 — The imperative canvas API (client-internal)

Not a network API, but the contract the UI uses to drive the engine. Exposed by `PhysicsCanvas` via `useImperativeHandle` as `PhysicsCanvasHandle` (see `src/app/page.tsx`).

| Method | Signature | Purpose |
|--------|-----------|---------|
| `togglePause` | `() => void` | Freeze/resume via `timeScale`. |
| `resetWorld` | `() => void` | Clear world, re-add ground, broadcast `reset`. |
| `isPaused` | `() => boolean` | Current pause state. |
| `getSnapshot` | `() => PhysicsSnapshot` | Serialize the world for saving. |
| `loadSnapshot` | `(snapshot) => void` | Rebuild the world from a snapshot (with NaN guards). |
| `setBodyMass` | `(id, mass) => void` | Clamped to ≥ 0.01. |
| `setBodyAngle` | `(id, angle) => void` | Radians. |
| `setBodyVelocity` | `(id, vx, vy) => void` | — |
| `applyBodyForce` | `(id, fx, fy) => void` | One-shot impulse at center. |
| `setBodyFriction` | `(id, friction, frictionStatic) => void` | Clamped ≥ 0. |
| `setBodyRestitution` | `(id, restitution) => void` | Clamped to [0, 1]. |
| `setBodyFrictionAir` | `(id, frictionAir) => void` | Clamped [0,1]; `0` also zeroes surface friction (lossless mode). |
| `setConstraintLength` | `(id, length) => void` | Clamped ≥ 0. |
| `setConstraintStiffness` | `(id, stiffness) => void` | Clamped [0.001, 1]. |
| `setConstraintDamping` | `(id, damping) => void` | Clamped ≥ 0. |
