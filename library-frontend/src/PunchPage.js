import React, { useState } from 'react';

function PunchPage() {
    const [inputId, setInputId] = useState('');
    const [studentDetails, setStudentDetails] = useState(null);
    const [isPunchedIn, setIsPunchedIn] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');

    const handleIdSubmit = async (event) => {
        event.preventDefault();
        setMessage('');
        try {
            const response = await fetch('http://localhost:3100/api/student-details', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ student_id: inputId.trim() })
            });
            const data = await response.json();
            if (data.success) {
                setStudentDetails(data.student);
                setIsPunchedIn(data.isPunchedIn);
            } else {
                setMessage(data.message);
                setMessageType('error');
            }
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
        // Reset the state to go back to the ID entry screen
        setStudentDetails(null);
        setInputId('');
    };

    const resetState = () => {
        setStudentDetails(null);
        setInputId('');
        setMessage('');
    };

    // This renders the main ID entry form
    const renderIdEntryForm = () => (
        <form onSubmit={handleIdSubmit}>
            <div className="form-group">
                <label htmlFor="student_id">Enter Register or Admission Number:</label>
                <input type="text" id="student_id" value={inputId} onChange={(e) => setInputId(e.target.value)} required autoFocus />
            </div>
            <button type="submit">Submit</button>
        </form>
    );

    // This renders the action screen after a student is found
    const renderActionScreen = () => (
        <div>
            <h2>Student Details</h2>
            <p><strong>Name:</strong> {studentDetails.name}</p>
            <p><strong>Register No:</strong> {studentDetails.register_number}</p>
            <p><strong>Admission No:</strong> {studentDetails.admission_number}</p>
            <hr/>
            {isPunchedIn ? (
                <div>
                    <p>This student is currently punched in.</p>
                    <button onClick={() => handlePunchAction({ register_number: studentDetails.register_number, admission_number: studentDetails.admission_number, action: 'punch_out' })} className="btn-punch-out">Punch Out</button>
                </div>
            ) : (
                <div>
                    <label>Select Purpose of Visit:</label>
                    <button onClick={() => handlePunchAction({ register_number: studentDetails.register_number, admission_number: studentDetails.admission_number, action: 'punch_in', purpose: 'Reading' })} className="btn-purpose">Reading</button>
                    <button onClick={() => handlePunchAction({ register_number: studentDetails.register_number, admission_number: studentDetails.admission_number, action: 'punch_in', purpose: 'Lending' })} className="btn-purpose">Lending</button>
                    <button onClick={() => handlePunchAction({ register_number: studentDetails.register_number, admission_number: studentDetails.admission_number, action: 'punch_in', purpose: 'Book Bank' })} className="btn-purpose">Book Bank</button>
                </div>
            )}
            <button onClick={resetState} className="nav-link">← Back to ID Entry</button>
        </div>
    );


    return (
        <div className="container">
            {message && <div className={`flash ${messageType}`}>{message}</div>}
            <h1>Library Punch-in System</h1>
            
            {studentDetails ? renderActionScreen() : renderIdEntryForm()}
        </div>
    );
}

export default PunchPage;