// models/Message.js
const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    senderRole: {
      type: String,
      enum: ["student", "teacher", "admin"],
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", MessageSchema);
