import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import Razorpay from "razorpay";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Memory storage
const tickets = {}; // ticketId => { creator, expiresAt, status, roomId }
const rooms = {};   // roomId => [ {id, username} ]

// Step 1: Create Razorpay order
app.post("/create-ticket", async (req, res) => {
  try {
    const { creatorName } = req.body;
    const order = await razorpay.orders.create({
      amount: 100000, // ₹1000
      currency: "INR",
      receipt: uuidv4(),
    });
    res.json({ order, creatorName });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Step 2: Confirm payment and issue ticket
app.post("/confirm-ticket", (req, res) => {
  const { creatorName } = req.body;
  const ticketId = "TCK-" + Math.floor(100000 + Math.random() * 900000);
  const roomId = uuidv4();

  tickets[ticketId] = {
    creator: creatorName,
    expiresAt: Date.now() + 60 * 60 * 1000,
    status: "active",
    roomId,
  };

  // Auto-expire after 1 hour
  setTimeout(() => {
    if (tickets[ticketId]?.status === "active") {
      tickets[ticketId].status = "expired";
      io.to(roomId).emit("system", "Ticket expired. Chat closed.");
      io.to(roomId).disconnectSockets(true);
    }
  }, 60 * 60 * 1000);

  res.json({ ticketId, roomId });
});

// Step 3: Delete ticket (creator only)
app.post("/delete-ticket", (req, res) => {
  const { ticketId, username } = req.body;
  const ticket = tickets[ticketId];
  if (ticket && ticket.creator === username) {
    ticket.status = "deleted";
    io.to(ticket.roomId).emit("system", "Ticket deleted by creator.");
    io.to(ticket.roomId).disconnectSockets(true);
    return res.json({ success: true });
  }
  res.status(403).json({ error: "Not allowed" });
});

// WebSocket events
io.on("connection", (socket) => {
  console.log("🔌 Client connected:", socket.id);

  socket.on("join", ({ ticketId, username }) => {
    const ticket = tickets[ticketId];
    if (!ticket || ticket.status !== "active" || Date.now() > ticket.expiresAt) {
      socket.emit("system", "Invalid or expired ticket.");
      socket.disconnect();
      return;
    }

    socket.join(ticket.roomId);
    if (!rooms[ticket.roomId]) rooms[ticket.roomId] = [];
    rooms[ticket.roomId].push({ id: socket.id, username });

    io.to(ticket.roomId).emit("system", `${username} joined chat`);
    io.to(ticket.roomId).emit("users", rooms[ticket.roomId]);
  });

  socket.on("message", ({ ticketId, username, text }) => {
    const ticket = tickets[ticketId];
    if (!ticket) return;
    io.to(ticket.roomId).emit("message", { id: Date.now(), username, text });
  });

  socket.on("disconnect", () => {
    for (const roomId in rooms) {
      rooms[roomId] = rooms[roomId].filter((u) => u.id !== socket.id);
    }
  });
});

httpServer.listen(process.env.PORT || 5000, () => {
  console.log("🚀 Server running on port", process.env.PORT || 5000);
});
