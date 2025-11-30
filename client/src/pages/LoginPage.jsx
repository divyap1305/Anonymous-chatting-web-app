import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";

function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/auth/login", {
        email: form.email,
        password: form.password,
      });

      // Save token + user
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      // Navigate to chat
      navigate("/chat");
    } catch (err) {
      console.error(err);
      const msg =
        err.response?.data?.message || "Login failed. Check credentials.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2>SuperPaac Login</h2>
        <p style={{ marginBottom: "1rem" }}>
          Login to your SuperPaac anonymous group chat
        </p>

        {error && <p style={styles.error}>{error}</p>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            style={styles.input}
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
          />
          <input
            style={styles.input}
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
          />
          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p style={{ marginTop: "1rem" }}>
          New here? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#020617",
    color: "#e5e7eb",
  },
  card: {
    padding: "2rem",
    borderRadius: "1rem",
    background: "#0f172a",
    minWidth: "320px",
    textAlign: "center",
    boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    marginTop: "1rem",
  },
  input: {
    padding: "0.6rem 0.8rem",
    borderRadius: "0.5rem",
    border: "1px solid #1f2937",
    background: "#020617",
    color: "#e5e7eb",
  },
  button: {
    marginTop: "0.5rem",
    padding: "0.7rem",
    borderRadius: "0.5rem",
    border: "none",
    background: "#3b82f6",
    color: "#e5e7eb",
    fontWeight: "600",
    cursor: "pointer",
  },
  error: {
    background: "#7f1d1d",
    padding: "0.5rem",
    borderRadius: "0.5rem",
    marginBottom: "0.5rem",
    fontSize: "0.9rem",
  },
};

export default LoginPage;
