import React from "react";
import { Link } from "react-router-dom";

// This component receives the logout handler function as a "prop"
function Header({ onLogout }) {
  return (
    <header className="main-header">
      <div className="header-content">
        <Link to="/" className="header-logo">
          Library Gate
        </Link>
        <nav className="header-nav">
          <Link to="/history">View History</Link>
          <button onClick={onLogout} className="logout-btn">
            Logout
          </button>
        </nav>
      </div>
    </header>
  );
}

export default Header;
