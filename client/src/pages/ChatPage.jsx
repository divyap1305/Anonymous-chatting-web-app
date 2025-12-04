// src/pages/ChatPage.jsx
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import api from "../api";
import NotificationCenter from "../components/NotificationCenter";
import ThemeToggle from "../components/ThemeToggle";
import { useTheme } from "../contexts/ThemeContext";

const SOCKET_URL =
  process.env.REACT_APP_SOCKET_URL || "http://localhost:5000";

let socket; // global within this module to avoid multiple connections

function ChatPage() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]); // Array of users currently typing
  const [isTyping, setIsTyping] = useState(false); // Current user typing status
  const [contextMenu, setContextMenu] = useState({ show: false, messageId: null, x: 0, y: 0 });
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const longPressTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  // Define styles inside component to access theme
  const styles = {
    page: {
      minHeight: "100vh",
      background: theme.colors.chatBackground,
      color: theme.colors.textPrimary,
      display: "flex",
      flexDirection: "column",
    },
    header: {
      padding: "1rem 1.5rem",
      borderBottom: `1px solid ${theme.colors.border}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      background: theme.colors.headerBackground,
      color: theme.colors.headerText,
    },
    logoutButton: {
      padding: "0.4rem 0.8rem",
      borderRadius: "0.5rem",
      border: "none",
      background: theme.colors.danger,
      color: "#f9fafb",
      cursor: "pointer",
      fontSize: "0.9rem",
      fontWeight: 600,
    },
    chatContainer: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      padding: "1rem",
      background: theme.colors.background,
    },
    messagesBox: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      gap: "0.5rem",
      padding: "1rem",
      borderRadius: "1rem",
      border: `1px solid ${theme.colors.border}`,
      background: theme.colors.chatBackground,
      overflowY: "auto",
    },
    message: {
      maxWidth: "70%",
      padding: "0.6rem 0.8rem",
      borderRadius: "0.75rem",
      boxShadow: `0 4px 10px ${theme.colors.shadow}`,
      fontSize: "0.95rem",
      background: theme.colors.messageBackground,
      color: theme.colors.messageText,
    },
    emojiAdder: {
      padding: "0.3rem 0.5rem",
      borderRadius: "50%",
      border: `1px dashed ${theme.colors.textMuted}`,
      background: "transparent",
      color: theme.colors.textMuted,
      fontSize: "0.8rem",
      cursor: "pointer",
      transition: "all 0.2s ease",
      opacity: 0.6,
      minWidth: "32px",
      height: "32px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    messageHeader: {
      display: "flex",
      justifyContent: "space-between",
      marginBottom: "0.25rem",
      fontSize: "0.75rem",
      opacity: 0.9,
      color: theme.colors.senderTextLight,
    },
    sender: {
      fontWeight: 600,
    },
    timestamp: {
      marginLeft: "0.5rem",
    },
    messageText: {
      marginTop: "0.2rem",
    },
    deleteButton: {
      marginTop: "0.3rem",
      padding: "0.2rem 0.5rem",
      borderRadius: "0.4rem",
      border: "none",
      background: theme.colors.danger,
      color: "#f9fafb",
      cursor: "pointer",
      fontSize: "0.7rem",
    },
    inputRow: {
      display: "flex",
      gap: "0.5rem",
      marginTop: "0.75rem",
    },
    inputContainer: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      gap: "0.5rem",
    },
    inputWithButtons: {
      display: "flex",
      gap: "0.5rem",
      alignItems: "flex-end",
    },
    hiddenFileInput: {
      display: "none",
    },
    attachButton: {
      padding: "0.7rem",
      borderRadius: "0.75rem",
      border: `1px solid ${theme.colors.border}`,
      background: theme.colors.surface,
      color: theme.colors.textSecondary,
      cursor: "pointer",
      fontSize: "1.2rem",
      transition: "all 0.2s ease",
    },
    input: {
      flex: 1,
      padding: "0.7rem 0.9rem",
      borderRadius: "0.75rem",
      border: `1px solid ${theme.colors.inputBorder}`,
      background: theme.colors.inputBackground,
      color: theme.colors.inputText,
    },
    sendButton: {
      padding: "0.7rem 1.2rem",
      borderRadius: "0.75rem",
      border: "none",
      background: theme.colors.success,
      color: "#ffffff",
      fontWeight: 700,
      cursor: "pointer",
    },
    typingBanner: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0.5rem 0.75rem",
      marginTop: "0.5rem",
      borderRadius: "0.5rem",
      background: theme.colors.surface,
      border: `1px solid ${theme.colors.border}`,
      fontSize: "0.85rem",
      color: theme.colors.textSecondary,
      fontStyle: "italic",
    },
    typingText: {
      flex: 1,
    },
    typingDots: {
      marginLeft: "0.5rem",
      animation: "pulse 1.5s ease-in-out infinite",
      color: theme.colors.textMuted,
    },
    daySeparator: {
      display: "flex",
      alignItems: "center",
      margin: "1rem 0",
      gap: "0.75rem",
    },
    daySeparatorLine: {
      flex: 1,
      height: "1px",
      background: theme.colors.border,
    },
    daySeparatorText: {
      fontSize: "0.8rem",
      color: theme.colors.textSecondary,
      fontWeight: 500,
      padding: "0.25rem 0.75rem",
      background: theme.colors.surface,
      borderRadius: "1rem",
      whiteSpace: "nowrap",
    },
    // WhatsApp-style pinned banner styles
    whatsappPinnedBanner: {
      background: theme.colors.pinnedBackground,
      borderBottom: `1px solid ${theme.colors.pinnedBorder}`,
      marginBottom: "0.5rem",
    },
    pinnedBannerContent: {
      display: "flex",
      alignItems: "center",
      padding: "12px 16px",
      cursor: "pointer",
      transition: "background 0.2s ease",
    },
    pinnedIcon: {
      fontSize: "16px",
      marginRight: "12px",
      color: theme.colors.success,
    },
    pinnedPreview: {
      flex: 1,
      minWidth: 0,
    },
    pinnedPreviewText: {
      fontSize: "14px",
      color: theme.colors.pinnedText,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    },
    pinnedArrow: {
      fontSize: "12px",
      color: theme.colors.textSecondary,
      marginLeft: "8px",
    },
    expandedPinnedList: {
      borderTop: `1px solid ${theme.colors.pinnedBorder}`,
      maxHeight: "200px",
      overflowY: "auto",
    },
    expandedPinnedItem: {
      padding: "12px 16px",
      borderBottom: `1px solid ${theme.colors.border}`,
    },
    expandedPinnedHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "4px",
    },
    expandedPinnedSender: {
      fontSize: "12px",
      color: theme.colors.success,
      fontWeight: 600,
    },
    expandedPinnedTime: {
      fontSize: "11px",
      color: theme.colors.textMuted,
    },
    expandedPinnedText: {
      fontSize: "14px",
      color: theme.colors.pinnedText,
      lineHeight: "1.4",
    },
    pinnedIndicator: {
      fontSize: "12px",
      color: theme.colors.pinnedIndicatorColor,
      fontWeight: 500,
      marginBottom: "4px",
      display: "flex",
      alignItems: "center",
      gap: "4px",
      opacity: 0.9,
    },
    reactionsContainer: {
      marginTop: "0.5rem",
      position: "relative",
    },
    reactionsRow: {
      display: "flex",
      flexWrap: "wrap",
      gap: "0.25rem",
      alignItems: "center",
    },
    reactionChip: {
      display: "flex",
      alignItems: "center",
      gap: "0.25rem",
      padding: "0.15rem 0.4rem",
      borderRadius: "0.75rem",
      fontSize: "0.75rem",
      cursor: "pointer",
      transition: "all 0.2s ease",
      background: theme.colors.surface,
      border: `1px solid ${theme.colors.border}`,
      color: theme.colors.textPrimary,
    },
    reactionEmoji: {
      fontSize: "0.8rem",
    },
    reactionCount: {
      fontSize: "0.7rem",
      fontWeight: 500,
    },
    addReactionButton: {
      padding: "0.15rem 0.4rem",
      borderRadius: "0.75rem",
      fontSize: "0.7rem",
      cursor: "pointer",
      background: "transparent",
      border: `1px dashed ${theme.colors.textMuted}`,
      color: theme.colors.textMuted,
      transition: "all 0.2s ease",
    },
    reactionPicker: {
      display: "flex",
      gap: "0.25rem",
      padding: "0.75rem",
      background: theme.colors.surface,
      border: `2px solid ${theme.colors.border}`,
      borderRadius: "0.75rem",
      boxShadow: `0 8px 24px ${theme.colors.shadowDark}`,
      zIndex: 9999,
    },
    reactionPickerEmoji: {
      padding: "0.5rem",
      borderRadius: "0.5rem",
      fontSize: "1.25rem",
      cursor: "pointer",
      background: theme.colors.paper,
      border: `1px solid ${theme.colors.border}`,
      transition: "all 0.2s ease",
      minWidth: "40px",
      height: "40px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    // File attachment styles
    filePreviewContainer: {
      display: "flex",
      flexWrap: "wrap",
      gap: "0.5rem",
      marginBottom: "0.5rem",
    },
    filePreviewItem: {
      position: "relative",
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      padding: "0.5rem",
      background: theme.colors.surface,
      borderRadius: "0.5rem",
      border: `1px solid ${theme.colors.border}`,
      maxWidth: "200px",
    },
    previewImage: {
      width: "40px",
      height: "40px",
      objectFit: "cover",
      borderRadius: "0.25rem",
    },
    previewFile: {
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
    },
    previewFileName: {
      fontSize: "0.8rem",
      color: theme.colors.textSecondary,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
    removeFileButton: {
      position: "absolute",
      top: "-5px",
      right: "-5px",
      width: "20px",
      height: "20px",
      borderRadius: "50%",
      background: theme.colors.danger,
      color: "white",
      border: "none",
      fontSize: "12px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    attachmentsContainer: {
      marginTop: "0.5rem",
      display: "flex",
      flexDirection: "column",
      gap: "0.5rem",
    },
    attachmentItem: {
      display: "flex",
    },
    attachmentImage: {
      maxWidth: "300px",
      maxHeight: "200px",
      borderRadius: "0.5rem",
      cursor: "pointer",
      border: `1px solid ${theme.colors.border}`,
    },
    fileAttachment: {
      display: "flex",
      alignItems: "center",
      gap: "0.75rem",
      padding: "0.75rem",
      background: theme.colors.surface,
      borderRadius: "0.5rem",
      border: `1px solid ${theme.colors.border}`,
      cursor: "pointer",
      transition: "background 0.2s ease",
      maxWidth: "300px",
    },
    fileIcon: {
      fontSize: "1.5rem",
    },
    fileInfo: {
      display: "flex",
      flexDirection: "column",
      gap: "0.25rem",
    },
    fileName: {
      fontSize: "0.85rem",
      color: theme.colors.textPrimary,
      fontWeight: 500,
    },
    fileSize: {
      fontSize: "0.75rem",
      color: theme.colors.textSecondary,
    },
  };

  // Scroll to bottom whenever messages change
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Pinned messages state
  const [pinnedExpanded, setPinnedExpanded] = useState(false);

  // Pinned messages derived data
  const pinnedMessages = (messages || [])
    .filter((m) => m.isPinned)
    .sort((a, b) => new Date(b.pinnedAt) - new Date(a.pinnedAt));

  const isPrivileged = (user && ["teacher", "admin", "mentor"].includes(user.role));

  useEffect(scrollToBottom, [messages]);

  // On mount: check auth + load user + connect socket + fetch messages
  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (!token || !storedUser) {
      navigate("/login");
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);

    // 1) Connect socket only once
    if (!socket) {
      socket = io(SOCKET_URL, {
        transports: ["websocket"],
      });

      socket.on("connect", () => {
        console.log("✅ Connected to socket:", socket.id);
        
        // Authenticate for notifications
        const token = localStorage.getItem("token");
        if (token) {
          socket.emit("authenticate", { token });
        }
      });

      // Listen for new messages from server (real-time)
      socket.on("newMessage", (msg) => {
        setMessages((prev) => {
          if (prev.some((m) => m._id === msg._id)) {
            return prev;
          }
          return [...prev, msg];
        });
      });

      // Listen for soft-deleted messages
      socket.on("messageSoftDeleted", (id) => {
        setMessages((prev) =>
          prev.map((m) =>
            m._id === id
              ? {
                  ...m,
                  isDeleted: true,
                  text: "This message was removed by Admin/Teacher",
                  reactions: [], // Clear reactions when message is deleted
                  isPinned: false,
                  pinnedAt: null,
                  pinnedBy: null,
                }
              : m
          )
        );
      });

      // Listen for typing indicators
      socket.on("user:typing", (data) => {
        const { userId, role, displayName } = data;
        setTypingUsers((prev) => {
          // Avoid duplicates
          if (prev.some(user => user.userId === userId)) {
            return prev;
          }
          return [...prev, { userId, role, displayName }];
        });
      });

      socket.on("user:stop_typing", (data) => {
        const { userId } = data;
        setTypingUsers((prev) => prev.filter(user => user.userId !== userId));
      });

      // Listen for reaction updates
      socket.on("message:reactionUpdated", (data) => {
        console.log("Reaction updated received:", data);
        const { messageId, reactions } = data;
        setMessages((prev) => prev.map(msg => 
          msg._id === messageId 
            ? { ...msg, reactions }
            : msg
        ));
      });
      // Listen for pin/unpin updates
      socket.on("message:pinnedUpdated", (data) => {
        console.log("Pinned update received:", data);
        const { messageId, isPinned, pinnedAt, pinnedBy } = data;
        setMessages((prev) => prev.map(msg =>
          msg._id === messageId
            ? { ...msg, isPinned, pinnedAt, pinnedBy }
            : msg
        ));
      });
    }

    // 2) Fetch existing messages from backend
    const fetchMessages = async () => {
      try {
        setLoadingMessages(true);
        const res = await api.get("/messages");
        setMessages(res.data.data || []);
      } catch (err) {
        console.error("Error fetching messages:", err);
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMessages();

    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.off("newMessage");
        socket.off("messageSoftDeleted");
        socket.off("user:typing");
        socket.off("user:stop_typing");
        socket.off("message:reactionUpdated");
        socket.off("message:pinnedUpdated");
        // we are not disconnecting here to allow reuse if needed
      }
      // Clear typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // Clear long press timeout
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
      }
    };
  }, [navigate]);

  // Typing indicator functions
  const getDisplayName = () => {
    if (!user) return "Anonymous";
    if (user.role === "student") return "Anonymous Student";
    return user.name || "User";
  };

  const startTyping = () => {
    if (!isTyping && socket && socket.connected) {
      setIsTyping(true);
      socket.emit("typing", {
        roomId: "superpaac-group",
        userId: user?.id,
        role: user?.role,
        displayName: getDisplayName()
      });
    }
  };

  const stopTyping = () => {
    if (isTyping && socket && socket.connected) {
      setIsTyping(false);
      socket.emit("stop_typing", {
        roomId: "superpaac-group",
        userId: user?.id
      });
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setText(value);

    if (value.trim()) {
      // User is typing
      startTyping();
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set timeout to stop typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping();
      }, 2000);
    } else {
      // Input is empty, stop typing
      stopTyping();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  // Render typing indicator banner
  const renderTypingIndicator = () => {
    if (typingUsers.length === 0) return null;
    
    let message;
    if (typingUsers.length === 1) {
      message = `${typingUsers[0].displayName} is typing...`;
    } else if (typingUsers.length === 2) {
      message = `${typingUsers[0].displayName} and ${typingUsers[1].displayName} are typing...`;
    } else {
      message = "Multiple people are typing...";
    }
    
    return (
      <div style={styles.typingBanner}>
        <span style={styles.typingText}>{message}</span>
        <span style={styles.typingDots}>•••</span>
      </div>
    );
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() && attachedFiles.length === 0) return;
    
    // Allow sending files without text
    if (attachedFiles.length === 0 && !text.trim()) return;

    try {
      setSending(true);
      setUploading(attachedFiles.length > 0);

      if (attachedFiles.length > 0) {
        // Send message with attachments via FormData
        console.log('Sending files:', attachedFiles);
        const formData = new FormData();
        formData.append('text', text.trim() || '');
        formData.append('roomId', 'superpaac-group');
        
        attachedFiles.forEach((file, index) => {
          console.log(`Appending file ${index}:`, file.name, file.type, file.size);
          formData.append('files', file);
        });

        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:5000/api/messages/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        if (!response.ok) {
          const errorData = await response.text();
          console.error('Upload failed:', response.status, errorData);
          throw new Error(`Upload failed: ${response.status}`);
        }

        const result = await response.json();
        console.log('Upload success:', result);
        
        // Message will be added via socket event, no need to update state here
      } else {
        // Send text-only message via existing API
        const res = await api.post("/messages", { text: text.trim() });
        const savedMessage = res.data.data;

        // Update UI immediately (local)
        setMessages((prev) => {
          if (prev.some((m) => m._id === savedMessage._id)) {
            return prev;
          }
          return [...prev, savedMessage];
        });

        // Notify others via socket (if connected)
        if (socket && socket.connected) {
          socket.emit("chatMessage", savedMessage);
        }
      }

      // Clear input and stop typing
      setText("");
      clearAttachments();
      stopTyping();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    } catch (err) {
      console.error("Error sending message:", err);
      const errorMessage = err.message.includes('Upload failed') 
        ? 'Failed to upload files. Please check file size (max 10MB) and type.'
        : 'Failed to send message. Please try again.';
      alert(errorMessage);
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!user || user.role !== "admin") return;

    const confirmDelete = window.confirm("Delete this message?");
    if (!confirmDelete) return;

    try {
      // Call backend to soft-delete in DB
      await api.delete(`/messages/${id}`);

      // Update local state to show soft-deleted placeholder
      setMessages((prev) =>
        prev.map((m) =>
          m._id === id
            ? {
                ...m,
                isDeleted: true,
                text: "🛑 This message was removed by Admin/Teacher",
                reactions: [], // Clear reactions when message is deleted
              }
            : m
        )
      );

      // Inform others via socket (server will broadcast to the group)
      if (socket && socket.connected) {
        socket.emit("messageSoftDeleted", id);
      }
    } catch (err) {
      console.error("Error deleting message:", err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const formatSender = (msg) => {
    if (msg.senderRole === "student") {
      return "Anonymous Student";
    }
    if (msg.senderRole === "teacher") {
      if (msg.sender && msg.sender.name) {
        return msg.sender.name + " (Teacher)";
      }
      return "Teacher";
    }
    // admin
    if (msg.sender && msg.sender.name) {
      return msg.sender.name + " (Admin)";
    }
    return "Admin";
  };

  const isOwnMessage = (msg) => {
    if (!user) return false;
    return msg.sender && msg.sender._id === user.id;
  };

  // Day separator utility functions
  const isSameDay = (date1, date2) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const getDayLabel = (messageDate) => {
    const msgDate = new Date(messageDate);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (isSameDay(msgDate, today)) {
      return "Today";
    } else if (isSameDay(msgDate, yesterday)) {
      return "Yesterday";
    } else {
      return msgDate.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    }
  };

  // Day separator component
  const DaySeparator = ({ label }) => (
    <div style={styles.daySeparator}>
      <div style={styles.daySeparatorLine}></div>
      <span style={styles.daySeparatorText}>{label}</span>
      <div style={styles.daySeparatorLine}></div>
    </div>
  );

  // Generate messages with day separators
  const getMessagesWithSeparators = () => {
    if (!messages.length) return [];
    
    const items = [];
    let lastDate = null;
    
    messages.forEach((msg, index) => {
      const msgDate = new Date(msg.createdAt);
      
      // Check if we need a day separator
      if (!lastDate || !isSameDay(msgDate, lastDate)) {
        const label = getDayLabel(msg.createdAt);
        items.push({
          type: 'separator',
          id: `separator-${index}-${msgDate.toDateString()}`,
          label
        });
        lastDate = msgDate;
      }
      
      // Add the message
      items.push({
        type: 'message',
        id: msg._id,
        data: msg
      });
    });
    
    return items;
  };

  // Reaction utility functions
  const groupReactions = (reactions) => {
    if (!reactions || !Array.isArray(reactions)) return [];
    
    const grouped = {};
    reactions.forEach((reaction) => {
      if (!grouped[reaction.emoji]) {
        grouped[reaction.emoji] = {
          emoji: reaction.emoji,
          count: 0,
          userIds: []
        };
      }
      grouped[reaction.emoji].count++;
      grouped[reaction.emoji].userIds.push(reaction.userId);
    });
    
    return Object.values(grouped);
  };

  const handleReaction = (messageId, emoji) => {
    console.log("HandleReaction called:", { messageId, emoji, user: user?.id, socket: socket?.connected });
    if (!socket || !socket.connected || !user) {
      console.log("Reaction failed: missing requirements");
      return;
    }
    
    console.log("Emitting reaction:", {
      roomId: "superpaac-group",
      messageId,
      emoji,
      userId: user.id
    });
    
    socket.emit("message:react", {
      roomId: "superpaac-group",
      messageId,
      emoji,
      userId: user.id
    });
  };

  const handlePinToggle = (messageId, pin) => {
    if (!socket || !socket.connected || !user) return;
    console.log("Emitting pinToggle", { messageId, pin, userId: user.id });
    socket.emit("message:pinToggle", {
      roomId: "superpaac-group",
      messageId,
      pin,
      userId: user.id
    });
  };

  // File attachment functions
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setAttachedFiles(files);
  };

  const removeAttachedFile = (index) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearAttachments = () => {
    setAttachedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Available emoji reactions
  const availableEmojis = ["👍", "❤️", "😂", "🎉", "😢"];

  // Long press and context menu handlers
  const handleMouseDown = (e, messageId) => {
    if (e.button !== 0) return; // Only handle left mouse button
    
    longPressTimeoutRef.current = setTimeout(() => {
      showReactionPicker(e, messageId);
    }, 500); // 500ms for long press
  };

  const handleMouseUp = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };

  const handleContextMenu = (e, messageId) => {
    e.preventDefault();
    e.stopPropagation();
    showReactionPicker(e, messageId);
  };

  const showReactionPicker = (e, messageId) => {
    console.log("ShowReactionPicker called:", { messageId, target: e.currentTarget });
    
    if (!e.currentTarget) {
      console.log("No currentTarget found");
      return;
    }
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(e.clientX, window.innerWidth - 200); // Prevent overflow
    const y = rect.bottom + window.scrollY + 5;
    
    console.log("Setting context menu:", { show: true, messageId, x, y });
    
    setContextMenu({
      show: true,
      messageId,
      x,
      y
    });
  };

  const hideReactionPicker = () => {
    console.log("Hiding reaction picker");
    setContextMenu({ show: false, messageId: null, x: 0, y: 0 });
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (contextMenu.show) {
        // Check if click is inside reaction picker
        const picker = document.querySelector('[data-reaction-picker="true"]');
        if (picker && picker.contains(e.target)) {
          return; // Don't close if clicking inside picker
        }
        console.log("Clicking outside, hiding picker");
        hideReactionPicker();
      }
    };

    const handleScroll = () => {
      if (contextMenu.show) {
        console.log("Scrolling, hiding picker");
        hideReactionPicker();
      }
    };

    if (contextMenu.show) {
      document.addEventListener('click', handleClickOutside, true);
      document.addEventListener('scroll', handleScroll, true);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside, true);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, [contextMenu.show]);

  // Reaction components
  const ReactionChip = ({ emoji, count, isUserReacted, onClick }) => (
    <button
      style={{
        ...styles.reactionChip,
        background: isUserReacted ? theme.colors.reactionBackgroundActive : theme.colors.reactionBackground,
        border: isUserReacted ? `1px solid ${theme.colors.reactionBorderActive}` : `1px solid ${theme.colors.reactionBorder}`
      }}
      onClick={onClick}
    >
      <span style={styles.reactionEmoji}>{emoji}</span>
      <span style={styles.reactionCount}>{count}</span>
    </button>
  );

  const ReactionPicker = ({ messageId, show, x, y }) => {
    console.log("ReactionPicker render:", { messageId, show, x, y });
    
    if (!show || !messageId) return null;

    return (
      <div 
        data-reaction-picker="true"
        style={{
          ...styles.reactionPicker,
          position: 'fixed',
          left: x,
          top: y,
          zIndex: 9999,
        }}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
      >
        {availableEmojis.map(emoji => (
          <button
            key={emoji}
            type="button"
            style={{
              ...styles.reactionPickerEmoji,
              backgroundColor: theme.colors.reactionBackground,
            }}
            onClick={(e) => {
              console.log("Emoji clicked:", emoji, messageId);
              e.stopPropagation();
              e.preventDefault();
              handleReaction(messageId, emoji);
              hideReactionPicker();
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = theme.colors.hoverBackground;
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = theme.colors.reactionBackground;
            }}
          >
            {emoji}
          </button>
        ))}
      </div>
    );
  };

  const MessageReactions = ({ message, onShowPicker }) => {
    const groupedReactions = groupReactions(message.reactions);
    
    // Only show if there are existing reactions
    if (!groupedReactions.length) {
      return null;
    }
    
    return (
      <div style={styles.reactionsContainer}>
        <div style={styles.reactionsRow}>
          {groupedReactions.map((reaction) => {
            const isUserReacted = user && reaction.userIds.includes(user.id);
            return (
              <ReactionChip
                key={reaction.emoji}
                emoji={reaction.emoji}
                count={reaction.count}
                isUserReacted={isUserReacted}
                onClick={() => handleReaction(message._id, reaction.emoji)}
              />
            );
          })}
        </div>
      </div>
    );
  };

  // Attachment components
  const AttachmentPreview = ({ attachments }) => {
    if (!attachments || attachments.length === 0) return null;
    
    return (
      <div style={styles.attachmentsContainer}>
        {attachments.map((attachment, index) => (
          <div key={index} style={styles.attachmentItem}>
            {attachment.type === 'image' ? (
              <img 
                src={attachment.url} 
                alt={attachment.originalName}
                style={styles.attachmentImage}
                onClick={() => window.open(attachment.url, '_blank')}
              />
            ) : (
              <div style={styles.fileAttachment} onClick={() => window.open(attachment.url, '_blank')}>
                <div style={styles.fileIcon}>📄</div>
                <div style={styles.fileInfo}>
                  <div style={styles.fileName}>{attachment.originalName}</div>
                  <div style={styles.fileSize}>{(attachment.size / 1024 / 1024).toFixed(2)} MB</div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const FilePreview = ({ files, onRemove }) => {
    if (!files || files.length === 0) return null;
    
    return (
      <div style={styles.filePreviewContainer}>
        {files.map((file, index) => (
          <div key={index} style={styles.filePreviewItem}>
            {file.type.startsWith('image/') ? (
              <img 
                src={URL.createObjectURL(file)} 
                alt={file.name}
                style={styles.previewImage}
              />
            ) : (
              <div style={styles.previewFile}>
                <div style={styles.fileIcon}>📄</div>
                <span style={styles.previewFileName}>{file.name}</span>
              </div>
            )}
            <button 
              style={styles.removeFileButton} 
              onClick={() => onRemove(index)}
              type="button"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h2 style={{ margin: 0 }}>SuperPaac Group Chat</h2>
          {user && (
            <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.8 }}>
              Logged in as{" "}
              <strong>
                {user.role === "student" ? "Anonymous Student" : user.name}
              </strong>{" "}
              ({user.role})
            </p>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ThemeToggle />
          <NotificationCenter />
          <button style={styles.logoutButton} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <main style={styles.chatContainer}>
        {/* WhatsApp-style pinned banner */}
        {pinnedMessages.length > 0 && (
          <div style={styles.whatsappPinnedBanner}>
            <div 
              style={styles.pinnedBannerContent} 
              onClick={() => setPinnedExpanded(!pinnedExpanded)}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = theme.colors.hoverBackground;
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "transparent";
              }}
            >
              <div style={styles.pinnedIcon}>📌</div>
              <div style={styles.pinnedPreview}>
                <div style={styles.pinnedPreviewText}>
                  {pinnedExpanded 
                    ? `${pinnedMessages.length} pinned message${pinnedMessages.length > 1 ? 's' : ''}` 
                    : pinnedMessages[0]?.text?.substring(0, 40) + (pinnedMessages[0]?.text?.length > 40 ? '...' : '')
                  }
                </div>
              </div>
              <div style={styles.pinnedArrow}>
                {pinnedExpanded ? '▲' : '▼'}
              </div>
            </div>
            
            {pinnedExpanded && (
              <div style={styles.expandedPinnedList}>
                {pinnedMessages.map((pm) => (
                  <div key={pm._id} style={styles.expandedPinnedItem}>
                    <div style={styles.expandedPinnedHeader}>
                      <span style={styles.expandedPinnedSender}>{formatSender(pm)}</span>
                      <span style={styles.expandedPinnedTime}>
                        {new Date(pm.pinnedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div style={styles.expandedPinnedText}>{pm.text}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={styles.messagesBox}>
          {loadingMessages ? (
            <p>Loading messages...</p>
          ) : messages.length === 0 ? (
            <p>No messages yet. Start the conversation ✨</p>
          ) : (
            getMessagesWithSeparators().map((item) => {
              if (item.type === 'separator') {
                return (
                  <DaySeparator key={item.id} label={item.label} />
                );
              }
              
              // Render message
              const msg = item.data;
              const isOwn = isOwnMessage(msg);
              
              return (
                <div
                  key={msg._id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.5rem",
                    alignSelf: isOwn ? "flex-end" : "flex-start",
                    maxWidth: "75%",
                    flexDirection: isOwn ? "row-reverse" : "row",
                  }}
                >
                  <div
                    style={{
                      ...styles.message,
                      background: msg.isDeleted
                        ? theme.colors.deletedMessageBackground
                        : msg.senderRole === "admin"
                        ? theme.colors.adminMessageBackground
                        : msg.senderRole === "teacher"
                        ? theme.colors.teacherMessageBackground
                        : theme.colors.studentMessageBackground,
                      color: msg.isDeleted
                        ? theme.colors.deletedMessageText
                        : msg.senderRole === "admin"
                        ? theme.colors.adminMessageText
                        : msg.senderRole === "teacher"
                        ? theme.colors.teacherMessageText
                        : theme.colors.studentMessageText,
                      maxWidth: "100%",
                      margin: 0,
                    }}
                    onMouseDown={!msg.isDeleted ? (e) => handleMouseDown(e, msg._id) : undefined}
                    onMouseUp={!msg.isDeleted ? handleMouseUp : undefined}
                    onMouseLeave={!msg.isDeleted ? handleMouseUp : undefined}
                    onContextMenu={!msg.isDeleted ? (e) => handleContextMenu(e, msg._id) : undefined}
                  >
                    <div style={styles.messageHeader}>
                      <span style={styles.sender}>{formatSender(msg)}</span>
                      <span style={styles.timestamp}>
                        {new Date(msg.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <div style={styles.messageText}>
                      {msg.isDeleted ? (
                        <span
                          style={{
                            color: theme.colors.deletedMessageText,
                            fontStyle: "italic",
                          }}
                        >
                          🛑 This message was removed by Admin/Teacher
                        </span>
                      ) : (
                        <div>
                          {msg.isPinned && (
                            <div style={styles.pinnedIndicator}>
                              📌 Pinned
                            </div>
                          )}
                          {msg.text && msg.text.trim()}
                          <AttachmentPreview attachments={msg.attachments} />
                        </div>
                      )}
                    </div>
                    {user && user.role === "admin" && !msg.isDeleted && (
                      <button
                        style={styles.deleteButton}
                        onClick={() => handleDelete(msg._id)}
                      >
                        Delete
                      </button>
                    )}
                    {isPrivileged && !msg.isDeleted && (
                      <button
                        style={{
                          ...styles.deleteButton,
                          marginLeft: 8,
                          background: msg.isPinned ? theme.colors.pinButtonBackgroundActive : theme.colors.pinButtonBackground,
                          color: theme.colors.pinButtonText
                        }}
                        onClick={() => handlePinToggle(msg._id, !msg.isPinned)}
                      >
                        {msg.isPinned ? "Unpin" : "Pin"}
                      </button>
                    )}
                    {!msg.isDeleted && <MessageReactions message={msg} />}
                  </div>
                  {!msg.isDeleted && (
                    <button
                      style={{
                        ...styles.emojiAdder,
                        alignSelf: "flex-start",
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        showReactionPicker(e, msg._id);
                      }}
                      onContextMenu={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        showReactionPicker(e, msg._id);
                      }}
                    >
                      😊+
                    </button>
                  )}
                </div>
              );
            })
          )}
          {renderTypingIndicator()}
          <div ref={messagesEndRef} />
        </div>

        {/* Global reaction picker */}
        <ReactionPicker 
          messageId={contextMenu.messageId}
          show={contextMenu.show}
          x={contextMenu.x}
          y={contextMenu.y}
        />

        <form style={styles.inputRow} onSubmit={handleSend}>
          <div style={styles.inputContainer}>
            <FilePreview files={attachedFiles} onRemove={removeAttachedFile} />
            <div style={styles.inputWithButtons}>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.txt"
                onChange={handleFileSelect}
                style={styles.hiddenFileInput}
              />
              <button
                type="button"
                style={styles.attachButton}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                📎
              </button>
              <input
                style={styles.input}
                type="text"
                placeholder="Type your message..."
                value={text}
                onChange={handleInputChange}
                disabled={uploading}
              />
            </div>
          </div>
          <button 
            style={{
              ...styles.sendButton,
              background: uploading ? "#6b7280" : "#22c55e"
            }} 
            type="submit" 
            disabled={sending || uploading}
          >
            {uploading ? "Uploading..." : sending ? "Sending..." : "Send"}
          </button>
        </form>
      </main>
    </div>
  );
}

export default ChatPage;