const express = require("express");
const { 
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadCount
} = require("../controllers/notificationController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// All notification routes are protected and require authentication
router.get("/", protect, getUserNotifications);                    // GET  /api/notifications
router.get("/unread-count", protect, getUnreadCount);              // GET  /api/notifications/unread-count
router.post("/:id/read", protect, markNotificationAsRead);         // POST /api/notifications/:id/read
router.post("/read-all", protect, markAllNotificationsAsRead);     // POST /api/notifications/read-all

module.exports = router;