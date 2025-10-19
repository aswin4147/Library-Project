import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import './App.css';
import LoginPage from './LoginPage';
import PunchPage from './PunchPage';
import HistoryPage from './HistoryPage';
// --- 1. Import the new component ---
import StudentDetailsPage from './StudentDetailsPage'; 
import Header from './Header';
import Footer from './Footer';
import ProtectedRoute from './ProtectedRoute';

// A wrapper component for all protected pages
function AppLayout({ handleLogout }) {
    return (
        <div className="app-layout"> 
            <Header onLogout={handleLogout} />
            <main className="main-content"> 
                <Outlet />
            </main>
            <Footer />
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

                <Route
                    path="/"
                    element={isLoggedIn ? <AppLayout handleLogout={handleLogout} /> : <Navigate to="/login" />}
                >
                    <Route index element={<PunchPage />} />
                    {/* --- 2. Wrap sensitive routes --- */}
                    <Route
                        path="history"
                        element={<ProtectedRoute element={<HistoryPage />} />}
                    />
                    <Route
                        path="students"
                        element={<ProtectedRoute element={<StudentDetailsPage />} />}
                    />
                </Route>

                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </Router>
    );
}

export default App;

