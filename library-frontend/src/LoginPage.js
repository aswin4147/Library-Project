import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// 1. Accept onLoginSuccess as a prop
function LoginPage({ onLoginSuccess }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate(); // Hook for navigation

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');

        try {
            const response = await fetch('http://localhost:3100/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // 'credentials: include' is important for sessions/cookies
                credentials: 'include', 
                body: JSON.stringify({ username: username.trim(), password })
            });

            const data = await response.json();

            if (data.success) {
                // 2. Call the handler function from App.js
                onLoginSuccess();
                // 3. Navigate to the main page
                navigate('/');
            } else {
                setError(data.message || 'Login failed.');
            }
        } catch (err) {
            setError('Failed to connect to the server.');
        }
    };

    return (
        <div className="container">
            <h1>Login to Library System</h1>
            {error && <div className="flash error">{error}</div>}
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="username">Username:</label>
                    <input
                        type="text"
                        id="username"
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
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <button type="submit">Login</button>
            </form>
        </div>
    );
}

export default LoginPage;