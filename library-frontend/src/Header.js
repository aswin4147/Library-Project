import React from 'react';
import { Link } from 'react-router-dom';

function Header({ onLogout }) {
    return (
        <header className="main-header">
            <div className="header-content">
                <Link to="/" className="header-brand">
                    <div className="header-logo-icon">LGR</div> 
                    <span className="header-logo-text">Library Gateway Register</span>
                </Link>
                <nav className="header-nav">
                    <Link to="/history">View History</Link>
                    {/* --- NEW LINK ADDED HERE --- */}
                    <Link to="/students">Student Details</Link>
                    <button onClick={onLogout} className="logout-btn">Logout</button>
                </nav>
            </div>
        </header>
    );
}

export default Header;
