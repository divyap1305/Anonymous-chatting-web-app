const Notification = require("../models/Notification");
const User = require("../models/User");

// Helper function to emit notification via Socket.io
const emitNotificationToUser = (io, userId, notification) => {
  if (io && userId) {
    // Emit to user-specific room
    io.to(`user:${userId}`).emit("notification:new", notification);
  }
};

// Create a new notification for a user
const createNotification = async (notificationData, io = null) => {
  try {
    const { userId, type, title, message, roomId, messageId } = notificationData;
    
    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    // Create notification
    const notification = await Notification.createForUser({
      userId,
      type,
      title,
      message,
      roomId,
      messageId
    });

    console.log(`📩 Created notification for user ${user.username}: ${title}`);

    // Emit real-time notification if Socket.io instance provided
    if (io) {
      emitNotificationToUser(io, userId, notification);
    }

    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
};

// Create notifications for multiple users
const createNotificationsForUsers = async (userIds, notificationData, io = null) => {
  try {
    const notifications = [];
    
    for (const userId of userIds) {
      const notification = await createNotification({
        ...notificationData,
        userId
      }, io);
      notifications.push(notification);
    }
    
    console.log(`📩 Created ${notifications.length} notifications for: ${notificationData.title}`);
    return notifications;
  } catch (error) {
    console.error("Error creating bulk notifications:", error);
    throw error;
  }
};

// Get user notifications
const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const limit = parseInt(req.query.limit) || 50;
    
    const notifications = await Notification.getUserNotifications(userId, limit);
    const unreadCount = await Notification.getUnreadCount(userId);
    
    res.json({
      success: true,
      data: {
        notifications,
        unreadCount
      }
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch notifications"
    });
  }
};

// Mark single notification as read
const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    
    const notification = await Notification.markAsRead(id, userId);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found"
      });
    }
    
    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark notification as read"
    });
  }
};

// Mark all notifications as read
const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const result = await Notification.markAllAsRead(userId);
    
    res.json({
      success: true,
      data: {
        modifiedCount: result.modifiedCount
      }
    });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark notifications as read"
    });
  }
};

// Get unread count
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;
    const unreadCount = await Notification.getUnreadCount(userId);
    
    res.json({
      success: true,
      data: { unreadCount }
    });
  } catch (error) {
    console.error("Error getting unread count:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get unread count"
    });
  }
};

module.exports = {
  createNotification,
  createNotificationsForUsers,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadCount,
  emitNotificationToUser
};