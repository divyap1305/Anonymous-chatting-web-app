const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true // Index for faster queries by user
    },
    type: {
      type: String,
      enum: ["PINNED_ANNOUNCEMENT", "MENTION", "SYSTEM", "MESSAGE"],
      required: true
    },
    title: {
      type: String,
      required: true,
      maxLength: 100
    },
    message: {
      type: String,
      required: true,
      maxLength: 500
    },
    roomId: {
      type: String,
      default: "superpaac-group" // Default to main room
    },
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      required: false
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true // Index for filtering unread notifications
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true // Index for sorting by date
    }
  },
  {
    timestamps: true
  }
);

// Compound index for efficient user + read status queries
NotificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

// Static method to create a notification for a user
NotificationSchema.statics.createForUser = async function(notificationData) {
  const { userId, type, title, message, roomId = "superpaac-group", messageId } = notificationData;
  
  const notification = new this({
    user: userId,
    type,
    title,
    message,
    roomId,
    messageId
  });
  
  await notification.save();
  return notification.populate('user', 'username role');
};

// Static method to mark notification as read
NotificationSchema.statics.markAsRead = async function(notificationId, userId) {
  return this.findOneAndUpdate(
    { _id: notificationId, user: userId },
    { isRead: true },
    { new: true }
  );
};

// Static method to mark all user notifications as read
NotificationSchema.statics.markAllAsRead = async function(userId) {
  return this.updateMany(
    { user: userId, isRead: false },
    { isRead: true }
  );
};

// Static method to get user notifications
NotificationSchema.statics.getUserNotifications = async function(userId, limit = 50) {
  return this.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('messageId', 'text sender')
    .lean();
};

// Static method to get unread count
NotificationSchema.statics.getUnreadCount = async function(userId) {
  return this.countDocuments({ user: userId, isRead: false });
};

module.exports = mongoose.model("Notification", NotificationSchema);