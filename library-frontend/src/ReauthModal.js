// src/ReauthModal.js
import React, { useState } from 'react';

function ReauthModal({ onVerify, onCancel }) {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const response = await fetch('http://localhost:3100/api/reauthenticate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ password }),
            });
            const data = await response.json();
            if (response.ok && data.success) {
                onVerify(); // Call the success handler passed from parent
            } else {
                setError(data.message || 'Incorrect password.');
            }
        } catch (err) {
            setError('Failed to connect to server.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-backdrop">
            <div className="modal-content">
                <h2>Verify Password</h2>
                <p>Please re-enter your password to access this section.</p>
                {error && <div className="flash error" style={{ marginBottom: '1rem' }}>{error}</div>}
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="reauth-password">Password</label>
                        <input
                            type="password"
                            id="reauth-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>
                    <div className="modal-actions">
                        <button type="button" onClick={onCancel} className="btn-secondary" disabled={loading}>Cancel</button>
                        <button type="submit" disabled={loading}>
                            {loading ? 'Verifying...' : 'Verify'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ReauthModal;