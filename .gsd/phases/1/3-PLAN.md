---
phase: 1
plan: 3
wave: 2
---

# Plan 1.3: Constraints System (Ropes, Springs, Pivots)

## Objective
Implement the constraint toolset so users can create mechanical connections between bodies. This delivers REQ-02 (UI toolset for constraints: ropes, springs, pivots, motors). Users select a constraint tool, click body A, then click body B to create the connection.

## Context
- .gsd/SPEC.md
- .gsd/ROADMAP.md (Phase 1)
- src/components/PhysicsCanvas.tsx (with mouse interaction from Plan 1.2)
- src/components/Toolbar.tsx (with shape tools from Plan 1.2)

## Tasks

<task type="auto">
  <name>Add constraint tools to Toolbar and implement two-click constraint creation</name>
  <files>
    src/components/Toolbar.tsx
    src/components/PhysicsCanvas.tsx
  </files>
  <action>
    1. Add new tool buttons to the Toolbar, visually separated from shape tools (use a divider line):
       - **Rope** (rigid distance constraint — `Matter.Constraint` with stiffness ~0.8, rendered as a line)
       - **Spring** (elastic constraint — `Matter.Constraint` with stiffness ~0.2, rendered with damping visual)
       - **Pivot/Pin** (pin a body to a fixed world point — single-click only, pins the clicked body at its center)
    2. Implement two-click workflow in PhysicsCanvas for Rope and Spring:
       - First click: detect which body is under the cursor using `Matter.Query.point(world.bodies, mousePosition)`. Store as bodyA. Show a visual indicator (highlight the body or show a dot).
       - Second click: detect bodyB. Create the constraint between bodyA and bodyB. Clear selection state.
       - If user clicks empty space as first click, cancel.
       - If same body clicked twice, cancel.
    3. For Pivot: single-click on a body pins it to the world at the click point using `Matter.Constraint.create({ bodyA: clickedBody, pointB: { x, y } })`.
    4. Render constraints visually — Matter.Render handles this automatically for constraints added to the world. Ensure `render.options.showConvexHulls` is off but constraints are visible.
    5. Add a **Delete** tool: click a body to remove it and all its constraints from the world.
  </action>
  <verify>
    Run `npm run dev`:
    - Spawn 2 circles. Select "Rope" tool. Click circle A, then circle B — a rigid line connects them, they swing together.
    - Select "Spring" tool. Connect two boxes — they bounce elastically.
    - Select "Pivot" tool. Click a body — it pins in place and swings like a pendulum.
    - Select "Delete" tool. Click a body — it disappears.
    Run `npm run build` — zero errors.
  </verify>
  <done>
    - Rope, Spring, Pivot, and Delete tools are functional.
    - Two-click workflow for Rope/Spring is intuitive with visual feedback.
    - Constraints render visibly on the canvas.
    - Bodies with constraints behave physically correctly (pendulums swing, springs bounce).
    - Build passes.
  </done>
</task>

<task type="auto">
  <name>Add simulation controls (Play/Pause/Reset)</name>
  <files>
    src/components/SimControls.tsx
    src/components/PhysicsCanvas.tsx
    src/app/page.tsx
  </files>
  <action>
    1. Create `src/components/SimControls.tsx` ("use client"):
       - A bottom-center floating bar with Play/Pause and Reset buttons.
       - Styled with glassmorphism (bg-gray-900/80 backdrop-blur rounded-xl).
       - Play/Pause toggles `Matter.Runner` on/off.
       - Reset clears all bodies and constraints from the world (except the ground), effectively resetting the scene.
    2. Expose runner control from PhysicsCanvas via ref or callback:
       - `togglePause()`: calls `Matter.Runner.stop(runner)` or `Matter.Runner.start(runner, engine)`.
       - `resetWorld()`: calls `Matter.Composite.clear(engine.world, false)` then re-adds the ground body.
    3. Add the SimControls bar to page.tsx, positioned at the bottom center overlaying the canvas.
    4. Add keyboard shortcuts: Space = toggle pause, R = reset (only when not typing in an input).
  </action>
  <verify>
    Run `npm run dev`:
    - Spawn several shapes. Press Space — physics freezes. Press Space again — resumes.
    - Click Reset — all bodies vanish, ground remains.
    - Pause button icon changes between play/pause states.
    Run `npm run build` — zero errors.
  </verify>
  <done>
    - Play/Pause toggles the physics simulation.
    - Reset clears the scene.
    - Keyboard shortcuts (Space, R) work.
    - Controls have polished UI with glassmorphism.
    - Build passes.
  </done>
</task>

## Success Criteria
- [ ] Rope, Spring, and Pivot constraints can be created between/on bodies.
- [ ] Two-click workflow has clear visual feedback (highlight selected body).
- [ ] Delete tool removes bodies and their constraints.
- [ ] Play/Pause/Reset controls work with both buttons and keyboard shortcuts.
- [ ] `npm run build` passes.
