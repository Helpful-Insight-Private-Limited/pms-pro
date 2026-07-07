"use client";

import { io, type Socket } from "socket.io-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4100";
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL;
const SOCKET_PATH = process.env.NEXT_PUBLIC_SOCKET_PATH ?? "/socket.io";

let socket: Socket | null = null;

function getSocketUrl() {
  if (SOCKET_URL) return SOCKET_URL;

  try {
    return new URL(API_URL).origin;
  } catch {
    return window.location.origin;
  }
}

export function getRealtimeSocket() {
  if (typeof window === "undefined") return null;

  const token = window.localStorage.getItem("pms.accessToken");
  if (!token) return null;

  if (!socket) {
    socket = io(getSocketUrl(), {
      autoConnect: false,
      auth: { token },
      path: SOCKET_PATH,
      transports: ["websocket", "polling"]
    });
  } else {
    socket.auth = { token };
  }

  if (!socket.connected) socket.connect();
  return socket;
}

export function disconnectRealtimeSocket() {
  socket?.disconnect();
  socket = null;
}
