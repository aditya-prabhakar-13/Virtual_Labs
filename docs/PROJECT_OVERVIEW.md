# Project Overview

## What is Virtual Labs?

**Virtual Labs** is a collaborative, high-fidelity 2D "digital twin" physics sandbox. It bridges the gap between theoretical equations and physical reality, letting university-level students **build, test, and observe dynamic systems together in real time**.

Multiple users join a shared room and experiment with rigid-body physics, mechanical constraints, and live analytics — all synchronized across every connected client with low latency.

Think of it as a multiplayer whiteboard where the "ink" obeys Newtonian mechanics.

## Vision

> To provide a collaborative, high-fidelity 2D physics sandbox that bridges the gap between theoretical equations and physical reality, enabling university-level students to build, test, and observe dynamic systems together in real time.

## Goals

1. **Interactive physics canvas** — manipulate bodies, materials, and complex constraints (ropes, springs, pivots).
2. **Real-time collaboration** — synchronized physics states across multiple users in a room.
3. **Live analytical feedback** — velocity, kinetic energy, and force vectors for active learning.
4. **Experiment library** — save, share, and load pre-configured scenarios.

## Target Users

| User | Use case |
|------|----------|
| **Students** | University-level engineering/physics students running experiments and visualizing theoretical concepts (pendulums, collisions, linkages). |
| **Instructors** | Teachers setting up "lab templates" and demonstrating principles live to a class. |

## Key Features

### 🎨 Interactive physics engine
Powered by [`matter-js`](https://brm.io/matter-js/). Spawn **circles**, **rectangles**, **triangles**, and static **walls**. Grab and drag any body in real time.

### 🔗 Mechanical constraints
Wire bodies together with realistic connections:

- 🧵 **Rope** — a stiff point-to-point link (stiffness ≈ 0.8).
- 📏 **Spring** — an elastic link with damping (stiffness ≈ 0.15, damping ≈ 0.05).
- 📌 **Pivot / Pin** — pin a body to a fixed point in space (stiffness = 1, length = 0).

### 👥 Multiplayer sync
Room-based architecture on **Socket.io**. The first user in a room becomes the **Host** (physics authority) and broadcasts state snapshots at **20 Hz** to all peers. If the host leaves, another user is automatically promoted.

### 📊 Real-time analytics & visualization
- **Inspect mode / vector overlay** — real-time **velocity** (cyan) and **net force** (orange) arrows drawn over each body.
- **Analytics dashboard** (Recharts) — live sparklines for **Velocity**, **Kinetic Energy**, and **Net Force** of the inspected body.
- **Object Inspector** — a live table of every body/constraint with editable properties (mass, friction, restitution, air drag, velocity, angle, apply-impulse; constraint length/stiffness/damping).

### 💾 Experiment library
Save any setup — all dynamic bodies and constraints — as a named template to **MongoDB**, then reload it later from the gallery. Serialization guards against `NaN`/`Infinity` corruption on load.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router) |
| **UI / Runtime** | React 19 |
| **Styling** | Tailwind CSS v4 + a custom glassmorphism design system (CSS variables) |
| **Physics** | [Matter.js](https://brm.io/matter-js/) 0.20 |
| **Real-time** | [Socket.io](https://socket.io/) 4.x on a custom Node.js HTTP server |
| **Database** | [MongoDB](https://www.mongodb.com/) via [Mongoose](https://mongoosejs.com/) 9 |
| **Charts** | [Recharts](https://recharts.org/) 3 |
| **Language** | TypeScript 6 |
| **Dev runner** | [`tsx`](https://github.com/privatenumber/tsx) (runs `server.ts` directly) |

## How it fits together (30-second version)

```
Browser (React + matter-js)  ⇄  Socket.io  ⇄  Custom Node server (server.ts)
        │                                              │
        │  fetch /api/scenarios                        │  in-memory room registry
        ▼                                              ▼
   Next.js API routes  ───────────────────────►  MongoDB (Scenario docs)
```

- The **custom server** (`server.ts`) wraps Next.js and attaches Socket.io. It relays room and physics events; it does **not** run any physics itself.
- The **host browser** runs the authoritative `matter-js` engine and emits snapshots.
- **Peer browsers** run a passive engine that just interpolates to the host's snapshots.
- **API routes** persist and fetch scenarios from MongoDB.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full picture.

## Non-Goals (out of scope for V1)

- 3D physics simulations.
- Mobile / touchscreen optimization (desktop/laptop web only).
- User authentication, billing, or multi-tenant organizations.
- Server-side authoritative physics (V1 uses a peer-host model to keep server costs low).

## Project status

All five roadmap phases are complete (v1.0):

1. ✅ Foundation & single-player physics
2. ✅ Multiplayer & sync layer
3. ✅ Analytics & visualization
4. ✅ Persistence & experiment library
5. ✅ Polish & deployment

## Success criteria

- Multiple users can share a room and interact with the same objects without severe desync.
- Users can build complex mechanisms (pendulums, linkages) with the constraint tools.
- Analytics charts accurately reflect Matter.js data without tanking framerate.
- Scenarios serialize to the DB and load back faithfully.
