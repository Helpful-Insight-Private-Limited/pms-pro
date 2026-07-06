"use client";

import { io, type Socket } from "socket.io-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4100";

let socket: Socket | null = null;

export function getRealtimeSocket() {
  if (typeof window === "undefined") return null;

  const token = window.localStorage.getItem("pms.accessToken");
  if (!token) return null;

  if (!socket) {
    socket = io(API_URL, {
      autoConnect: false,
      auth: { token },
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
