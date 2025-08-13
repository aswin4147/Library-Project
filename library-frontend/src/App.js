import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import './App.css';
import LoginPage from './LoginPage';
import PunchPage from './PunchPage';
import HistoryPage from './HistoryPage';
import Header from './Header'; // Import the new Header component

// A wrapper component for all protected pages
function AppLayout({ handleLogout }) {
    return (
        <div>
            <Header onLogout={handleLogout} />
            <main>
                <Outlet /> {/* This will render the specific page component (PunchPage or HistoryPage) */}
            </main>
        </div>
    );
}


function App() {
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
                
                {/* All protected routes will now use the AppLayout */}
                <Route 
                    path="/" 
                    element={isLoggedIn ? <AppLayout handleLogout={handleLogout} /> : <Navigate to="/login" />}
                >
                    {/* These are the child routes that will be rendered inside AppLayout's <Outlet /> */}
                    <Route index element={<PunchPage />} />
                    <Route path="history" element={<HistoryPage />} />
                </Route>
                
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </Router>
    );
}

export default App;