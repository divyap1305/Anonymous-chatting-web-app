// src/pages/ChatPage.jsx
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import api from "../api";

const SOCKET_URL =
  process.env.REACT_APP_SOCKET_URL || "http://localhost:5000";

let socket; // to avoid multiple connections

function ChatPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  // Scroll to bottom whenever messages change
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(scrollToBottom, [messages]);

  // On mount: check auth + load user + connect socket + fetch messages
  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (!token || !storedUser) {
      // Not logged in → send to login
      navigate("/login");
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);

    // 1) Connect socket
    if (!socket) {
      socket = io(SOCKET_URL, {
        transports: ["websocket"],
      });

      socket.on("connect", () => {
        console.log("✅ Connected to socket:", socket.id);
      });

      // Listen for new messages from server
      socket.on("newMessage", (msg) => {
  setMessages((prev) => {
    // If this message already exists (same _id), don't add again
    if (prev.some((m) => m._id === msg._id)) {
      return prev;
    }
    return [...prev, msg];
  });
});

      // Listen for deleted messages
      socket.on("messageDeleted", (id) => {
        setMessages((prev) => prev.filter((m) => m._id !== id));
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
        socket.off("messageDeleted");
        // Not disconnecting socket globally so other components could use it
      }
    };
  }, [navigate]);

  const handleSend = async (e) => {
  e.preventDefault();
  if (!text.trim()) return;

  try {
    setSending(true);

    // 1) Save to backend (DB)
    const res = await api.post("/messages", { text: text.trim() });
    const savedMessage = res.data.data;

    // 2) Update UI immediately (local)
    setMessages((prev) => {
      if (prev.some((m) => m._id === savedMessage._id)) {
        return prev;
      }
      return [...prev, savedMessage];
    });

    // 3) Notify others via socket (if connected)
    if (socket && socket.connected) {
      socket.emit("chatMessage", savedMessage);
    }

    // 4) Clear input
    setText("");
  } catch (err) {
    console.error("Error sending message:", err);
  } finally {
    setSending(false);
  }
};


  const handleDelete = async (id) => {
    if (!user || user.role !== "admin") return;

    const confirmDelete = window.confirm("Delete this message?");
    if (!confirmDelete) return;

    try {
      await api.delete(`/messages/${id}`);

      // Inform others
      if (socket && socket.connected) {
        socket.emit("deleteMessage", id);
      }

      // Update local state
      setMessages((prev) => prev.filter((m) => m._id !== id));
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
    // show teacher name
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

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h2 style={{ margin: 0 }}>SuperPaac Group Chat</h2>
          {user && (
            <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.8 }}>
  Logged in as{" "}
  <strong>
    {user.role === "student"
      ? "Anonymous Student"
      : user.name}
  </strong>{" "}
  ({user.role})
</p>

          )}
        </div>
        <button style={styles.logoutButton} onClick={handleLogout}>
          Logout
        </button>
      </header>

      <main style={styles.chatContainer}>
        <div style={styles.messagesBox}>
          {loadingMessages ? (
            <p>Loading messages...</p>
          ) : messages.length === 0 ? (
            <p>No messages yet. Start the conversation ✨</p>
          ) : (
            messages.map((msg) => (
              <div
                key={msg._id}
                style={{
                  ...styles.message,
                  alignSelf: isOwnMessage(msg) ? "flex-end" : "flex-start",
                  background:
  msg.senderRole === "admin"
    ? "#1d4ed8" // blue for admin
    : msg.senderRole === "teacher"
    ? "#16a34a" // green for teacher
    : "#111827", // dark gray for students
                }}
              >
                <div style={styles.messageHeader}>
                  <span style={styles.sender}>{formatSender(msg)}</span>
                  <span style={styles.timestamp}>
                    {new Date(msg.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <div style={styles.messageText}>{msg.text}</div>
                {user && user.role === "admin" && (
                  <button
                    style={styles.deleteButton}
                    onClick={() => handleDelete(msg._id)}
                  >
                    Delete
                  </button>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <form style={styles.inputRow} onSubmit={handleSend}>
          <input
            style={styles.input}
            type="text"
            placeholder="Type your message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button style={styles.sendButton} type="submit" disabled={sending}>
            {sending ? "Sending..." : "Send"}
          </button>
        </form>
      </main>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#020617",
    color: "#e5e7eb",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    padding: "1rem 1.5rem",
    borderBottom: "1px solid #1f2937",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "#0f172a",
  },
  logoutButton: {
    padding: "0.4rem 0.8rem",
    borderRadius: "0.5rem",
    border: "none",
    background: "#ef4444",
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
  },
  messagesBox: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    padding: "1rem",
    borderRadius: "1rem",
    border: "1px solid #1f2937",
    background: "#020617",
    overflowY: "auto",
  },
  message: {
    maxWidth: "70%",
    padding: "0.6rem 0.8rem",
    borderRadius: "0.75rem",
    boxShadow: "0 4px 10px rgba(0,0,0,0.4)",
    fontSize: "0.95rem",
  },
  messageHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "0.25rem",
    fontSize: "0.75rem",
    opacity: 0.8,
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
    background: "#b91c1c",
    color: "#f9fafb",
    cursor: "pointer",
    fontSize: "0.7rem",
  },
  inputRow: {
    display: "flex",
    gap: "0.5rem",
    marginTop: "0.75rem",
  },
  input: {
    flex: 1,
    padding: "0.7rem 0.9rem",
    borderRadius: "0.75rem",
    border: "1px solid #1f2937",
    background: "#020617",
    color: "#e5e7eb",
  },
  sendButton: {
    padding: "0.7rem 1.2rem",
    borderRadius: "0.75rem",
    border: "none",
    background: "#22c55e",
    color: "#020617",
    fontWeight: 700,
    cursor: "pointer",
  },
};

export default ChatPage;
