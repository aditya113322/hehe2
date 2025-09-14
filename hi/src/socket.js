import { io } from "socket.io-client";

const SOCKET_URL = "https://hehe2-1cz3.onrender.com"; // change when deployed

export const socket = io(SOCKET_URL, {
<<<<<<< HEAD
  transports: ["websocket"],
  autoConnect: false,
=======
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
>>>>>>> d00a03ac40041cad889a30aa27b8e5dd7b6c4617
});
