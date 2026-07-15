# Quick Start

Get Virtual Labs running locally in a few minutes. For a deeper walkthrough (troubleshooting, MongoDB Atlas setup, deployment), see [INSTALLATION.md](./INSTALLATION.md).

## Prerequisites

- **Node.js** v18 or higher
- **npm** (bundled with Node)
- A **MongoDB** connection string (local `mongod` or a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster)

## 1. Install

```bash
git clone <your-repo-url>
cd Virtual_Labs
npm install
```

## 2. Configure environment

Create `.env.local` in the project root:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/virtual-labs?retryWrites=true&w=majority
```

> The app **starts without a database** — you can spawn shapes and go multiplayer immediately. The DB is only needed for **saving/loading scenarios** (the Experiment Library). If `MONGODB_URI` is missing, you'll see a console warning but the sandbox still works.

## 3. Run the dev server

```bash
npm run dev
```

This runs `tsx server.ts`, which boots the **custom Node server** (Next.js + Socket.io together). Open:

```
http://localhost:3000
```

> ⚠️ Use `npm run dev`, **not** `next dev`. The plain Next.js dev server does not attach the Socket.io server, so multiplayer will not work. (`next dev` is available as `npm run dev:next` for UI-only work.)

## 4. Try it out (single player)

1. The canvas loads with a floor. The active tool is **Grab** (drag bodies around).
2. Pick a shape tool from the left toolbar (**Circle**, **Rectangle**, **Triangle**, **Wall**) and click on the canvas to spawn.
3. Switch to **Grab** and drag a body around.
4. Use **Rope**/**Spring**: click one body, then a second body, to link them.
5. Use **Pivot**: click a body to pin it in place (great for pendulums).
6. Toggle the **vector overlay** or **Inspect** tool to see velocity/force arrows.
7. Open the **Object Inspector** (grid icon) to edit mass, friction, restitution, etc.
8. Open **Analytics** (chart icon), switch to the **Inspect** tool, and click a body to see live charts.

### Keyboard shortcuts

| Key | Action |
|-----|--------|
| `Space` | Pause / resume the simulation |
| `R` | Reset the world (clears all bodies) |

Tool letters shown in tooltips (C, B, T, W, O, S, P, G, I, D) label the tools but are activated by clicking the toolbar buttons.

## 5. Try it out (multiplayer)

1. Click the **"Offline → Join Room"** pill at the top-center.
2. Enter a **name** and a **Room ID** (or click 🎲 to generate one).
3. Click **Join Room**. You are now the **Host** (orange badge).
4. Open a second browser tab/window, join the **same Room ID** with a different name.
5. Spawn and drag bodies in either window — they sync in real time. The host's simulation is authoritative.

## 6. Save & load a scenario

1. Build something interesting.
2. In the bottom **Sim Controls**, click the **Save** (disk) icon, give it a name/description.
3. Click the **Library** (book) icon to browse saved scenarios and **Load** one back.

> Saving/loading requires a working `MONGODB_URI`.

## Common commands

```bash
npm run dev        # custom server (Next.js + Socket.io) — USE THIS
npm run dev:next   # plain Next.js dev (no websockets, UI only)
npm run build      # production build
npm start          # production server (NODE_ENV=production tsx server.ts)
npm run lint       # ESLint
```

## Next steps

- Understand the design → [ARCHITECTURE.md](./ARCHITECTURE.md)
- Find your way around the code → [APP_STRUCTURE.md](./APP_STRUCTURE.md)
- Integrate with the API → [API_REFERENCE.md](./API_REFERENCE.md)
