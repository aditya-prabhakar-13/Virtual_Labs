"use client";

import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io({
      transports: ["websocket", "polling"],
      autoConnect: false,
    });
  }
  return socket;
}

export function connectSocket(): Socket {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

// Types for room events
export interface RoomUser {
  id: string;
  username: string;
}

export interface RoomJoinedPayload {
  roomId: string;
  isHost: boolean;
  hostId: string;
  users: RoomUser[];
}

export interface RoomUsersPayload {
  users: RoomUser[];
  hostId: string;
  userCount: number;
}

// Types for physics sync
export interface BodySnapshot {
  id: number;
  label: string;
  posX: number;
  posY: number;
  angle: number;
  velX: number;
  velY: number;
  angularVel: number;
  isStatic: boolean;
  shapeType: string; // 'circle' | 'rectangle' | 'polygon'
  circleRadius?: number;
  width?: number;
  height?: number;
  sides?: number;
  fillStyle: string;
  strokeStyle: string;
  // Material properties (Task 10)
  mass?: number;
  friction?: number;
  frictionStatic?: number;
  frictionAir?: number;
  restitution?: number;
}

export interface ConstraintSnapshot {
  id: number;
  bodyAId: number | null;
  bodyBId: number | null;
  pointBX?: number;
  pointBY?: number;
  stiffness: number;
  damping: number;
  length: number;
  strokeStyle: string;
  lineWidth: number;
  constraintType?: string; // 'rope' | 'spring' | 'pivot'
}

export interface PhysicsSnapshot {
  bodies: BodySnapshot[];
  constraints: ConstraintSnapshot[];
  timestamp: number;
}

export interface PhysicsAction {
  type: "spawn" | "delete" | "constraint" | "reset";
  payload: any;
}
