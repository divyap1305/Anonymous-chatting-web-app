const express = require("express");
const http = require("http");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db.js");
const { Server } = require("socket.io");

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/messages", require("./routes/messageRoutes"));

// Socket.io setup
const io = new Server(server, { cors: { origin: "*", } ,});

io.on("connection", (socket) => {
  console.log("⚡ A student/mentor connected to socket:", socket.id);

  // Join main group room
  socket.join("superpaac-group");

  // Listen to new chat message
  socket.on("chatMessage", (msg) => {
    // Broadcast instantly to everyone in group
    io.to("superpaac-group").emit("newMessage", msg);
  });

  // Mentor/Admin delete message event
  socket.on("deleteMessage", (id) => {
    io.to("superpaac-group").emit("messageDeleted", id);
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ MongoDB connected`);
});
