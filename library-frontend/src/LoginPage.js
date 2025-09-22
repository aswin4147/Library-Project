import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

console.log("LoginPage component loaded");

function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      const response = await fetch("http://localhost:3100/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onLoginSuccess && onLoginSuccess();
        navigate("/");
      } else {
        setError(data.message || "Login failed.");
      }
    } catch (err) {
      setError("Failed to connect to the server.");
    }
  };

  return (
    <div className="login-wrapper">
      <style>{`
        :root{
          --page-bg: #ffffff;
          --card-bg: #ffffff;
          --accent: #60a5fa;
          --accent-2: #93c5fd;
          --text-color: #000000;
          --muted: #333333;
          --input-border: #e6eef8;
          --card-border: #e6e9ec;
          --card-shadow: rgba(16,24,40,0.04);
        }

        .login-wrapper{
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px;
          background: var(--page-bg);
          font-family: "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: var(--text-color);
        }

        .center-container {
          width: 100%;
          max-width: 440px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .card {
          width: 100%;
          background: var(--card-bg);
          border-radius: 12px;
          padding: 36px 28px;
          color: var(--text-color);
          box-shadow: 0 8px 20px var(--card-shadow);
          border: 1px solid var(--card-border);
          transform: translateZ(0);
        }

        .brand { text-align: center; margin-bottom: 12px; }
        .brand h1 {
          margin: 0;
          font-size: 26px;
          font-weight: 800;
          color: var(--text-color);
        }
        .brand p {
          margin: 6px 0 0;
          color: var(--muted);
          font-size: 13px;
        }

        .form-group { margin-top: 14px; }
        label{
          display: block;
          font-size: 16px;
          margin-bottom: 8px;
          color: var(--text-color);
          font-weight: 600;
        }

        input[type="text"],
        input[type="password"]{
          width: 100%;
          padding: 14px 16px;
          border-radius: 10px;
          border: 1px solid var(--input-border);
          background: #ffffff;
          color: var(--text-color);
          font-size: 17px;
          outline: none;
          transition: border-color 0.12s ease, box-shadow 0.12s ease, transform 0.08s ease;
        }
        input::placeholder { color: rgba(51,51,51,0.32); }
        input:focus{
          border-color: var(--accent);
          box-shadow: 0 6px 18px rgba(96,165,250,0.08);
          transform: translateY(-1px);
        }

        .login-btn {
          margin-top: 18px;
          width: 100%;
          padding: 12px 16px;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          color: #ffffff;
          font-weight: 700;
          font-size: 16px;
          background: linear-gradient(90deg, var(--accent) 0%, var(--accent-2) 100%);
          background-size: 200% 100%;
          background-position: 0% 50%;
          transition: background-position 0.45s ease, transform 0.12s ease, box-shadow 0.12s ease;
          box-shadow: 0 6px 12px rgba(15,30,60,0.04);
        }
        .login-btn:hover {
          background-position: 100% 50%;
          transform: translateY(-3px);
          box-shadow: 0 10px 22px rgba(15,30,60,0.06);
        }
        .login-btn:active {
          transform: translateY(-1px) scale(0.995);
        }

        .flash.error {
          margin: 10px 0 0;
          padding: 10px 12px;
          border-radius: 8px;
          background: #fff5f5;
          color: #7b1e1e;
          border: 1px solid rgba(123,30,30,0.06);
          font-size: 14px;
        }

        @media (max-width:420px){
          .card { padding: 20px; }
          .brand h1 { font-size: 20px; }
          input[type="text"], input[type="password"]{ font-size: 16px; padding: 12px 14px; }
        }
      `}</style>

      <div className="center-container">
        <div className="card" role="main" aria-label="Login card">
          <div className="brand">
            <h1>Library System</h1>
            <p>Admin Login</p>
          </div>

          {error && <div className="flash error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username">Username:</label>
              <input
                type="text"
                id="username"
                name="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password:</label>
              <input
                type="password"
                id="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="login-btn">
              Login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;