const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },

    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    senderRole: { type: String, enum: ["student", "teacher", "admin"], required: true },

    senderName: { type: String }, // only for teacher/admin

    reactions: [
      {
        emoji: { type: String, required: true },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        createdAt: { type: Date, default: Date.now }
      }
    ],

    // Pin / announcement support
    isPinned: { type: Boolean, default: false },
    pinnedAt: { type: Date },
    pinnedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // File attachments
    attachments: [
      {
        url: { type: String, required: true },
        originalName: { type: String, required: true },
        mimeType: { type: String, required: true },
        size: { type: Number, required: true },
        type: { type: String, enum: ["image", "file"], required: true }
      }
    ],

    // 🔥 New fields for soft delete
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { 
      type: String, 
      enum: ["teacher", "admin"]  // we store who deleted it
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", MessageSchema);
