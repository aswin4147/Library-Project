// src/ProtectedRoute.js
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ReauthModal from './ReauthModal';

const REAUTH_TIMEOUT_MINUTES = 5; // How long re-authentication is valid

function ProtectedRoute({ element }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false); // Local auth state
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true); // Added loading state
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        // Function to check authentication status
        const checkAuth = () => {
            const lastAuthTime = sessionStorage.getItem('lastReauthTime');
            const now = Date.now();

            if (lastAuthTime && (now - parseInt(lastAuthTime, 10)) < REAUTH_TIMEOUT_MINUTES * 60 * 1000) {
                // Re-auth is valid
                setIsAuthenticated(true);
                setShowModal(false);
            } else {
                // Re-auth needed or expired
                setIsAuthenticated(false);
                setShowModal(true); // Need to show the modal
            }
            setLoading(false); // Finished checking
        };

        setLoading(true); // Start loading before check
        checkAuth();

        // Clear sessionStorage on initial load of login page or root? No, keep it simple.

    }, [location]); // Re-check every time the route changes

    const handleVerifySuccess = () => {
        sessionStorage.setItem('lastReauthTime', Date.now().toString());
        setIsAuthenticated(true); // Now authenticated locally
        setShowModal(false);
    };

    const handleModalCancel = () => {
        setShowModal(false);
        navigate(-1); // Go back to the previous page instead of root
    };

    if (loading) {
        return <div>Checking authentication...</div>; // Show loading indicator
    }

    if (showModal) {
    // Only render the modal, nothing else
    return <ReauthModal onVerify={handleVerifySuccess} onCancel={handleModalCancel} />;
    }

    if (isAuthenticated) {
        return element; // Show the actual protected page
    }

    // Fallback if something unexpected happens (shouldn't be reached often)
    // The main App.js handles the primary redirect if not logged in at all.
    console.error("ProtectedRoute reached unexpected state.");
    return null; // Or a specific error component
}

export default ProtectedRoute;