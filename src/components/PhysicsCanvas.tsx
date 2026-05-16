"use client";

import React, {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useState,
  useCallback,
} from "react";
import Matter from "matter-js";
import type { ToolType, PhysicsCanvasHandle } from "@/app/page";
import {
  getSocket,
  type PhysicsSnapshot,
  type BodySnapshot,
  type ConstraintSnapshot,
  type PhysicsAction,
} from "@/lib/socket";

interface PhysicsCanvasProps {
  activeTool: ToolType;
  roomId: string | null;
  isHost: boolean;
}

const GROUND_LABEL = "__ground__";
const WALL_LEFT_LABEL = "__wall_left__";
const WALL_RIGHT_LABEL = "__wall_right__";

function isStaticBoundary(body: Matter.Body) {
  return (
    body.label === GROUND_LABEL ||
    body.label === WALL_LEFT_LABEL ||
    body.label === WALL_RIGHT_LABEL
  );
}

// Shape colors palette (kept outside component for reuse)
const shapeColors = [
  { fill: "#3b82f6", stroke: "#60a5fa" },
  { fill: "#8b5cf6", stroke: "#a78bfa" },
  { fill: "#06b6d4", stroke: "#22d3ee" },
  { fill: "#f59e0b", stroke: "#fbbf24" },
  { fill: "#ef4444", stroke: "#f87171" },
  { fill: "#22c55e", stroke: "#4ade80" },
  { fill: "#ec4899", stroke: "#f472b6" },
];

function randomColor() {
  return shapeColors[Math.floor(Math.random() * shapeColors.length)];
}

