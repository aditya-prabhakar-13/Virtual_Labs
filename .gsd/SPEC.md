# SPEC.md — Project Specification

> **Status**: `FINALIZED`

## Vision
To provide a collaborative, high-fidelity 2D "Digital Twin" physics sandbox that bridges the gap between theoretical equations and physical reality, enabling university-level students to build, test, and observe dynamic systems together in real-time.

## Goals
1. Deliver an interactive physics canvas allowing users to manipulate bodies, materials, and complex constraints (ropes, springs, motors).
2. Enable seamless real-time collaboration with synchronized physics states across multiple users.
3. Provide live analytical feedback (velocity, energy, force vectors) for active learning.
4. Support an experiment library for saving, sharing, and loading pre-configured scenarios.

## Non-Goals (Out of Scope for V1)
- 3D physics simulations.
- Mobile/touchscreen optimization (Desktop/Laptop web only for V1).
- Complex user authentication, billing, or multi-tenant organizations.
- Server-side authoritative physics simulation (V1 will rely on a peer-host model for physics authority to keep server costs low).

## Users
- **Students**: University-level engineering/physics students running experiments and visualizing theoretical concepts.
- **Instructors**: Teachers setting up "lab templates" and demonstrating principles live.

## Constraints
- **Technical**: Must handle high-frequency WebSocket updates (60 ticks/sec physics step) without crippling network lag. Next.js backend needs to be deployed on a platform supporting persistent WebSockets (not Vercel Serverless).
- **Performance**: Canvas must render smoothly with many constraints and bodies.

## Success Criteria
- [ ] Multiple users can connect to the same room and interact with the same physical objects without severe desync.
- [ ] Users can successfully build complex mechanisms (e.g., a motorized vehicle or pendulum) using the provided constraint tools.
- [ ] Real-time analytics charts accurately reflect the underlying Matter.js data without tanking UI framerate.
- [ ] Scenarios can be serialized, saved to a database, and loaded back perfectly.
