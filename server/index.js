const express = require("express");
const http = require("http");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
const connectDB = require("./config/db.js");
const { Server } = require("socket.io");

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

// 🔒 Allowed frontend origins (dev + production)
const allowedOrigins = [
  "http://localhost:3000", // React dev
  "https://teal-trifle-7f9ade.netlify.app", // 🔁 REPLACE with your exact Netlify URL
];

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // allow REST tools like Thunder/Postman (no origin) and our allowed frontends
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json());

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded files statically
app.use("/uploads", express.static(uploadsDir));

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/messages", require("./routes/messageRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
  },
});

app.set("io", io); // ✅ make io available inside controllers via req.app

// Helper function to toggle reaction
const toggleReaction = async (messageId, userId, emoji) => {
  try {
    const Message = require("./models/Message");
    const message = await Message.findById(messageId);
    
    if (!message) {
      throw new Error("Message not found");
    }

    // Check if user already reacted with this emoji
    const existingReactionIndex = message.reactions.findIndex(
      (reaction) => reaction.userId.toString() === userId.toString() && reaction.emoji === emoji
    );

    if (existingReactionIndex !== -1) {
      // Remove existing reaction
      message.reactions.splice(existingReactionIndex, 1);
    } else {
      // Add new reaction
      message.reactions.push({
        emoji,
        userId,
        createdAt: new Date()
      });
    }

    await message.save();
    return message.reactions;
  } catch (error) {
    console.error("Error toggling reaction:", error);
    throw error;
  }
};

io.on("connection", (socket) => {
  console.log("⚡ A student/mentor connected to socket:", socket.id);

  // Join main group room
  socket.join("superpaac-group");

  // Handle user authentication and join user-specific room for notifications
  socket.on("authenticate", async (data) => {
    try {
      const jwt = require("jsonwebtoken");
      const User = require("./models/User");
      
      const { token } = data;
      if (!token) return;
      
      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      if (user) {
        // Store user info on socket
        socket.userId = user._id.toString();
        socket.userRole = user.role;
        
        // Join user-specific room for notifications
        socket.join(`user:${user._id}`);
        
        console.log(`🔐 User ${user.username} (${user.role}) authenticated and joined notification room`);
        
        // Send initial notification count
        const Notification = require("./models/Notification");
        const unreadCount = await Notification.getUnreadCount(user._id);
        socket.emit("notification:unread-count", { unreadCount });
      }
    } catch (error) {
      console.error("Socket authentication error:", error);
    }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    if (socket.userId) {
      console.log(`🔌 User ${socket.userId} disconnected from socket`);
    } else {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    }
  });

  // Listen to new chat message
  socket.on("chatMessage", (msg) => {
    // Broadcast instantly to everyone in group
    io.to("superpaac-group").emit("newMessage", msg);
  });
  // New: Listen to soft delete broadcast
socket.on("messageSoftDeleted", (id) => {
  io.to("superpaac-group").emit("messageSoftDeleted", id);
});

  // Typing indicator events
  socket.on("typing", (data) => {
    const { roomId, userId, role, displayName } = data;
    // Broadcast to all other users in the same room
    socket.to(roomId || "superpaac-group").emit("user:typing", {
      userId,
      role,
      displayName
    });
  });

  socket.on("stop_typing", (data) => {
    const { roomId, userId } = data;
    // Broadcast to all other users in the same room
    socket.to(roomId || "superpaac-group").emit("user:stop_typing", {
      userId
    });
  });

  // Message reaction event
  socket.on("message:react", async (data) => {
    try {
      console.log("Received reaction request:", data);
      const { roomId, messageId, emoji, userId } = data;
      
      // Validate required fields
      if (!roomId || !messageId || !emoji || !userId) {
        console.error("Missing required fields for reaction:", data);
        return;
      }

      console.log("Toggling reaction for:", { messageId, userId, emoji });
      
      // Toggle the reaction
      const updatedReactions = await toggleReaction(messageId, userId, emoji);

      console.log("Updated reactions:", updatedReactions);

      // Broadcast updated reactions to all clients in the room
      io.to(roomId).emit("message:reactionUpdated", {
        messageId,
        reactions: updatedReactions.map(r => ({
          emoji: r.emoji,
          userId: r.userId.toString(),
          createdAt: r.createdAt
        }))
      });

      console.log("Broadcasted reaction update to room:", roomId);

    } catch (error) {
      console.error("Error handling reaction:", error);
      socket.emit("error", { message: "Failed to update reaction" });
    }
  });

  // Message pin/unpin event
  socket.on("message:pinToggle", async (data) => {
    try {
      console.log("Received pin toggle request:", data);
      const { roomId, messageId, pin, userId } = data;

      if (!roomId || !messageId || typeof pin === 'undefined' || !userId) {
        console.error("Missing required fields for pin toggle:", data);
        return;
      }

      // Verify user exists and has privileged role
      const User = require("./models/User");
      const Message = require("./models/Message");
      const user = await User.findById(userId);
      if (!user) {
        console.error("Pin toggle: user not found", userId);
        return;
      }

      const privileged = ["teacher", "admin", "mentor"];
      if (!privileged.includes(user.role)) {
        console.error("User not allowed to pin/unpin:", userId, user.role);
        // Optionally notify the requesting socket
        socket.emit("error", { message: "Not authorized to pin messages" });
        return;
      }

      const message = await Message.findById(messageId);
      if (!message) {
        console.error("Pin toggle: message not found", messageId);
        return;
      }

      if (pin) {
        message.isPinned = true;
        message.pinnedAt = new Date();
        message.pinnedBy = user._id;
      } else {
        message.isPinned = false;
        message.pinnedAt = null;
        message.pinnedBy = null;
      }

      await message.save();

      // 🔔 NOTIFICATIONS: Create notifications for pinned announcements
      if (pin) {
        try {
          const { createNotificationsForUsers } = require("./controllers/notificationController");
          const User = require("./models/User");
          
          // Get all users except the one who pinned the message
          const allUsers = await User.find({ _id: { $ne: userId } }).select('_id role');
          const userIds = allUsers.map(u => u._id);
          
          if (userIds.length > 0) {
            // Truncate message text for notification
            const messageText = message.text.length > 100 
              ? message.text.substring(0, 100) + "..." 
              : message.text;
            
            await createNotificationsForUsers(
              userIds,
              {
                type: "PINNED_ANNOUNCEMENT",
                title: "📌 New Pinned Announcement",
                message: `${user.role === 'admin' ? 'Admin' : 'Teacher'} pinned: ${messageText}`,
                roomId,
                messageId
              },
              io // Pass io instance for real-time notifications
            );
            
            console.log(`📩 Created pinned announcement notifications for ${userIds.length} users`);
          }
        } catch (notificationError) {
          console.error("Error creating pinned message notifications:", notificationError);
          // Don't fail the pin operation if notifications fail
        }
      }

      io.to(roomId).emit("message:pinnedUpdated", {
        roomId,
        messageId,
        isPinned: message.isPinned,
        pinnedAt: message.pinnedAt,
        pinnedBy: message.pinnedBy ? message.pinnedBy.toString() : null
      });

      console.log("Broadcasted pin update for message:", messageId, "pin:", pin);
    } catch (err) {
      console.error("Error handling pin toggle:", err);
      socket.emit("error", { message: "Failed to toggle pin" });
    }
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
