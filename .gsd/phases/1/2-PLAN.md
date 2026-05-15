---
phase: 1
plan: 2
wave: 1
---

# Plan 1.2: Interactive Toolbar & Shape Spawning

## Objective
Build the drag-and-drop workspace UI. Users should be able to select a shape type from a toolbar, click on the canvas to spawn it, and drag existing bodies around with the mouse. This delivers REQ-01 (interactive workspace for drag/drop physical bodies).

## Context
- .gsd/SPEC.md
- .gsd/ROADMAP.md (Phase 1)
- src/components/PhysicsCanvas.tsx (created in Plan 1.1)

## Tasks

<task type="auto">
  <name>Add mouse interaction (drag bodies) to PhysicsCanvas</name>
  <files>
    src/components/PhysicsCanvas.tsx
  </files>
  <action>
    1. Add `Matter.Mouse` and `Matter.MouseConstraint` to the PhysicsCanvas useEffect:
       - Create a Mouse bound to the Render canvas.
       - Create a MouseConstraint with the mouse, add it to the world.
       - This enables click-and-drag on any non-static body.
    2. Ensure the mouse constraint is cleaned up on unmount.
    3. Remove the 3 demo boxes from Plan 1.1 — the canvas should start empty (ground only).
  </action>
  <verify>
    Spawn a body (next task), drag it with the mouse — it should follow the cursor and be released with momentum.
  </verify>
  <done>
    - MouseConstraint is active on the canvas.
    - Users can click and drag any dynamic body.
  </done>
</task>

<task type="auto">
  <name>Create Toolbar component with shape spawning</name>
  <files>
    src/components/Toolbar.tsx
    src/components/PhysicsCanvas.tsx
    src/app/page.tsx
  </files>
  <action>
    1. Create `src/components/Toolbar.tsx` ("use client"):
       - A vertical sidebar on the left side of the screen (w-16 or w-20, full height).
       - Dark glassmorphism style (bg-gray-900/80 backdrop-blur-md border-r border-gray-700/50).
       - Buttons for shape types: Circle, Rectangle, Triangle, and a static "Wall" toggle.
       - Each button shows an SVG icon of the shape.
       - Active/selected state should glow (ring-2 ring-cyan-400).
       - Use React state to track the currently selected tool.
    2. Create a shared state mechanism (React Context or callback props) so the Toolbar can tell PhysicsCanvas which tool is selected.
    3. In PhysicsCanvas, add a click handler on the canvas:
       - On click (not drag), spawn the selected shape at the click position.
       - Circle: `Matter.Bodies.circle(x, y, 25)`
       - Rectangle: `Matter.Bodies.rectangle(x, y, 50, 50)`
       - Triangle: `Matter.Bodies.polygon(x, y, 3, 30)`
       - Wall: `Matter.Bodies.rectangle(x, y, 100, 20, { isStatic: true })`
       - Differentiate click vs drag: only spawn if mouse hasn't moved significantly between mousedown and mouseup.
    4. Update page.tsx layout: Toolbar on the left, PhysicsCanvas fills the remaining space.
  </action>
  <verify>
    Run `npm run dev`:
    - Toolbar is visible on the left with 4 shape buttons.
    - Selecting "Circle" and clicking on canvas spawns a circle that falls.
    - Selecting "Rectangle" spawns a box.
    - Selecting "Wall" spawns a static platform.
    - Bodies can be dragged after spawning.
    Run `npm run build` — zero errors.
  </verify>
  <done>
    - Toolbar renders with 4 shape options and clear visual feedback for selection.
    - Clicking canvas spawns the selected shape at click position.
    - Spawned shapes obey physics (fall, collide).
    - Static walls don't move.
    - Build passes.
  </done>
</task>

## Success Criteria
- [ ] Users can select a shape from the toolbar and click to place it on the canvas.
- [ ] At least 4 shape types work: circle, rectangle, triangle, static wall.
- [ ] Existing bodies can be dragged with the mouse.
- [ ] `npm run build` passes.
