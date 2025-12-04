// src/components/NotificationCenter.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { useTheme } from '../contexts/ThemeContext';

const NotificationCenter = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasRequestedPermission, setHasRequestedPermission] = useState(false);
  const dropdownRef = useRef(null);
  const { theme } = useTheme();
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    requestNotificationPermission
  } = useNotifications();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Request browser notification permission on first open
  const handleToggleDropdown = async () => {
    console.log('🔔 Toggle dropdown clicked, current state:', isOpen);
    setIsOpen(!isOpen);
    
    if (!isOpen && !hasRequestedPermission) {
      const granted = await requestNotificationPermission();
      setHasRequestedPermission(true);
      
      if (granted) {
        console.log('🔔 Browser notifications enabled');
      }
    }
  };

  // Handle notification click
  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      await markAsRead(notification._id);
    }
    
    // Optionally navigate to related content
    if (notification.roomId && notification.messageId) {
      // You can implement navigation logic here
      console.log('Navigate to message:', notification.messageId, 'in room:', notification.roomId);
    }
  };

  // Format relative time
  const formatTime = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'PINNED_ANNOUNCEMENT':
        return '📌';
      case 'MENTION':
        return '@';
      case 'SYSTEM':
        return '⚙️';
      default:
        return '💬';
    }
  };

  return (
    <div className="notification-center" ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Notification Bell Icon */}
      <button
        onClick={handleToggleDropdown}
        className="notification-bell"
        style={{
          position: 'relative',
          background: 'none',
          border: `2px solid ${theme.colors.border}`,
          fontSize: '20px',
          cursor: 'pointer',
          padding: '8px',
          borderRadius: '50%',
          transition: 'background-color 0.2s',
          backgroundColor: theme.colors.surface,
          color: theme.colors.textPrimary,
        }}
        onMouseOver={(e) => e.target.style.backgroundColor = theme.colors.borderLight}
        onMouseOut={(e) => e.target.style.backgroundColor = theme.colors.surface}
      >
        🔔
        {unreadCount > 0 && (
          <span
            className="notification-badge"
            style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              background: '#ff4757',
              color: 'white',
              borderRadius: '10px',
              padding: '2px 6px',
              fontSize: '12px',
              fontWeight: 'bold',
              minWidth: '18px',
              textAlign: 'center',
              lineHeight: '14px'
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div
          className="notification-dropdown"
          style={{
            position: 'absolute',
            top: '100%',
            right: '0',
            width: '350px',
            maxHeight: '400px',
            backgroundColor: theme.colors.notificationBackground,
            border: `1px solid ${theme.colors.notificationBorder}`,
            borderRadius: '8px',
            boxShadow: `0 4px 12px ${theme.colors.shadowDark}`,
            zIndex: 1000,
            overflowY: 'auto'
          }}
          onClick={(e) => e.stopPropagation()} // Prevent dropdown close when clicking inside
        >
          {/* Header */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: `1px solid ${theme.colors.notificationBorder}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: theme.colors.textPrimary }}>
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: theme.colors.primary,
                  cursor: 'pointer',
                  fontSize: '14px',
                  padding: '4px 8px',
                  borderRadius: '4px'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = theme.colors.notificationHover}
                onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
            {(() => {
              console.log('🔔 Rendering notifications:', { 
                loading, 
                notificationsCount: notifications?.length || 0, 
                notifications: notifications?.slice(0, 2) || [] // Show first 2 for debugging
              });
              
              if (loading) {
                return (
                  <div style={{ padding: '20px', textAlign: 'center', color: theme.colors.textSecondary }}>
                    Loading notifications...
                  </div>
                );
              }
              
              if (!notifications || notifications.length === 0) {
                return (
                  <div style={{ padding: '20px', textAlign: 'center', color: theme.colors.textSecondary }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔔</div>
                    <div>No notifications yet</div>
                    <div style={{ fontSize: '12px', marginTop: '4px', color: theme.colors.textMuted }}>
                      Debug: unreadCount={unreadCount}, loading={loading}
                    </div>
                  </div>
                );
              }
              
              return notifications.map((notification) => (
                <div
                  key={notification._id}
                  onClick={() => handleNotificationClick(notification)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: `1px solid ${theme.colors.borderLight}`,
                    cursor: 'pointer',
                    backgroundColor: notification.isRead ? 'transparent' : theme.colors.notificationUnread,
                    transition: 'background-color 0.2s',
                    position: 'relative'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.backgroundColor = notification.isRead ? theme.colors.notificationHover : theme.colors.primaryLight;
                  }}
                  onMouseOut={(e) => {
                    e.target.style.backgroundColor = notification.isRead ? 'transparent' : theme.colors.notificationUnread;
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <span style={{ fontSize: '16px', marginTop: '2px' }}>
                      {getNotificationIcon(notification.type)}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: '14px',
                          fontWeight: notification.isRead ? '400' : '600',
                          marginBottom: '4px',
                          color: theme.colors.textPrimary
                        }}
                      >
                        {notification.title}
                      </div>
                      <div
                        style={{
                          fontSize: '13px',
                          color: theme.colors.textSecondary,
                          lineHeight: '1.4',
                          marginBottom: '4px'
                        }}
                      >
                        {notification.message}
                      </div>
                      <div style={{ fontSize: '12px', color: theme.colors.textMuted }}>
                        {formatTime(notification.createdAt)}
                      </div>
                    </div>
                    {!notification.isRead && (
                      <div
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: theme.colors.primary,
                          marginTop: '6px'
                        }}
                      />
                    )}
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;