# Virtual Labs — Documentation

Welcome to the technical documentation for **Virtual Labs**, a real-time, multiplayer 2D physics sandbox for university-level learning.

This folder contains everything needed to understand, run, extend, and deploy the project.

## 📚 Documentation Index

| Document | What it covers |
|----------|----------------|
| [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) | High-level vision, features, users, and tech stack. Start here. |
| [QUICK_START.md](./QUICK_START.md) | Get the app running in under 5 minutes. |
| [INSTALLATION.md](./INSTALLATION.md) | Full setup: prerequisites, environment variables, MongoDB, troubleshooting. |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design, the peer-host authority model, data flow, and the physics loop. |
| [APP_STRUCTURE.md](./APP_STRUCTURE.md) | Directory layout and a file-by-file breakdown of the codebase. |
| [API_REFERENCE.md](./API_REFERENCE.md) | REST endpoints and the full Socket.io event contract. |
| [DATA_FORMATS.md](./DATA_FORMATS.md) | Every wire/storage payload shape: snapshots, actions, scenarios. |
| [MODELS_DOCUMENTATION.md](./MODELS_DOCUMENTATION.md) | MongoDB `Scenario` model, Matter.js bodies/constraints, and physics parameters. |
| [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) | The tricky engineering problems solved and how (energy conservation, force capture, sync, etc.). |

## ⚡ TL;DR

Virtual Labs lets multiple people join a shared room and play with rigid-body physics together — spawning shapes, wiring them up with ropes/springs/pivots, dragging them around, and watching live velocity/force/energy analytics. One client (the **host**) runs the authoritative `matter-js` engine and streams state to peers over WebSockets. Setups can be saved to and loaded from MongoDB.

```bash
npm install
echo 'MONGODB_URI=<your-mongo-uri>' > .env.local
npm run dev
# → http://localhost:3000
```

## 🧭 Reading order for new contributors

1. **PROJECT_OVERVIEW** — what and why
2. **QUICK_START** — see it running
3. **ARCHITECTURE** — how the pieces fit
4. **APP_STRUCTURE** — where the code lives
5. **API_REFERENCE** + **DATA_FORMATS** — the contracts
6. **IMPLEMENTATION_SUMMARY** — the hard parts

---
*Generated documentation. Reflects the codebase as of the current `main` branch.*
