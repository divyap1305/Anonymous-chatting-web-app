// src/contexts/NotificationContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import api from '../api';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // Show browser notification
  const showBrowserNotification = useCallback((notification) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico', // Use your app's icon
        badge: '/favicon.ico',
        tag: notification._id, // Prevent duplicate notifications
      });

      browserNotification.onclick = () => {
        window.focus();
        browserNotification.close();
        
        // Optionally navigate to the related message/room
        if (notification.roomId && notification.messageId) {
          // You can implement navigation logic here
          console.log('Navigate to:', notification.roomId, notification.messageId);
        }
      };

      // Auto-close after 5 seconds
      setTimeout(() => {
        browserNotification.close();
      }, 5000);
    }
  }, []);

  // Initialize Socket.io connection
  const initializeSocket = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "http://localhost:5000";
    const newSocket = io(SOCKET_URL);

    newSocket.on('connect', () => {
      console.log('🔔 Notification socket connected');
      setIsConnected(true);
      
      // Authenticate with token
      newSocket.emit('authenticate', { token });
    });

    newSocket.on('disconnect', () => {
      console.log('🔔 Notification socket disconnected');
      setIsConnected(false);
    });

    // Listen for new notifications
    newSocket.on('notification:new', (notification) => {
      console.log('🔔 New notification received:', notification);
      
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Show browser notification if permission granted
      showBrowserNotification(notification);
    });

    // Listen for unread count updates
    newSocket.on('notification:unread-count', (data) => {
      setUnreadCount(data.unreadCount);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [showBrowserNotification]);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔔 Fetching notifications...');
      const response = await api.get('/notifications');
      
      console.log('🔔 Notifications response:', response.data);
      
      if (response.data.success) {
        setNotifications(response.data.data.notifications || []);
        setUnreadCount(response.data.data.unreadCount || 0);
        console.log('🔔 Set notifications:', response.data.data.notifications?.length || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Mark single notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      const response = await api.post(`/notifications/${notificationId}/read`);
      
      if (response.data.success) {
        setNotifications(prev => 
          prev.map(notification => 
            notification._id === notificationId 
              ? { ...notification, isRead: true }
              : notification
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
        return true;
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await api.post('/notifications/read-all');
      
      if (response.data.success) {
        setNotifications(prev => 
          prev.map(notification => ({ ...notification, isRead: true }))
        );
        setUnreadCount(0);
        return true;
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
  }, []);

  // Request browser notification permission
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      }
      return Notification.permission === 'granted';
    }
    return false;
  }, []);

  // Initialize on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchNotifications();
      const cleanup = initializeSocket();
      return cleanup;
    }
  }, [fetchNotifications, initializeSocket]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [socket]);

  // Provide notification count for external components
  const getUnreadCount = useCallback(() => {
    return notifications.filter(n => !n.isRead).length;
  }, [notifications]);

  const value = {
    notifications,
    unreadCount,
    loading,
    isConnected,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    requestNotificationPermission,
    getUnreadCount
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};