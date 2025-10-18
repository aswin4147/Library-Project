import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function PunchPage() {
    const [studentId, setStudentId] = useState('');
    const [studentDetails, setStudentDetails] = useState(null);
    const [isPunchedIn, setIsPunchedIn] = useState(null);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const displayFlashMessage = (msg, type) => {
        setMessage(msg);
        setMessageType(type);
        setTimeout(() => {
            setMessage('');
            setMessageType('');
        }, 4000);
    };

    const handleIdSubmit = async (event) => {
        event.preventDefault();
        setMessage('');
        try {
            const response = await fetch('http://localhost:3100/api/student-details', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ student_id: studentId })
            });
            const data = await response.json();
            if (data.success) {
                setStudentDetails(data.student);
                setIsPunchedIn(data.isPunchedIn);
            } else {
                displayFlashMessage(data.message, 'error');
                setStudentId('');
            }
        } catch (err) {
            displayFlashMessage('Server error. Please try again.', 'error');
        }
    };

    const handlePunchAction = async (punchData) => {
        try {
            const response = await fetch('http://localhost:3100/api/punch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(punchData)
            });
            const data = await response.json();
            if (data.success) {
                // ==================== CHANGE IS HERE ====================
                // We now create a custom success message using the student's name
                // instead of using the generic one from the server.
                if (punchData.action === 'punch_in') {
                    const successMessage = `${studentDetails.name} punched IN for ${punchData.purpose}.`;
                    displayFlashMessage(successMessage, 'success');
                } else if (punchData.action === 'punch_out') {
                    const successMessage = `${studentDetails.name} punched OUT successfully.`;
                    displayFlashMessage(successMessage, 'success');
                } else {
                    // Fallback for any other actions
                    displayFlashMessage(data.message, 'success');
                }
                // =======================================================
            } else {
                displayFlashMessage(data.message || 'An error occurred.', 'error');
            }
        } catch (err) {
            displayFlashMessage('Server error.', 'error');
        }
        setIsPunchedIn(null);
        setStudentId('');
        setStudentDetails(null);
    };

    const resetState = () => {
        setIsPunchedIn(null);
        setStudentId('');
        setStudentDetails(null);
        setMessage('');
    };

    const renderActionButtons = () => {
        const commonData = {
            register_number: studentDetails.register_number,
            admission_number: studentDetails.admission_number
        };

        if (isPunchedIn) {
            return (
                <div className="punch-actions">
                    <button onClick={() => handlePunchAction({ ...commonData, action: 'punch_out' })} className="btn-punch-out">Punch Out</button>
                </div>
            );
        } else {
            return (
                <div className="punch-actions">
                    <label>Select Purpose of Visit:</label>
                    <button onClick={() => handlePunchAction({ ...commonData, action: 'punch_in', purpose: 'Reading' })} className="btn-purpose">Reading</button>
                    <button onClick={() => handlePunchAction({ ...commonData, action: 'punch_in', purpose: 'Lending' })} className="btn-purpose">Lending</button>
                    <button onClick={() => handlePunchAction({ ...commonData, action: 'punch_in', purpose: 'Book Bank' })} className="btn-purpose">Book Bank</button>
                </div>
            );
        }
    };

    return (
        <div className="container">
            {message && <div className={`flash ${messageType}`}>{message}</div>}
            
            <h1>Student Access Point</h1>
            <h2>Enter ID to record your visit</h2>

            {!studentDetails && (
                <div className="current-time-widget">
                    <span className="date">
                        {currentTime.toLocaleDateString('en-IN', { 
                            weekday: 'short', 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                        })}
                    </span>
                    <span className="time">
                        {currentTime.toLocaleTimeString('en-IN', { 
                            hour: '2-digit', 
                            minute: '2-digit', 
                            second: '2-digit' 
                        })}
                    </span>
                </div>
            )}

            {!studentDetails ? (
                <form onSubmit={handleIdSubmit}>
                    <div className="form-group">
                        <label htmlFor="student_id">Enter Student Register or Admission No.</label>
                        <input type="text" id="student_id" value={studentId} onChange={(e) => setStudentId(e.target.value)} required autoFocus />
                    </div>
                    <button type="submit" style={{ width: '100%' }}>Check Status</button>
                </form>
            ) : (
                <div className="student-welcome-container">
                    <h2>
                        {isPunchedIn ? 'Finalize Visit for' : 'Welcome,'} <strong>{studentDetails.name}</strong>
                    </h2>
                    
                    {renderActionButtons()}
                    <button onClick={resetState} className="nav-link" style={{ background: 'none', color: 'var(--gray-500)', marginTop: '2.5rem'}}>← Scan New ID</button>
                </div>
            )}
        </div>
    );
}

export default PunchPage;