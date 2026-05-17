# Virtual Labs - Multiplayer Physics Sandbox

Virtual Labs is an interactive, real-time multiplayer physics sandbox. Built with a modern React stack, it allows multiple users to join a shared room and experiment with rigid body physics, constraints, and dynamic analytics. 

Whether you're building a tower of blocks, simulating a swinging pendulum, or creating complex mechanical linkages with motors, Virtual Labs synchronizes the state across all connected clients with low latency.

![Virtual Labs Preview](/preview.png) *(Preview image placeholder)*

## ✨ Key Features

- **Interactive Physics Engine**: Powered by `matter-js`. Spawn circles, rectangles, and static walls. Manipulate bodies in real-time by clicking and dragging.
- **Multiplayer Sync**: Room-based architecture utilizing `Socket.io`. The first user in a room becomes the "Host" (the physics authority) and broadcasts state updates at 20Hz to all peers.
- **Mechanical Constraints**: Connect bodies together using realistic physics constraints:
  - 🧵 **Ropes**: Flexible point-to-point connections.
  - 📏 **Springs**: Elastic connections with stiffness and damping.
  - 📌 **Pivots**: Pin a body to a specific point in space or to another body.
  - ⚙️ **Motors**: Drive bodies with rotational force.
- **Real-Time Analytics & Visualization**: 
  - Toggle "Inspect Mode" to see real-time **Velocity** (Cyan) and **Force** (Orange) vectors overlaid on the canvas.
  - Open the **Analytics Dashboard** (built with Recharts) to view live line charts for Velocity, Kinetic Energy, and Net Force of any selected body.
- **Experiment Library**: Save your intricate setups as templates directly to a MongoDB database and load them later via the Experiment Library gallery.

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **UI & Styling**: React, Tailwind CSS v4, Glassmorphism design system
- **Physics Engine**: [Matter.js](https://brm.io/matter-js/)
- **Real-time Comms**: [Socket.io](https://socket.io/) (Custom Node.js server)
- **Database**: [MongoDB](https://www.mongodb.com/) via Mongoose
- **Data Visualization**: [Recharts](https://recharts.org/)

---

## 🚀 Getting Started

Follow these steps to get the project running on your local machine after cloning.

### 1. Prerequisites
- **Node.js**: v18.x or higher
- **npm** or **yarn**
- **MongoDB Database**: You need a running MongoDB instance. The easiest way is to create a free cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).

### 2. Clone and Install

```bash
# Clone the repository
git clone https://github.com/your-username/virtual-labs.git
cd virtual-labs

# Install all dependencies
npm install
```

### 3. Environment Variables

Create a `.env.local` file in the root of the project directory and add your MongoDB connection string:

```env
# .env.local
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/virtual-labs?retryWrites=true&w=majority
```

### 4. Start the Development Server

Since this project uses a custom `Socket.io` server attached to the Next.js process, it uses `server.ts` to boot up.

```bash
# Start the server
npm run dev
```

Your app will now be running on [http://localhost:3000](http://localhost:3000).

---

## 🏗️ Architecture Overview

- **Peer-Host Authority Model**: To ensure physics determinism without overloading a central server, the architecture relies on a **Peer-Host model**. The user who creates the room runs the `matter-js` engine loop locally. Their client acts as the source of truth, emitting high-frequency (`~20Hz`) snapshot deltas containing positional and rotational data to the server, which proxies it to all other peers in the room.
- **State Synchronization**: Peers do not run the physics engine resolver; they simply interpolate the visual state of bodies based on the Host's snapshots, resulting in a smooth, synchronized experience.
- **Persistence**: Saving a scenario captures all dynamic bodies and constraints. The backend handles serialization mapping, allowing full structural rebuilds when a scenario is loaded from the Library.

---

## 🌐 Deployment Instructions

⚠️ **CRITICAL DEPLOYMENT NOTE:** 
Because this application relies on a custom persistent `server.ts` file to handle WebSockets (`Socket.io`), **it cannot be deployed to standard Serverless hosting platforms like Vercel.** Vercel functions are stateless and will forcefully terminate your WebSocket connections.

### Recommended Providers: Render, Railway, or VPS

To deploy this project successfully, use a platform that supports persistent Node.js runtimes.

1. Ensure the `MONGODB_URI` environment variable is added to your hosting provider's secret manager.
2. Build the Next.js application:
   ```bash
   npm run build
   ```
3. Start the production server:
   ```bash
   npm start
   ```
*(Note: The `package.json` already contains the correct start script: `"start": "NODE_ENV=production tsx server.ts"`).*
