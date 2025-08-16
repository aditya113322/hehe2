// src/socket.js
import { io } from "socket.io-client";

const SOCKET_URL = "https://hehe2-g9yy.onrender.com";

export const socket = io(SOCKET_URL, {
  transports: ["websocket"],
});
