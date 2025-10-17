import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // Import Link

function StudentDetailsPage() {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchStudents = async () => {
            setError('');
            setLoading(true);
            try {
                const response = await fetch('http://localhost:3100/api/students', {
                    credentials: 'include'
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();

                if (Array.isArray(data)) {
                    setStudents(data);
                } else {
                    setError(data.error || 'Received unexpected data format from server.');
                    setStudents([]);
                }
            } catch (err) {
                console.error('Failed to fetch students:', err);
                if (err.message.includes('Failed to fetch')) {
                    setError('Failed to connect to the server. Please ensure the backend server is running on port 3100.');
                } else {
                    setError(`Error: ${err.message}`);
                }
                setStudents([]);
            } finally {
                setLoading(false);
            }
        };

        fetchStudents();
    }, []);

    if (loading) {
        return (
            <div className="container">
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <p>Loading student data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container wide">
            {/* Updated page-header with Back to Punch Page button */}
            <div className="page-header">
                <h1>Student Database</h1>
                <div>
                    <Link to="/" className="btn-secondary">← Back to Punch Page</Link>
                </div>
            </div>

            {error && (
                <div className="flash error">
                    {error}
                    <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                        Make sure your backend server is running on http://localhost:3100
                    </div>
                </div>
            )}

            {!error && students.length === 0 && (
                <div className="flash error">
                    No students found in the database. Please check if the students table has data.
                </div>
            )}

            {!error && students.length > 0 && (
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Register Number</th>
                            <th>Admission Number</th>
                            <th>Department</th>
                        </tr>
                    </thead>
                    <tbody>
                        {students.map((student) => (
                            <tr key={student.register_number}>
                                <td>{student.name}</td>
                                <td>{student.register_number}</td>
                                <td>{student.admission_number}</td>
                                <td>{student.department}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}

export default StudentDetailsPage;