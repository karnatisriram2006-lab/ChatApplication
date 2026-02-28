const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // More permissive for development
  },
});

// In-memory message store: { roomId: Message[] }
const messagesStore = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join_room", (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room: ${roomId}`);

    // Send existing messages for this room to the joining user
    const roomMessages = messagesStore[roomId] || [];
    socket.emit("load_messages", roomMessages);
  });

  socket.on("send_message", (data) => {
    console.log("Message received:", data);

    // Save message to in-memory store
    if (!messagesStore[data.roomId]) {
      messagesStore[data.roomId] = [];
    }
    messagesStore[data.roomId].push(data);

    // Broadcast to others in the room
    socket.to(data.roomId).emit("receive_message", data);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

server.listen(5001, () => {
  console.log("Server running on port 5001");
});