import { io } from "socket.io-client";

const SOCKET_URL = "https://hehe2-1cz3.onrender.com"; // change when deployed

export const socket = io(SOCKET_URL, {
  transports: ["websocket"],
  autoConnect: false,
});
