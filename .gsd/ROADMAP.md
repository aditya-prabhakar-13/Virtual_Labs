# ROADMAP.md

> **Current Phase**: Phase 3
> **Milestone**: v1.0

## Must-Haves
- [ ] Interactive Canvas with basic shapes and Matter.js integration.
- [ ] Multi-user WebSocket syncing.
- [ ] Mechanical constraints (springs, joints, motors).
- [ ] Real-time charts and vector overlays.
- [ ] Scenario saving/loading to MongoDB.

## Phases

### Phase 1: Foundation & Single-Player Physics
**Status**: ✅ Complete
**Objective**: Setup the Next.js/React project, integrate Matter.js, and build a single-player sandbox where users can spawn shapes and basic constraints.
**Requirements**: REQ-01, REQ-02

### Phase 2: Multiplayer & Sync Layer
**Status**: ✅ Complete
**Objective**: Implement Socket.io rooms and the Agent Middleware to broadcast body transformations and synchronize physics states between clients.
**Requirements**: REQ-03, REQ-04

### Phase 3: Analytics & Visualization
**Status**: ⬜ Not Started
**Objective**: Overlay force/velocity vectors on the canvas and build the Recharts dashboard to show live metrics of selected bodies.
**Requirements**: REQ-05, REQ-06

### Phase 4: Persistence & Experiment Library
**Status**: ⬜ Not Started
**Objective**: Integrate MongoDB, build scenario serialization (saving Matter.js state to JSON), and create the gallery view for sharing templates.
**Requirements**: REQ-07, REQ-08

### Phase 5: Polish & Deployment
**Status**: ⬜ Not Started
**Objective**: Fix UX bugs, optimize WebSocket payloads, and deploy to a persistent hosting environment.