const PhysicsCanvas = forwardRef<PhysicsCanvasHandle, PhysicsCanvasProps>(
  ({ activeTool, roomId, isHost }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const engineRef = useRef<Matter.Engine | null>(null);
    const renderRef = useRef<Matter.Render | null>(null);
    const runnerRef = useRef<Matter.Runner | null>(null);
    const mouseConstraintRef = useRef<Matter.MouseConstraint | null>(null);
    const pausedRef = useRef(false);
    const activeToolRef = useRef(activeTool);
    const constraintFirstBodyRef = useRef<Matter.Body | null>(null);
    const [firstBodySelected, setFirstBodySelected] = useState(false);
    const roomIdRef = useRef(roomId);
    const isHostRef = useRef(isHost);
    const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Keep refs in sync with props
    useEffect(() => {
      activeToolRef.current = activeTool;
      constraintFirstBodyRef.current = null;
      setFirstBodySelected(false);
    }, [activeTool]);

    useEffect(() => {
      roomIdRef.current = roomId;
    }, [roomId]);

    useEffect(() => {
      isHostRef.current = isHost;
    }, [isHost]);

    // Expose control methods via ref
    useImperativeHandle(ref, () => ({
      togglePause: () => {
        if (!runnerRef.current || !engineRef.current) return;
        if (pausedRef.current) {
          Matter.Runner.start(runnerRef.current, engineRef.current);
          pausedRef.current = false;
        } else {
          Matter.Runner.stop(runnerRef.current);
          pausedRef.current = true;
        }
      },
      resetWorld: () => {
        if (!engineRef.current) return;
        const world = engineRef.current.world;
        Matter.Composite.clear(world, false, true);
        addBoundaries(engineRef.current);
        pausedRef.current = false;
        if (runnerRef.current) {
          Matter.Runner.start(runnerRef.current, engineRef.current);
        }
        // Broadcast reset action
        if (roomIdRef.current) {
          const socket = getSocket();
          socket.emit("physics:action", {
            roomId: roomIdRef.current,
            action: { type: "reset", payload: {} } as PhysicsAction,
          });
        }
      },
      isPaused: () => pausedRef.current,
    }));

    const addBoundaries = useCallback((engine: Matter.Engine) => {
      const container = containerRef.current;
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;

      const ground = Matter.Bodies.rectangle(w / 2, h - 15, w + 100, 30, {
        isStatic: true,
        label: GROUND_LABEL,
        render: { fillStyle: "#1e293b", strokeStyle: "#334155", lineWidth: 1 },
      });
      const wallLeft = Matter.Bodies.rectangle(-15, h / 2, 30, h + 100, {
        isStatic: true,
        label: WALL_LEFT_LABEL,
        render: { fillStyle: "#1e293b", strokeStyle: "#334155", lineWidth: 1 },
      });
      const wallRight = Matter.Bodies.rectangle(w + 15, h / 2, 30, h + 100, {
        isStatic: true,
        label: WALL_RIGHT_LABEL,
        render: { fillStyle: "#1e293b", strokeStyle: "#334155", lineWidth: 1 },
      });
      Matter.Composite.add(engine.world, [ground, wallLeft, wallRight]);
    }, []);

    // --- Helper: Create a body from a spawn action payload ---
    const spawnBodyFromAction = useCallback(
      (engine: Matter.Engine, payload: any) => {
        const { shapeType, x, y, fillStyle, strokeStyle, bodyId } = payload;
        let body: Matter.Body | null = null;

        if (shapeType === "circle") {
          body = Matter.Bodies.circle(x, y, 25, {
            restitution: 0.5,
            friction: 0.3,
            render: { fillStyle, strokeStyle, lineWidth: 2 },
          });
        } else if (shapeType === "rectangle") {
          body = Matter.Bodies.rectangle(x, y, 50, 50, {
            restitution: 0.4,
            friction: 0.4,
            render: { fillStyle, strokeStyle, lineWidth: 2 },
          });
        } else if (shapeType === "triangle") {
          body = Matter.Bodies.polygon(x, y, 3, 30, {
            restitution: 0.3,
            friction: 0.5,
            render: { fillStyle, strokeStyle, lineWidth: 2 },
          });
        } else if (shapeType === "wall") {
          body = Matter.Bodies.rectangle(x, y, 120, 20, {
            isStatic: true,
            render: { fillStyle: "#475569", strokeStyle: "#64748b", lineWidth: 2 },
          });
        }

        if (body) {
          // Tag body with the original ID for cross-client reference
          body.label = `synced_${bodyId}`;
          Matter.Composite.add(engine.world, body);
        }
        return body;
      },
      []
    );

    useEffect(() => {
      if (!containerRef.current) return;

      const container = containerRef.current;
      const w = container.clientWidth;
      const h = container.clientHeight;

      // Create engine
      const engine = Matter.Engine.create({
        gravity: { x: 0, y: 1, scale: 0.001 },
      });
      engineRef.current = engine;

      // Create renderer
      const render = Matter.Render.create({
        element: container,
        engine: engine,
        options: {
          width: w,
          height: h,
          wireframes: false,
          background: "#0a0a0f",
          pixelRatio: window.devicePixelRatio || 1,
        },
      });
      renderRef.current = render;

      // Add boundaries
      addBoundaries(engine);

      // Mouse interaction
      const mouse = Matter.Mouse.create(render.canvas);
      const mouseConstraint = Matter.MouseConstraint.create(engine, {
        mouse: mouse,
        constraint: {
          stiffness: 0.2,
          render: {
            visible: true,
            strokeStyle: "rgba(0, 210, 255, 0.4)",
            lineWidth: 2,
          },
        },
      });
      mouseConstraintRef.current = mouseConstraint;
      Matter.Composite.add(engine.world, mouseConstraint);
      render.mouse = mouse;

      // --- Click handler for spawning shapes / constraints / delete ---
      let mouseDownPos: { x: number; y: number } | null = null;

      const handleMouseDown = (e: MouseEvent) => {
        const rect = render.canvas.getBoundingClientRect();
        mouseDownPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      };

      const handleMouseUp = (e: MouseEvent) => {
        if (!mouseDownPos) return;

        const rect = render.canvas.getBoundingClientRect();
        const upX = e.clientX - rect.left;
        const upY = e.clientY - rect.top;
        const dx = upX - mouseDownPos.x;
        const dy = upY - mouseDownPos.y;
        if (Math.sqrt(dx * dx + dy * dy) > 8) {
          mouseDownPos = null;
          return;
        }

        const tool = activeToolRef.current;
        const worldX = upX;
        const worldY = upY;

        // --- SHAPE TOOLS ---
        if (["circle", "rectangle", "triangle", "wall"].includes(tool)) {
          const color = tool === "wall" ? { fill: "#475569", stroke: "#64748b" } : randomColor();
          let body: Matter.Body | null = null;

          if (tool === "circle") {
            body = Matter.Bodies.circle(worldX, worldY, 25, {
              restitution: 0.5, friction: 0.3,
              render: { fillStyle: color.fill, strokeStyle: color.stroke, lineWidth: 2 },
            });
          } else if (tool === "rectangle") {
            body = Matter.Bodies.rectangle(worldX, worldY, 50, 50, {
              restitution: 0.4, friction: 0.4,
              render: { fillStyle: color.fill, strokeStyle: color.stroke, lineWidth: 2 },
            });
          } else if (tool === "triangle") {
            body = Matter.Bodies.polygon(worldX, worldY, 3, 30, {
              restitution: 0.3, friction: 0.5,
              render: { fillStyle: color.fill, strokeStyle: color.stroke, lineWidth: 2 },
            });
          } else if (tool === "wall") {
            body = Matter.Bodies.rectangle(worldX, worldY, 120, 20, {
              isStatic: true,
              render: { fillStyle: color.fill, strokeStyle: color.stroke, lineWidth: 2 },
            });
          }

          if (body) {
            Matter.Composite.add(engine.world, body);

            // Broadcast spawn action
            if (roomIdRef.current) {
              const socket = getSocket();
              socket.emit("physics:action", {
                roomId: roomIdRef.current,
                action: {
                  type: "spawn",
                  payload: {
                    shapeType: tool,
                    x: worldX,
                    y: worldY,
                    fillStyle: color.fill,
                    strokeStyle: color.stroke,
                    bodyId: body.id,
                  },
                } as PhysicsAction,
              });
            }
          }
        }

        // --- DELETE TOOL ---
        if (tool === "delete") {
          const bodies = Matter.Query.point(
            Matter.Composite.allBodies(engine.world),
            { x: worldX, y: worldY }
          );
          for (const b of bodies) {
            if (isStaticBoundary(b)) continue;
            const constraints = Matter.Composite.allConstraints(engine.world);
            for (const c of constraints) {
              if (c === mouseConstraint.constraint) continue;
              if (c.bodyA === b || c.bodyB === b) {
                Matter.Composite.remove(engine.world, c);
              }
            }
            // Broadcast delete
            if (roomIdRef.current) {
              const socket = getSocket();
              socket.emit("physics:action", {
                roomId: roomIdRef.current,
                action: {
                  type: "delete",
                  payload: { bodyId: b.id },
                } as PhysicsAction,
              });
            }
            Matter.Composite.remove(engine.world, b);
          }
        }

        // --- CONSTRAINT TOOLS (rope, spring) ---
        if (tool === "rope" || tool === "spring") {
          const bodiesAtPoint = Matter.Query.point(
            Matter.Composite.allBodies(engine.world),
            { x: worldX, y: worldY }
          );
          const clickedBody = bodiesAtPoint.find((b) => !isStaticBoundary(b));

          if (!constraintFirstBodyRef.current) {
            if (clickedBody) {
              constraintFirstBodyRef.current = clickedBody;
              setFirstBodySelected(true);
              clickedBody.render.strokeStyle = "#00d2ff";
              clickedBody.render.lineWidth = 3;
            }
          } else {
            const bodyA = constraintFirstBodyRef.current;
            if (clickedBody && clickedBody !== bodyA) {
              const stiffness = tool === "rope" ? 0.8 : 0.15;
              const damping = tool === "spring" ? 0.05 : 0;
              const constraint = Matter.Constraint.create({
                bodyA, bodyB: clickedBody,
                stiffness, damping,
                render: {
                  strokeStyle: tool === "rope" ? "rgba(148, 163, 184, 0.8)" : "rgba(34, 197, 94, 0.8)",
                  lineWidth: tool === "rope" ? 2 : 3,
                  type: "line",
                },
              });
              Matter.Composite.add(engine.world, constraint);

              // Broadcast constraint
              if (roomIdRef.current) {
                const socket = getSocket();
                socket.emit("physics:action", {
                  roomId: roomIdRef.current,
                  action: {
                    type: "constraint",
                    payload: {
                      constraintType: tool,
                      bodyAId: bodyA.id,
                      bodyBId: clickedBody.id,
                      stiffness, damping,
                    },
                  } as PhysicsAction,
                });
              }
            }
            const origColor = shapeColors.find((c) => c.fill === bodyA.render.fillStyle);
            if (origColor) {
              bodyA.render.strokeStyle = origColor.stroke;
              bodyA.render.lineWidth = 2;
            }
            constraintFirstBodyRef.current = null;
            setFirstBodySelected(false);
          }
        }

        // --- PIVOT TOOL ---
        if (tool === "pivot") {
          const bodiesAtPoint = Matter.Query.point(
            Matter.Composite.allBodies(engine.world),
            { x: worldX, y: worldY }
          );
          const clickedBody = bodiesAtPoint.find((b) => !isStaticBoundary(b));
          if (clickedBody) {
            const constraint = Matter.Constraint.create({
              bodyA: clickedBody,
              pointB: { x: clickedBody.position.x, y: clickedBody.position.y },
              length: 0, stiffness: 1,
              render: { strokeStyle: "rgba(251, 191, 36, 0.8)", lineWidth: 2 },
            });
            Matter.Composite.add(engine.world, constraint);

            if (roomIdRef.current) {
              const socket = getSocket();
              socket.emit("physics:action", {
                roomId: roomIdRef.current,
                action: {
                  type: "constraint",
                  payload: {
                    constraintType: "pivot",
                    bodyAId: clickedBody.id,
                    pointBX: clickedBody.position.x,
                    pointBY: clickedBody.position.y,
                  },
                } as PhysicsAction,
              });
            }
          }
        }

        mouseDownPos = null;
      };

      render.canvas.addEventListener("mousedown", handleMouseDown);
      render.canvas.addEventListener("mouseup", handleMouseUp);

      // Disable mouse constraint when not in grab mode
      Matter.Events.on(mouseConstraint, "startdrag", () => {
        const tool = activeToolRef.current;
        if (tool !== "grab") {
          mouseConstraint.constraint.bodyB = null as any;
          (mouseConstraint as any).body = null;
        }
      });

      // Keyboard shortcuts
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        if (e.code === "Space") {
          e.preventDefault();
          if (pausedRef.current) {
            Matter.Runner.start(runnerRef.current!, engineRef.current!);
            pausedRef.current = false;
          } else {
            Matter.Runner.stop(runnerRef.current!);
            pausedRef.current = true;
          }
          window.dispatchEvent(
            new CustomEvent("physics-pause-toggle", { detail: { paused: pausedRef.current } })
          );
        }
        if (e.code === "KeyR" && !e.ctrlKey && !e.metaKey) {
          Matter.Composite.clear(engine.world, false, true);
          addBoundaries(engine);
          pausedRef.current = false;
          if (runnerRef.current) Matter.Runner.start(runnerRef.current, engine);
          window.dispatchEvent(
            new CustomEvent("physics-pause-toggle", { detail: { paused: false } })
          );
          if (roomIdRef.current) {
            const socket = getSocket();
            socket.emit("physics:action", {
              roomId: roomIdRef.current,
              action: { type: "reset", payload: {} } as PhysicsAction,
            });
          }
        }
      };
      window.addEventListener("keydown", handleKeyDown);

      // Start
      Matter.Render.run(render);
      const runner = Matter.Runner.create();
      runnerRef.current = runner;
      Matter.Runner.run(runner, engine);

      // Handle resize
      const handleResize = () => {
        const newW = container.clientWidth;
        const newH = container.clientHeight;
        render.canvas.width = newW * (window.devicePixelRatio || 1);
        render.canvas.height = newH * (window.devicePixelRatio || 1);
        render.canvas.style.width = `${newW}px`;
        render.canvas.style.height = `${newH}px`;
        render.options.width = newW;
        render.options.height = newH;
      };
      window.addEventListener("resize", handleResize);

      // Cleanup
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("resize", handleResize);
        render.canvas.removeEventListener("mousedown", handleMouseDown);
        render.canvas.removeEventListener("mouseup", handleMouseUp);
        Matter.Render.stop(render);
        Matter.Runner.stop(runner);
        Matter.World.clear(engine.world, false);
        Matter.Engine.clear(engine);
        if (render.canvas) render.canvas.remove();
      };
    }, [addBoundaries, spawnBodyFromAction]);

    // --- MULTIPLAYER SYNC EFFECT ---
    useEffect(() => {
      if (!roomId || !engineRef.current) return;

      const engine = engineRef.current;
      const socket = getSocket();

      // HOST: broadcast physics snapshot at ~20Hz
      if (isHost) {
        syncIntervalRef.current = setInterval(() => {
          if (pausedRef.current || !engineRef.current) return;

          const allBodies = Matter.Composite.allBodies(engine.world);
          const bodies: BodySnapshot[] = allBodies
            .filter((b) => !isStaticBoundary(b))
            .map((b) => ({
              id: b.id,
              label: b.label,
              posX: b.position.x,
              posY: b.position.y,
              angle: b.angle,
              velX: b.velocity.x,
              velY: b.velocity.y,
              angularVel: b.angularVelocity,
              isStatic: b.isStatic,
              shapeType: (b as any).circleRadius ? "circle" : "rectangle",
              circleRadius: (b as any).circleRadius,
              fillStyle: (b.render as any).fillStyle || "#3b82f6",
              strokeStyle: (b.render as any).strokeStyle || "#60a5fa",
            }));

          const snapshot: PhysicsSnapshot = {
            bodies,
            constraints: [],
            timestamp: Date.now(),
          };

          socket.emit("physics:snapshot", { roomId, snapshot });
        }, 50); // 20Hz
      }

      // NON-HOST: receive physics snapshots and update local bodies
      const handleSnapshot = (snapshot: PhysicsSnapshot) => {
        if (isHostRef.current || !engineRef.current) return;

        const world = engineRef.current.world;
        const localBodies = Matter.Composite.allBodies(world).filter(
          (b) => !isStaticBoundary(b)
        );

        for (const remote of snapshot.bodies) {
          const local = localBodies.find((b) => b.id === remote.id || b.label === `synced_${remote.id}`);
          if (local) {
            // Update existing body position/velocity
            Matter.Body.setPosition(local, { x: remote.posX, y: remote.posY });
            Matter.Body.setAngle(local, remote.angle);
            Matter.Body.setVelocity(local, { x: remote.velX, y: remote.velY });
            Matter.Body.setAngularVelocity(local, remote.angularVel);
          }
        }
      };

      // Receive actions from other clients
      const handleAction = (action: PhysicsAction) => {
        if (!engineRef.current) return;
        const eng = engineRef.current;

        if (action.type === "spawn") {
          spawnBodyFromAction(eng, action.payload);
        } else if (action.type === "delete") {
          const bodies = Matter.Composite.allBodies(eng.world);
          const target = bodies.find(
            (b) => b.id === action.payload.bodyId || b.label === `synced_${action.payload.bodyId}`
          );
          if (target && !isStaticBoundary(target)) {
            const constraints = Matter.Composite.allConstraints(eng.world);
            for (const c of constraints) {
              if (c.bodyA === target || c.bodyB === target) {
                Matter.Composite.remove(eng.world, c);
              }
            }
            Matter.Composite.remove(eng.world, target);
          }
        } else if (action.type === "constraint") {
          const p = action.payload;
          const bodies = Matter.Composite.allBodies(eng.world);
          const bodyA = bodies.find(
            (b) => b.id === p.bodyAId || b.label === `synced_${p.bodyAId}`
          );

          if (p.constraintType === "pivot" && bodyA) {
            const c = Matter.Constraint.create({
              bodyA,
              pointB: { x: p.pointBX, y: p.pointBY },
              length: 0, stiffness: 1,
              render: { strokeStyle: "rgba(251, 191, 36, 0.8)", lineWidth: 2 },
            });
            Matter.Composite.add(eng.world, c);
          } else if (bodyA) {
            const bodyB = bodies.find(
              (b) => b.id === p.bodyBId || b.label === `synced_${p.bodyBId}`
            );
            if (bodyB) {
              const c = Matter.Constraint.create({
                bodyA, bodyB,
                stiffness: p.stiffness,
                damping: p.damping,
                render: {
                  strokeStyle: p.constraintType === "rope" ? "rgba(148, 163, 184, 0.8)" : "rgba(34, 197, 94, 0.8)",
                  lineWidth: p.constraintType === "rope" ? 2 : 3,
                  type: "line",
                },
              });
              Matter.Composite.add(eng.world, c);
            }
          }
        } else if (action.type === "reset") {
          Matter.Composite.clear(eng.world, false, true);
          addBoundaries(eng);
        }
      };

      socket.on("physics:snapshot", handleSnapshot);
      socket.on("physics:action", handleAction);

      return () => {
        if (syncIntervalRef.current) {
          clearInterval(syncIntervalRef.current);
          syncIntervalRef.current = null;
        }
        socket.off("physics:snapshot", handleSnapshot);
        socket.off("physics:action", handleAction);
      };
    }, [roomId, isHost, addBoundaries, spawnBodyFromAction]);

    return (
      <div
        ref={containerRef}
        className="w-full h-full relative"
        style={{ cursor: activeTool === "grab" ? "grab" : "crosshair" }}
      >
        {firstBodySelected && (
          <div
            className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-sm font-medium z-10"
            style={{
              background: "rgba(0, 210, 255, 0.15)",
              border: "1px solid rgba(0, 210, 255, 0.3)",
              color: "var(--accent-cyan)",
              backdropFilter: "blur(8px)",
            }}
          >
            Click a second body to create {activeTool}
          </div>
        )}
      </div>
    );
  }
);

PhysicsCanvas.displayName = "PhysicsCanvas";
export default PhysicsCanvas;
