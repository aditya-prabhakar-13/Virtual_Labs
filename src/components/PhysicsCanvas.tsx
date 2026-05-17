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
import type { ToolType, PhysicsCanvasHandle, InspectedBodyData, WorldData } from "@/app/page";
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
  onInspectedBodyUpdate: (data: InspectedBodyData | null) => void;
  onWorldUpdate: (data: WorldData) => void;
  showVectors: boolean;
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

// Returns the point-to-line-segment distance for constraint click detection
function distToConstraint(c: Matter.Constraint, x: number, y: number): number {
  const pA = c.bodyA ? c.bodyA.position : c.pointA;
  const pB = c.bodyB ? c.bodyB.position : c.pointB;
  if (!pA || !pB) return Infinity;
  const dx = pB.x - pA.x;
  const dy = pB.y - pA.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(x - pA.x, y - pA.y);
  const t = Math.max(0, Math.min(1, ((x - pA.x) * dx + (y - pA.y) * dy) / lenSq));
  return Math.hypot(x - (pA.x + t * dx), y - (pA.y + t * dy));
}

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

function drawArrow(
  ctx: CanvasRenderingContext2D,
  fromX: number, fromY: number,
  toX: number, toY: number,
  color: string,
  lineWidth: number = 2
) {
  const headLen = 8;
  const dx = toX - fromX;
  const dy = toY - fromY;
  const angle = Math.atan2(dy, dx);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.globalAlpha = 0.85;

  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI / 6), toY - headLen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 6), toY - headLen * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

