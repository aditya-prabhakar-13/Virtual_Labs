# Virtual Labs - Multiplayer Physics Sandbox

A real-time multiplayer physics sandbox built with **Next.js 16**, **React**, **Matter.js**, and **Socket.io**.
Users can create dynamic bodies, attach mechanical constraints (ropes, springs), visualize forces/velocities in real-time with Recharts, and save/load scenarios from MongoDB.

## Features
- **Interactive Canvas**: Spawn circles, rectangles, walls, and apply forces.
- **Constraints**: Ropes, Springs, Pivots, and Motors.
- **Multiplayer Sync**: Room-based architecture. The room host runs the physics engine and broadcasts deltas (20Hz) to all peers via WebSockets.
- **Analytics Dashboard**: Real-time tracking of Kinetic Energy, Velocity, and Net Force using Recharts.
- **Experiment Library**: Save templates (complete serialization of bodies and constraints) to MongoDB and load them later.

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Setup `.env.local`:
   ```bash
   MONGODB_URI=mongodb+srv://<your-cluster-url>
   ```

3. Run the development server (with Socket.io support):
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000)

## Deployment Instructions

⚠️ **IMPORTANT**: Because this application relies on WebSockets via a custom `server.ts` file, **it cannot be deployed to standard Vercel serverless hosting.** Vercel Serverless functions do not support long-lived connections like Socket.io.

### Recommended Providers: Render or Railway
To deploy this project:
1. Ensure the `MONGODB_URI` environment variable is set in your deployment environment.
2. Build the Next.js app:
   ```bash
   npm run build
   ```
3. Start the production server using the custom `server.ts`:
   ```bash
   npm start
   ```
*(The `package.json` already has `"start": "NODE_ENV=production tsx server.ts"` configured).*

Deploy via Docker or Native Node.js environments on platforms like Render or Railway that provide persistent containers.
