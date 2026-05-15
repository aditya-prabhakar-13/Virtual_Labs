---
phase: 1
plan: 1
wave: 1
---

# Plan 1.1: Next.js Project Scaffold & Matter.js Canvas

## Objective
Bootstrap the Next.js project with Tailwind CSS, integrate Matter.js, and render a basic physics canvas where gravity works and shapes fall. This is the absolute foundation — everything else builds on top of a working render loop.

## Context
- .gsd/SPEC.md
- .gsd/ROADMAP.md (Phase 1 description)

## Tasks

<task type="auto">
  <name>Scaffold Next.js project with Tailwind CSS</name>
  <files>
    package.json
    tailwind.config.js (or tailwind.config.ts)
    src/app/layout.tsx
    src/app/page.tsx
    src/app/globals.css
  </files>
  <action>
    1. Run `npx -y create-next-app@latest ./ --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"` to scaffold in the current directory.
    2. Install Matter.js: `npm install matter-js` and types `npm install -D @types/matter-js`.
    3. Verify the dev server starts with `npm run dev`.
    4. Clean the default Next.js boilerplate from `page.tsx` — replace with a simple "VIRTUAL-LAB" heading centered on screen with a dark background (bg-gray-950, text-white).
    5. Set up the global CSS with a dark theme base (body background: #0a0a0f).
  </action>
  <verify>
    Run `npm run build` — build must succeed with zero errors.
    Run `npm run dev` and confirm the page loads at localhost:3000.
  </verify>
  <done>
    - Next.js app runs on localhost:3000 with Tailwind working.
    - matter-js is listed in package.json dependencies.
    - Page displays "VIRTUAL-LAB" on a dark background.
  </done>
</task>

<task type="auto">
  <name>Create PhysicsCanvas component with Matter.js render loop</name>
  <files>
    src/components/PhysicsCanvas.tsx
    src/app/page.tsx
  </files>
  <action>
    1. Create `src/components/PhysicsCanvas.tsx`:
       - Use `useRef` for the canvas container div and the Matter.js engine/render/runner instances.
       - In a `useEffect`, create a Matter.Engine, Matter.Render (attached to the container div), and Matter.Runner.
       - Set canvas to fill its parent container (width: 100%, height: 100%).
       - Add static ground (a rectangle at the bottom, isStatic: true) and 3 falling demo boxes to prove gravity works.
       - Start the Runner and Render.
       - Return a cleanup function that stops the Runner, stops the Render, and calls `Matter.World.clear` / `Matter.Engine.clear`.
       - Use `"use client"` directive at the top since this uses browser APIs.
    2. Update `src/app/page.tsx` to render `<PhysicsCanvas />` inside a full-viewport container div.
    3. Do NOT use Matter.Render's built-in canvas styling — use wireframe mode initially (wireframes: true) for clarity.
  </action>
  <verify>
    Run `npm run dev`, open localhost:3000 in browser.
    Visually confirm: 3 boxes fall under gravity and land on the ground rectangle.
    Run `npm run build` — zero errors.
  </verify>
  <done>
    - PhysicsCanvas component renders a Matter.js simulation.
    - Boxes visibly fall and collide with the ground.
    - No memory leaks (cleanup runs on unmount).
    - Build succeeds.
  </done>
</task>

## Success Criteria
- [ ] `npm run build` passes with zero errors.
- [ ] Dev server shows a full-screen dark canvas with Matter.js physics running (boxes falling to a ground plane).
- [ ] matter-js is properly installed and typed.
