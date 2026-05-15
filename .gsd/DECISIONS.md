# DECISIONS.md

## Log

| Date | Context | Decision | Consequences |
|------|---------|----------|--------------|
| 2026-05-15 | High-frequency physics synchronization requirements | Use a peer-host model for physics authority where one client dictates truth, rather than running headless Matter.js on the server. | Reduces server CPU load and simplifies Next.js backend, but makes the system susceptible to host-client tampering (acceptable for V1 educational use). |
| 2026-05-15 | WebSocket requirements for Next.js | Backend must be deployed on a persistent Node server (e.g. Render/Railway) instead of Vercel Serverless. | Vercel's edge functions / serverless model drop long-lived WS connections. Deployment strategy must be adapted accordingly. |
