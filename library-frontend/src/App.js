import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import './App.css';
import LoginPage from './LoginPage';
import PunchPage from './PunchPage';
import HistoryPage from './HistoryPage';
import Header from './Header';
import Footer from './Footer';

// A wrapper component for all protected pages
function AppLayout({ handleLogout }) {
    return (
        // 1. Add this wrapper div for the flex layout
        <div className="app-layout"> 
            <Header onLogout={handleLogout} />
            {/* 2. Add a class to the main content area */}
            <main className="main-content"> 
                <Outlet />
            </main>
            <Footer />
        </div>
    );
}

// ... the rest of your App.js file remains the same ...

function App() {
    // (No changes needed in this part)
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('http://localhost:3100/api/check-status', { credentials: 'include' })
            .then(res => res.ok ? res.json() : Promise.reject(res))
            .then(data => {
                if (data.success) setIsLoggedIn(true);
            })
            .catch(() => setIsLoggedIn(false))
            .finally(() => setLoading(false));
    }, []);

    const handleLoginSuccess = () => {
        setIsLoggedIn(true);
    };

    const handleLogout = async () => {
        await fetch('http://localhost:3100/api/logout', { 
            method: 'POST', 
            credentials: 'include' 
        });
        setIsLoggedIn(false);
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <Router>
            <Routes>
                <Route 
                    path="/login" 
                    element={!isLoggedIn ? <LoginPage onLoginSuccess={handleLoginSuccess} /> : <Navigate to="/" />} 
                />
                
                <Route 
                    path="/" 
                    element={isLoggedIn ? <AppLayout handleLogout={handleLogout} /> : <Navigate to="/login" />}
                >
                    <Route index element={<PunchPage />} />
                    <Route path="history" element={<HistoryPage />} />
                </Route>
                
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </Router>
    );
}

export default App;