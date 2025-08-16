// src/socket.js
import { io } from "socket.io-client";

const SOCKET_URL = "https://hehe2-g9yy.onrender.com";

export const socket = io(SOCKET_URL, {
  transports: ["websocket", "polling"],
  timeout: 20000,
  forceNew: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
  maxReconnectionAttempts: 5
});

// Add connection debugging
socket.on('connect', () => {
  console.log('✅ Socket connected:', socket.id);
  console.log('🔗 Transport:', socket.io.engine.transport.name);
});

socket.on('connect_error', (error) => {
  console.error('❌ Socket connection error:', error);
});

socket.on('disconnect', (reason) => {
  console.log('❌ Socket disconnected:', reason);
});
