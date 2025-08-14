import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Room-wise user list
const rooms = {};

io.on("connection", (socket) => {
  console.log("🔌 Client connected:", socket.id);

  let currentRoom = null;
  let currentUser = null;

  // Join room
  socket.on("join", ({ room, username }) => {
    currentRoom = room;
    currentUser = username;

    socket.join(room);

    if (!rooms[room]) rooms[room] = [];
    rooms[room].push({ id: socket.id, username });

    io.to(room).emit("system", `${username} joined the room`);
    io.to(room).emit("users", rooms[room]);

    console.log(`✅ ${username} joined ${room}`);
  });

  // Handle messages
  socket.on("message", (text, ack) => {
    if (!currentRoom || !currentUser) return;

    const payload = {
      id: Date.now(),
      username: currentUser,
      text,
    };
    io.to(currentRoom).emit("message", payload);

    if (ack) ack("delivered");
  });

  // Typing indicator
  socket.on("typing", (isTyping) => {
    if (currentRoom && currentUser) {
      socket.to(currentRoom).emit("typing", {
        username: currentUser,
        isTyping,
      });
    }
  });

  // Switch rooms
  socket.on("switch-room", (nextRoom) => {
    if (currentRoom) {
      socket.leave(currentRoom);
      rooms[currentRoom] = rooms[currentRoom].filter((u) => u.id !== socket.id);
      io.to(currentRoom).emit("users", rooms[currentRoom]);
      io.to(currentRoom).emit("system", `${currentUser} left the room`);
    }

    currentRoom = nextRoom;
    socket.join(nextRoom);

    if (!rooms[nextRoom]) rooms[nextRoom] = [];
    rooms[nextRoom].push({ id: socket.id, username: currentUser });

    io.to(nextRoom).emit("users", rooms[nextRoom]);
    io.to(nextRoom).emit("system", `${currentUser} joined ${nextRoom}`);
  });

  // Disconnect
  socket.on("disconnect", () => {
    if (currentRoom && rooms[currentRoom]) {
      rooms[currentRoom] = rooms[currentRoom].filter((u) => u.id !== socket.id);
      io.to(currentRoom).emit("users", rooms[currentRoom]);
      io.to(currentRoom).emit("system", `${currentUser} left the room`);
    }
    console.log("❌ Client disconnected:", socket.id);
  });
});

httpServer.listen(5000, () => {
  console.log("🚀 Server running at http://localhost:5000");
});
