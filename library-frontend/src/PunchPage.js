import React, { useState } from 'react';

function PunchPage() {
    const [studentId, setStudentId] = useState('');
    const [status, setStatus] = useState(null);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');

    const handleIdSubmit = async (event) => {
        event.preventDefault();
        setMessage('');
        try {
            const response = await fetch('http://localhost:3100/api/student-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include', // Also good to have this here
                body: JSON.stringify({ student_id: studentId })
            });
            const data = await response.json();
            setStatus(data.isPunchedIn ? 'in' : 'out');
        } catch (err) {
            setMessage('Server error.');
            setMessageType('error');
        }
    };

    const handlePunchAction = async (punchData) => {
        try {
            const response = await fetch('http://localhost:3100/api/punch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // --- THIS IS THE FIX ---
                credentials: 'include', 
                body: JSON.stringify(punchData)
            });
            const data = await response.json();
            if (data.success) {
                setMessage(data.message);
                setMessageType('success');
            } else {
                setMessage(data.message || 'An error occurred.');
                setMessageType('error');
            }
        } catch (err) {
            setMessage('Server error.');
            setMessageType('error');
        }
        setStatus(null);
        setStudentId('');
    };

    const renderActionButtons = () => {
        if (status === 'in') {
            return (
                <button onClick={() => handlePunchAction({ student_id: studentId, action: 'punch_out' })} className="btn-punch-out">Punch Out</button>
            );
        }
        if (status === 'out') {
            return (
                <div>
                    <label>Select Purpose of Visit:</label>
                    <button onClick={() => handlePunchAction({ student_id: studentId, action: 'punch_in', purpose: 'Reading' })} className="btn-purpose">Reading</button>
                    <button onClick={() => handlePunchAction({ student_id: studentId, action: 'punch_in', purpose: 'Lending' })} className="btn-purpose">Lending</button>
                    <button onClick={() => handlePunchAction({ student_id: studentId, action: 'punch_in', purpose: 'Book Bank' })} className="btn-purpose">Book Bank</button>
                </div>
            );
        }
        return null;
    };

    return (
    <div className="container">
        {message && <div className={`flash ${messageType}`}>{message}</div>}
        {/* The duplicate link that was here is now removed */}
        <h1>Library Punch-in System</h1>
        
        {!status ? (
            <form onSubmit={handleIdSubmit}>
                <div className="form-group">
                    <label htmlFor="student_id">Enter Student ID:</label>
                    <input type="text" id="student_id" value={studentId} onChange={(e) => setStudentId(e.target.value)} required autoFocus />
                </div>
                <button type="submit">Submit</button>
            </form>
        ) : (
            <div>
                <h2>Student ID: <strong>{studentId}</strong></h2>
                {renderActionButtons()}
                <button onClick={() => setStatus(null)} className="nav-link">← Back to ID Entry</button>
            </div>
        )}
    </div>
);
}

export default PunchPage;