const PhysicsCanvas = forwardRef<PhysicsCanvasHandle, PhysicsCanvasProps>(
  ({ activeTool, roomId, isHost, onInspectedBodyUpdate, onWorldUpdate, showVectors }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const engineRef = useRef<Matter.Engine | null>(null);
    const renderRef = useRef<Matter.Render | null>(null);
    const runnerRef = useRef<Matter.Runner | null>(null);
    const mouseConstraintRef = useRef<Matter.MouseConstraint | null>(null);
    const pausedRef = useRef(false);
    const activeToolRef = useRef(activeTool);
    const constraintFirstBodyRef = useRef<Matter.Body | null>(null);
    const [firstBodySelected, setFirstBodySelected] = useState(false);
    const [localInspectedBody, setLocalInspectedBody] = useState<InspectedBodyData | null>(null);
    const roomIdRef = useRef(roomId);
    const isHostRef = useRef(isHost);
    const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const inspectedBodyRef = useRef<Matter.Body | null>(null);
    const onInspectedBodyUpdateRef = useRef(onInspectedBodyUpdate);
    onInspectedBodyUpdateRef.current = onInspectedBodyUpdate;
    const onWorldUpdateRef = useRef(onWorldUpdate);
    onWorldUpdateRef.current = onWorldUpdate;
    const showVectorsRef = useRef(showVectors);
    showVectorsRef.current = showVectors;

    useEffect(() => {
      activeToolRef.current = activeTool;
      constraintFirstBodyRef.current = null;
      setFirstBodySelected(false);
    }, [activeTool]);

    useEffect(() => { roomIdRef.current = roomId; }, [roomId]);
    useEffect(() => { isHostRef.current = isHost; }, [isHost]);

    // Helper to find a body by id in the current world
    const getBodyById = useCallback((id: number) => {
      if (!engineRef.current) return null;
      return Matter.Composite.allBodies(engineRef.current.world).find(b => b.id === id) ?? null;
    }, []);

    // Helper to find a constraint by id in the current world
    const getConstraintById = useCallback((id: number) => {
      if (!engineRef.current) return null;
      return Matter.Composite.allConstraints(engineRef.current.world).find(c => c.id === id) ?? null;
    }, []);

    useImperativeHandle(ref, () => ({
      // --- Task 1: Pause via timeScale (reliable freeze) ---
      togglePause: () => {
        if (!engineRef.current) return;
        if (pausedRef.current) {
          engineRef.current.timing.timeScale = 1;
          pausedRef.current = false;
        } else {
          engineRef.current.timing.timeScale = 0;
          pausedRef.current = true;
        }
      },

      resetWorld: () => {
        if (!engineRef.current) return;
        const world = engineRef.current.world;
        Matter.Composite.clear(world, false, true);
        addBoundaries(engineRef.current);
        pausedRef.current = false;
        engineRef.current.timing.timeScale = 1;
        if (roomIdRef.current) {
          const socket = getSocket();
          socket.emit("physics:action", {
            roomId: roomIdRef.current,
            action: { type: "reset", payload: {} } as PhysicsAction,
          });
        }
      },

      isPaused: () => pausedRef.current,

      getSnapshot: () => {
        if (!engineRef.current) return null;
        const engine = engineRef.current;
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
            shapeType: (b as any).circleRadius ? "circle" : (b.label.includes("triangle") ? "triangle" : "rectangle"),
            circleRadius: (b as any).circleRadius,
            fillStyle: (b.render as any).fillStyle || "#3b82f6",
            strokeStyle: (b.render as any).strokeStyle || "#60a5fa",
          }));

        const allConstraints = Matter.Composite.allConstraints(engine.world);
        const constraints: ConstraintSnapshot[] = allConstraints
          .filter((c) => c.label !== "Mouse Constraint")
          .map((c) => ({
            id: c.id,
            bodyAId: c.bodyA ? c.bodyA.id : null,
            bodyBId: c.bodyB ? c.bodyB.id : null,
            pointBX: c.bodyB ? undefined : c.pointB.x,
            pointBY: c.bodyB ? undefined : c.pointB.y,
            stiffness: c.stiffness,
            damping: c.damping,
            length: c.length,
            strokeStyle: (c.render as any).strokeStyle || "#ffffff",
            lineWidth: (c.render as any).lineWidth || 1,
          }));

        return { bodies, constraints, timestamp: Date.now() } as PhysicsSnapshot;
      },

      loadSnapshot: (snapshot: PhysicsSnapshot) => {
        if (!engineRef.current) return;
        const engine = engineRef.current;
        Matter.Composite.clear(engine.world, false, true);
        addBoundaries(engine);
        pausedRef.current = false;
        engine.timing.timeScale = 1;

        const createdBodies = new Map<number, Matter.Body>();
        snapshot.bodies.forEach((bs) => {
          let body: Matter.Body | null = null;
          if (bs.shapeType === "circle" && bs.circleRadius) {
            body = Matter.Bodies.circle(bs.posX, bs.posY, bs.circleRadius, {
              isStatic: bs.isStatic,
              restitution: 0.5, friction: 0.3,
              render: { fillStyle: bs.fillStyle, strokeStyle: bs.strokeStyle, lineWidth: 2 },
            });
          } else if (bs.shapeType === "triangle") {
            body = Matter.Bodies.polygon(bs.posX, bs.posY, 3, 30, {
              isStatic: bs.isStatic,
              restitution: 0.3, friction: 0.5,
              render: { fillStyle: bs.fillStyle, strokeStyle: bs.strokeStyle, lineWidth: 2 },
            });
          } else {
            body = Matter.Bodies.rectangle(bs.posX, bs.posY, bs.isStatic ? 120 : 50, bs.isStatic ? 20 : 50, {
              isStatic: bs.isStatic,
              restitution: 0.4, friction: 0.4,
              render: { fillStyle: bs.fillStyle, strokeStyle: bs.strokeStyle, lineWidth: 2 },
            });
          }

          if (body) {
            (body as any).id = bs.id;
            body.label = `synced_${bs.id}`;
            Matter.Body.setAngle(body, bs.angle);
            Matter.Body.setVelocity(body, { x: bs.velX, y: bs.velY });
            Matter.Body.setAngularVelocity(body, bs.angularVel);
            Matter.Composite.add(engine.world, body);
            createdBodies.set(bs.id, body);
          }
        });

        snapshot.constraints.forEach((cs) => {
          const bodyA = cs.bodyAId ? createdBodies.get(cs.bodyAId) : undefined;
          const bodyB = cs.bodyBId ? createdBodies.get(cs.bodyBId) : undefined;

          if (bodyA) {
            const constraintOptions: any = {
              bodyA,
              stiffness: cs.stiffness,
              damping: cs.damping,
              length: cs.length,
              render: { strokeStyle: cs.strokeStyle, lineWidth: cs.lineWidth, type: "line" },
            };

            if (bodyB) {
              constraintOptions.bodyB = bodyB;
            } else if (cs.pointBX !== undefined && cs.pointBY !== undefined) {
              constraintOptions.pointB = { x: cs.pointBX, y: cs.pointBY };
            }

            const c = Matter.Constraint.create(constraintOptions);
            (c as any).id = cs.id;
            Matter.Composite.add(engine.world, c);
          }
        });

        if (roomIdRef.current) {
          const socket = getSocket();
          socket.emit("physics:action", {
            roomId: roomIdRef.current,
            action: { type: "reset", payload: {} } as PhysicsAction,
          });
        }
      },

      // --- Task 3 & 4: Body property setters ---
      setBodyMass: (id, mass) => {
        const body = getBodyById(id);
        if (body) Matter.Body.setMass(body, Math.max(0.01, mass));
      },
      setBodyAngle: (id, angle) => {
        const body = getBodyById(id);
        if (body) Matter.Body.setAngle(body, angle);
      },
      setBodyVelocity: (id, vx, vy) => {
        const body = getBodyById(id);
        if (body) Matter.Body.setVelocity(body, { x: vx, y: vy });
      },
      applyBodyForce: (id, fx, fy) => {
        const body = getBodyById(id);
        if (body) Matter.Body.applyForce(body, body.position, { x: fx, y: fy });
      },
      setBodyFriction: (id, friction, frictionStatic) => {
        const body = getBodyById(id);
        if (body) {
          body.friction = Math.max(0, friction);
          body.frictionStatic = Math.max(0, frictionStatic);
        }
      },
      setBodyRestitution: (id, restitution) => {
        const body = getBodyById(id);
        if (body) body.restitution = Math.max(0, Math.min(1, restitution));
      },

      // --- Task 5: Constraint property setters ---
      setConstraintLength: (id, length) => {
        const c = getConstraintById(id);
        if (c) c.length = Math.max(0, length);
      },
      setConstraintStiffness: (id, stiffness) => {
        const c = getConstraintById(id);
        if (c) c.stiffness = Math.max(0.001, Math.min(1, stiffness));
      },

      // --- Task 7: Air damping and constraint damping ---
      setBodyFrictionAir: (id, frictionAir) => {
        const body = getBodyById(id);
        if (body) body.frictionAir = Math.max(0, Math.min(1, frictionAir));
      },
      setConstraintDamping: (id, damping) => {
        const c = getConstraintById(id);
        if (c) c.damping = Math.max(0, damping);
      },
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

    const spawnBodyFromAction = useCallback(
      (engine: Matter.Engine, payload: any) => {
        const { shapeType, x, y, fillStyle, strokeStyle, bodyId } = payload;
        let body: Matter.Body | null = null;

        if (shapeType === "circle") {
          body = Matter.Bodies.circle(x, y, 25, {
            restitution: 0.5, friction: 0.3,
            render: { fillStyle, strokeStyle, lineWidth: 2 },
          });
        } else if (shapeType === "rectangle") {
          body = Matter.Bodies.rectangle(x, y, 50, 50, {
            restitution: 0.4, friction: 0.4,
            render: { fillStyle, strokeStyle, lineWidth: 2 },
          });
        } else if (shapeType === "triangle") {
          body = Matter.Bodies.polygon(x, y, 3, 30, {
            restitution: 0.3, friction: 0.5,
            render: { fillStyle, strokeStyle, lineWidth: 2 },
          });
        } else if (shapeType === "wall") {
          body = Matter.Bodies.rectangle(x, y, 120, 20, {
            isStatic: true,
            render: { fillStyle: "#475569", strokeStyle: "#64748b", lineWidth: 2 },
          });
        }

        if (body) {
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

      const engine = Matter.Engine.create({
        gravity: { x: 0, y: 1, scale: 0.001 },
      });
      engineRef.current = engine;

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

      addBoundaries(engine);

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

      let mouseDownPos: { x: number; y: number } | null = null;

      // --- Task 2: Grab fix — bypass custom logic entirely in grab mode ---
      const handleMouseDown = (e: MouseEvent) => {
        if (activeToolRef.current === "grab") return;
        const rect = render.canvas.getBoundingClientRect();
        mouseDownPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      };

      const handleMouseUp = (e: MouseEvent) => {
        if (activeToolRef.current === "grab") return;
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
            if (roomIdRef.current) {
              const socket = getSocket();
              socket.emit("physics:action", {
                roomId: roomIdRef.current,
                action: {
                  type: "spawn",
                  payload: {
                    shapeType: tool, x: worldX, y: worldY,
                    fillStyle: color.fill, strokeStyle: color.stroke,
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
            if (roomIdRef.current) {
              const socket = getSocket();
              socket.emit("physics:action", {
                roomId: roomIdRef.current,
                action: { type: "delete", payload: { bodyId: b.id } } as PhysicsAction,
              });
            }
            Matter.Composite.remove(engine.world, b);
          }
        }

        // --- CONSTRAINT TOOLS ---
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
              // Tag constraint type for ObjectPanel identification
              (constraint as any)._constraintType = tool;
              Matter.Composite.add(engine.world, constraint);

              if (roomIdRef.current) {
                const socket = getSocket();
                socket.emit("physics:action", {
                  roomId: roomIdRef.current,
                  action: {
                    type: "constraint",
                    payload: {
                      constraintType: tool,
                      bodyAId: bodyA.id, bodyBId: clickedBody.id,
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
            (constraint as any)._constraintType = "pivot";
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

      // Prevent MouseConstraint from dragging when NOT in grab mode
      Matter.Events.on(mouseConstraint, "startdrag", () => {
        if (activeToolRef.current !== "grab") {
          mouseConstraint.constraint.bodyB = null as any;
          (mouseConstraint as any).body = null;
        }
      });

      // Keyboard shortcuts
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

        // --- Task 1: Space bar pause via timeScale ---
        if (e.code === "Space") {
          e.preventDefault();
          if (!engineRef.current) return;
          if (pausedRef.current) {
            engineRef.current.timing.timeScale = 1;
            pausedRef.current = false;
          } else {
            engineRef.current.timing.timeScale = 0;
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
          engine.timing.timeScale = 1;
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

      Matter.Render.run(render);
      const runner = Matter.Runner.create();
      runnerRef.current = runner;
      Matter.Runner.run(runner, engine);

      // --- Task 6: afterRender — vectors for inspect tool OR global showVectors ---
      Matter.Events.on(render, "afterRender", () => {
        const tool = activeToolRef.current;
        const showAll = showVectorsRef.current;
        if (tool !== "inspect" && !showAll) return;

        const ctx = render.context as CanvasRenderingContext2D;
        const allBodies = Matter.Composite.allBodies(engine.world);
        const pixelRatio = window.devicePixelRatio || 1;

        ctx.save();
        ctx.scale(pixelRatio, pixelRatio);

        for (const body of allBodies) {
          if (body.isStatic || isStaticBoundary(body)) continue;

          const px = body.position.x;
          const py = body.position.y;
          const vx = body.velocity.x;
          const vy = body.velocity.y;
          const velMag = Math.sqrt(vx * vx + vy * vy);

          if (velMag > 0.3) {
            drawArrow(ctx, px, py, px + vx * 12, py + vy * 12, "#00d2ff", 2);
          }

          const fx = body.force.x;
          const fy = body.force.y;
          if (Math.sqrt(fx * fx + fy * fy) > 0.000001) {
            drawArrow(ctx, px, py, px + fx * 5000, py + fy * 5000, "#f59e0b", 2);
          }

          // Inspected body highlight ring (only in inspect mode)
          if (tool === "inspect" && inspectedBodyRef.current && body.id === inspectedBodyRef.current.id) {
            const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 200);
            ctx.strokeStyle = `rgba(0, 210, 255, ${0.4 + pulse * 0.4})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            const radius = Math.max(30, (body as any).circleRadius || 30);
            ctx.arc(px, py, radius + 6, 0, Math.PI * 2);
            ctx.stroke();
          }
        }

        ctx.restore();
      });

      // --- Inspect: click to select a body OR a spring constraint ---
      const handleInspectClick = (e: MouseEvent) => {
        if (activeToolRef.current !== "inspect") return;

        const rect = render.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const bodiesAtPoint = Matter.Query.point(
          Matter.Composite.allBodies(engine.world),
          { x, y }
        );
        const clicked = bodiesAtPoint.find((b) => !isStaticBoundary(b) && !b.isStatic);

        if (clicked) {
          inspectedBodyRef.current = clicked;
        } else {
          // Check if near a constraint line (for Task 5 spring selection)
          const allConstraints = Matter.Composite.allConstraints(engine.world)
            .filter(c => c.label !== "Mouse Constraint");
          const nearby = allConstraints.find(c => distToConstraint(c, x, y) < 12);
          if (!nearby) {
            inspectedBodyRef.current = null;
            setLocalInspectedBody(null);
            onInspectedBodyUpdateRef.current(null);
          }
          // Constraint clicks are handled at the ObjectPanel level via world data
        }
      };
      render.canvas.addEventListener("click", handleInspectClick);

      // --- Inspected body data update (50ms) ---
      const inspectDataInterval = setInterval(() => {
        const body = inspectedBodyRef.current;
        if (!body || activeToolRef.current !== "inspect") return;

        const allBodies = Matter.Composite.allBodies(engine.world);
        if (!allBodies.includes(body)) {
          inspectedBodyRef.current = null;
          onInspectedBodyUpdateRef.current(null);
          return;
        }

        const vx = body.velocity.x;
        const vy = body.velocity.y;
        const velMag = Math.sqrt(vx * vx + vy * vy);
        const fx = body.force.x;
        const fy = body.force.y;
        const forceMag = Math.sqrt(fx * fx + fy * fy);

        const data: InspectedBodyData = {
          id: body.id,
          label: body.label || `Body ${body.id}`,
          mass: body.mass,
          posX: body.position.x,
          posY: body.position.y,
          velX: vx, velY: vy, velMag,
          angle: body.angle,
          kineticEnergy: 0.5 * body.mass * velMag * velMag,
          forceX: fx, forceY: fy, forceMag,
          timestamp: Date.now(),
        };

        setLocalInspectedBody(data);
        onInspectedBodyUpdateRef.current(data);
      }, 50);

      // --- Task 3: World data update for ObjectPanel (100ms) ---
      const worldUpdateInterval = setInterval(() => {
        if (!onWorldUpdateRef.current) return;

        const allBodies = Matter.Composite.allBodies(engine.world)
          .filter(b => !isStaticBoundary(b))
          .map(b => ({
            id: b.id,
            label: b.label || `Body ${b.id}`,
            mass: b.mass,
            friction: b.friction,
            frictionStatic: b.frictionStatic,
            frictionAir: b.frictionAir,
            restitution: b.restitution,
            posX: b.position.x,
            posY: b.position.y,
            velX: b.velocity.x,
            velY: b.velocity.y,
            angle: b.angle,
            isStatic: b.isStatic,
          }));

        const allConstraints = Matter.Composite.allConstraints(engine.world)
          .filter(c => c.label !== "Mouse Constraint")
          .map(c => ({
            id: c.id,
            label: c.label || `Constraint ${c.id}`,
            length: c.length ?? 0,
            stiffness: c.stiffness,
            damping: c.damping,
            bodyAId: c.bodyA?.id,
            bodyBId: c.bodyB?.id,
            constraintType: (c as any)._constraintType || "rope",
          }));

        onWorldUpdateRef.current({ bodies: allBodies, constraints: allConstraints });
      }, 100);

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

      return () => {
        clearInterval(inspectDataInterval);
        clearInterval(worldUpdateInterval);
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("resize", handleResize);
        render.canvas.removeEventListener("mousedown", handleMouseDown);
        render.canvas.removeEventListener("mouseup", handleMouseUp);
        render.canvas.removeEventListener("click", handleInspectClick);
        Matter.Events.off(render, "afterRender");
        Matter.Render.stop(render);
        Matter.Runner.stop(runner);
        Matter.World.clear(engine.world, false);
        Matter.Engine.clear(engine);
        if (render.canvas) render.canvas.remove();
      };
    }, [addBoundaries, spawnBodyFromAction]);

    // --- MULTIPLAYER SYNC ---
    useEffect(() => {
      if (!roomId || !engineRef.current) return;

      const engine = engineRef.current;
      const socket = getSocket();

      if (isHost) {
        syncIntervalRef.current = setInterval(() => {
          if (pausedRef.current || !engineRef.current) return;

          const allBodies = Matter.Composite.allBodies(engine.world);
          const round = (val: number) => Math.round(val * 100) / 100;

          const bodies: BodySnapshot[] = allBodies
            .filter((b) => !isStaticBoundary(b))
            .map((b) => ({
              id: b.id,
              label: b.label,
              posX: round(b.position.x),
              posY: round(b.position.y),
              angle: round(b.angle),
              velX: round(b.velocity.x),
              velY: round(b.velocity.y),
              angularVel: round(b.angularVelocity),
              isStatic: b.isStatic,
              shapeType: (b as any).circleRadius ? "circle" : "rectangle",
              circleRadius: (b as any).circleRadius,
              fillStyle: (b.render as any).fillStyle || "#3b82f6",
              strokeStyle: (b.render as any).strokeStyle || "#60a5fa",
            }));

          socket.emit("physics:snapshot", {
            roomId,
            snapshot: { bodies, constraints: [], timestamp: Date.now() } as PhysicsSnapshot,
          });
        }, 50);
      }

      const handleSnapshot = (snapshot: PhysicsSnapshot) => {
        if (isHostRef.current || !engineRef.current) return;
        const world = engineRef.current.world;
        const localBodies = Matter.Composite.allBodies(world).filter(b => !isStaticBoundary(b));

        for (const remote of snapshot.bodies) {
          const local = localBodies.find(b => b.id === remote.id || b.label === `synced_${remote.id}`);
          if (local) {
            Matter.Body.setPosition(local, { x: remote.posX, y: remote.posY });
            Matter.Body.setAngle(local, remote.angle);
            Matter.Body.setVelocity(local, { x: remote.velX, y: remote.velY });
            Matter.Body.setAngularVelocity(local, remote.angularVel);
          }
        }
      };

      const handleAction = (action: PhysicsAction) => {
        if (!engineRef.current) return;
        const eng = engineRef.current;

        if (action.type === "spawn") {
          spawnBodyFromAction(eng, action.payload);
        } else if (action.type === "delete") {
          const bodies = Matter.Composite.allBodies(eng.world);
          const target = bodies.find(b => b.id === action.payload.bodyId || b.label === `synced_${action.payload.bodyId}`);
          if (target && !isStaticBoundary(target)) {
            const constraints = Matter.Composite.allConstraints(eng.world);
            for (const c of constraints) {
              if (c.bodyA === target || c.bodyB === target) Matter.Composite.remove(eng.world, c);
            }
            Matter.Composite.remove(eng.world, target);
          }
        } else if (action.type === "constraint") {
          const p = action.payload;
          const bodies = Matter.Composite.allBodies(eng.world);
          const bodyA = bodies.find(b => b.id === p.bodyAId || b.label === `synced_${p.bodyAId}`);

          if (p.constraintType === "pivot" && bodyA) {
            const c = Matter.Constraint.create({
              bodyA,
              pointB: { x: p.pointBX, y: p.pointBY },
              length: 0, stiffness: 1,
              render: { strokeStyle: "rgba(251, 191, 36, 0.8)", lineWidth: 2 },
            });
            (c as any)._constraintType = "pivot";
            Matter.Composite.add(eng.world, c);
          } else if (bodyA) {
            const bodyB = bodies.find(b => b.id === p.bodyBId || b.label === `synced_${p.bodyBId}`);
            if (bodyB) {
              const c = Matter.Constraint.create({
                bodyA, bodyB,
                stiffness: p.stiffness, damping: p.damping,
                render: {
                  strokeStyle: p.constraintType === "rope" ? "rgba(148, 163, 184, 0.8)" : "rgba(34, 197, 94, 0.8)",
                  lineWidth: p.constraintType === "rope" ? 2 : 3,
                  type: "line",
                },
              });
              (c as any)._constraintType = p.constraintType;
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

        {activeTool === "inspect" && localInspectedBody && (
          <div
            className="absolute z-20 pointer-events-none transition-all duration-75"
            style={{
              left: localInspectedBody.posX + 40,
              top: localInspectedBody.posY - 40,
              background: "rgba(18, 18, 26, 0.85)",
              border: "1px solid var(--border-subtle)",
              backdropFilter: "blur(12px)",
              padding: "12px",
              borderRadius: "8px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
              minWidth: "160px",
            }}
          >
            <div className="text-xs font-bold text-gray-300 mb-2 border-b border-gray-700 pb-1">
              {localInspectedBody.label}
            </div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-gray-500">Mass:</span>
              <span className="text-white font-mono">{localInspectedBody.mass.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-gray-500">Velocity:</span>
              <span className="text-cyan-400 font-mono">{localInspectedBody.velMag.toFixed(2)} px/t</span>
            </div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-gray-500">Pos:</span>
              <span className="text-white font-mono">
                {Math.round(localInspectedBody.posX)}, {Math.round(localInspectedBody.posY)}
              </span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-gray-500">Angle:</span>
              <span className="text-white font-mono">
                {((localInspectedBody.angle * 180) / Math.PI).toFixed(0)}°
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }
);

PhysicsCanvas.displayName = "PhysicsCanvas";
export default PhysicsCanvas;
