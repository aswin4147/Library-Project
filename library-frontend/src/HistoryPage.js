import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function HistoryPage() {
    const [visits, setVisits] = useState([]);
    const [filters, setFilters] = useState({ year: '', month: '', day: '' });
    const [error, setError] = useState(''); // Added state for error messages

    useEffect(() => {
        const fetchHistory = async () => {
            const params = new URLSearchParams(filters);
            setError(''); // Clear previous errors

            try {
                const response = await fetch(`http://localhost:3100/api/history?${params.toString()}`, {
                    credentials: 'include' // Important for sending session cookie
                });
                
                const data = await response.json();

                // --- THIS IS THE FIX ---
                // Check if the received data is an array before setting the state
                if (Array.isArray(data)) {
                    setVisits(data);
                } else {
                    // If it's not an array, it's an error object from our API
                    setError(data.error || 'An unknown error occurred.');
                    setVisits([]); // Reset visits to an empty array
                }
            } catch (error) {
                console.error('Failed to fetch history:', error);
                setError('Failed to connect to the server or parse response.');
            }
        };

        fetchHistory();
    }, [filters]); // Refetch whenever filters change

    const handleFilterChange = (e) => {
        setFilters({
            ...filters,
            [e.target.name]: e.target.value
        });
    };

    const clearFilters = () => {
        setFilters({ year: '', month: '', day: '' });
    };

    return (
        <div className="container wide">
            <h1>Visit History</h1>
            
            <form className="filter-form">
                <div className="form-group">
                    <label>Year:</label>
                    <input type="number" name="year" placeholder="YYYY" value={filters.year} onChange={handleFilterChange} />
                </div>
                <div className="form-group">
                    <label>Month:</label>
                    <select name="month" value={filters.month} onChange={handleFilterChange}>
                        <option value="">All</option>
                        <option value="1">January</option>
                        <option value="2">February</option>
                        <option value="3">March</option>
                        <option value="4">April</option>
                        <option value="5">May</option>
                        <option value="6">June</option>
                        <option value="7">July</option>
                        <option value="8">August</option>
                        <option value="9">September</option>
                        <option value="10">October</option>
                        <option value="11">November</option>
                        <option value="12">December</option>
                    </select>
                </div>
                <div className="form-group">
                    <label>Day:</label>
                    <input type="number" name="day" placeholder="DD" value={filters.day} onChange={handleFilterChange} />
                </div>
                <div className="form-group">
                    <button type="button" onClick={clearFilters} className="btn-clear">Clear Filter</button>
                </div>
            </form>

            <Link to="/" className="nav-link">← Back to Punch-in Page</Link>
            
            {error && <div className="flash error">{error}</div>}

            <table>
                <thead>
                    <tr>
                        <th>Student ID</th>
                        <th>Purpose</th>
                        <th>Punch In Time</th>
                        <th>Punch Out Time</th>
                        <th>Time Spent (Minutes)</th>
                    </tr>
                </thead>
                <tbody>
                    {visits.map(visit => (
                        <tr key={visit.id}>
                            <td>{visit.student_id}</td>
                            <td>{visit.purpose}</td>
                            <td>{new Date(visit.punch_in_time).toLocaleString('en-IN')}</td>
                            <td>{visit.punch_out_time ? new Date(visit.punch_out_time).toLocaleString('en-IN') : <strong style={{color: 'green'}}>Still In</strong>}</td>
                            <td>{visit.duration_minutes !== null ? visit.duration_minutes : '-'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default HistoryPage;