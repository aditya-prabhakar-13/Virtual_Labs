# Installation Guide

A complete, step-by-step setup for developers — including MongoDB provisioning, environment configuration, production builds, deployment, and troubleshooting.

## 1. Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | ≥ 18.x | Next.js 16 requires a modern Node. Node 20 LTS recommended. |
| npm | bundled | `yarn`/`pnpm` also work but scripts assume npm. |
| MongoDB | any 6.x+ | Local instance or a free MongoDB Atlas cluster. Optional for the sandbox; required for the Experiment Library. |
| A modern desktop browser | current | Chrome/Edge/Firefox. Uses `backdrop-filter`, Canvas, WebSockets, Clipboard API. Mobile is not a V1 target. |

## 2. Clone & install dependencies

```bash
git clone <your-repo-url>
cd Virtual_Labs
npm install
```

This installs both runtime and build dependencies. Note: in this project several packages that are normally `devDependencies` (TypeScript, `@types/*`, `tsx`, `postcss`, `tailwindcss`) are intentionally listed under **`dependencies`**. This is deliberate so that platforms like **Render** — which prune dev dependencies during a production install — can still run `next build` and `tsx server.ts`. See recent commit history (`fix(deps): ...`).

## 3. Provision MongoDB

### Option A — MongoDB Atlas (recommended, free)

1. Create an account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas).
2. Create a free **M0 cluster**.
3. Create a **database user** (username + password).
4. Under **Network Access**, allow your IP (or `0.0.0.0/0` for development).
5. Click **Connect → Drivers** and copy the connection string. It looks like:
   ```
   mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
   ```

### Option B — Local MongoDB

Install MongoDB Community Server and use:
```
mongodb://localhost:27017/virtual-labs
```

## 4. Environment variables

Create a `.env.local` file in the project root:

```env
# .env.local
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/virtual-labs?retryWrites=true&w=majority
```

| Variable | Required | Purpose |
|----------|----------|---------|
| `MONGODB_URI` | For persistence only | Mongoose connection string. If unset, the app logs a warning and the Experiment Library will fail, but the physics sandbox and multiplayer still work. |
| `PORT` | No | Server port. Defaults to `3000`. Read in `server.ts`. |
| `NODE_ENV` | Auto | Set to `production` by the `start` script; anything else runs Next.js in dev mode. |

> `.env*.local` is git-ignored. **Never commit real credentials.** (Note: the repo's tracked `.env.local` currently contains a demo Atlas URI — rotate/replace it for any real deployment.)

## 5. Run in development

```bash
npm run dev
```

- Runs `tsx server.ts` — the **custom server** that combines Next.js and Socket.io.
- Serves on `http://localhost:3000`.
- Console shows:
  ```
  ▲ Virtual-Lab Server ready
  - Local:    http://localhost:3000
  - Socket.io: attached
  ```

### Why not `next dev`?

Because WebSockets need a persistent custom server. `npm run dev:next` (plain `next dev`) is provided **only** for isolated UI work — multiplayer will be dead there.

## 6. Production build & run

```bash
npm run build     # next build
npm start         # NODE_ENV=production tsx server.ts
```

`server.ts` calls `next({ dev: false })` when `NODE_ENV === "production"`, serving the pre-built `.next` output through the same custom HTTP server that hosts Socket.io.

## 7. Deployment

> ⚠️ **This app CANNOT be deployed to Vercel or other stateless serverless platforms.** It relies on a persistent `server.ts` process holding open WebSocket connections and in-memory room state. Serverless functions are ephemeral and will drop those connections.

### Recommended: Render / Railway / a VPS

Any host that runs a **persistent Node process** works.

**Render example:**
1. New **Web Service** → connect the repo.
2. **Build command:** `npm install && npm run build`
3. **Start command:** `npm start`
4. Add `MONGODB_URI` under **Environment**.
5. Render sets `PORT` automatically; `server.ts` reads it.

Because build-time and runtime tooling are in `dependencies` (not `devDependencies`), Render's dependency pruning won't break the build.

### Deployment checklist

- [ ] `MONGODB_URI` set in the host's secret manager.
- [ ] Host supports persistent Node runtimes + WebSockets.
- [ ] Start command is `npm start` (not `next start`).
- [ ] Atlas network access allows the host's egress IP.

## 8. Troubleshooting

| Symptom | Cause / Fix |
|---------|-------------|
| Multiplayer never connects / no host badge | You started with `next dev`. Use `npm run dev` instead. |
| `MONGODB_URI is not defined` warning | `.env.local` missing or not loaded. Sandbox still works; add the URI to enable Save/Load. |
| Save/Load returns 500 | Bad/expired Mongo credentials or blocked network access (check Atlas IP allowlist). |
| Scenario loads but bodies are invisible/frozen | Snapshot had `NaN`/`Infinity` values; the loader clamps these (see [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)). Re-save from a clean state. |
| Render build fails on missing `typescript`/types | Ensure the type/build packages remain in `dependencies` (they are, by design). |
| Port already in use | Set `PORT=4000 npm run dev` (or free port 3000). |
| Websocket blocked behind a proxy | Socket.io falls back to `polling`; ensure the proxy allows upgrade/long-polling to `/socket.io/`. |

## 9. Verifying the install

```bash
# 1. Server boots
npm run dev
# → "▲ Virtual-Lab Server ready"

# 2. API responds (in another shell)
curl http://localhost:3000/api/scenarios
# → [] (empty array) or a JSON list; a 500 means DB isn't reachable
```

Then load `http://localhost:3000`, spawn a circle, and confirm it falls and bounces.
