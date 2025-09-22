import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function HistoryPage() {
    const [visits, setVisits] = useState([]);
    const [filters, setFilters] = useState({ year: '', month: '', day: '', purpose: '' });
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchHistory = async () => {
            // Remove empty filter values to keep the URL clean
            const activeFilters = Object.fromEntries(
                Object.entries(filters).filter(([_, value]) => value !== '')
            );
            const params = new URLSearchParams(activeFilters);
            setError('');

            try {
                const response = await fetch(`http://localhost:3100/api/history?${params.toString()}`, {
                    credentials: 'include'
                });
                
                const data = await response.json();

                if (response.ok && Array.isArray(data)) {
                    setVisits(data);
                } else {
                    setError(data.error || 'An unknown error occurred.');
                    setVisits([]);
                }
            } catch (error) {
                console.error('Failed to fetch history:', error);
                setError('Failed to connect to the server or parse response.');
            }
        };

        fetchHistory();
    }, [filters]);

    const handleFilterChange = (e) => {
        setFilters({
            ...filters,
            [e.target.name]: e.target.value
        });
    };

    const clearFilters = () => {
        setFilters({ year: '', month: '', day: '', purpose: '' });
    };

    const handleExport = async () => {
        const activeFilters = Object.fromEntries(
            Object.entries(filters).filter(([_, value]) => value !== '')
        );
        const params = new URLSearchParams(activeFilters);
        setError('');

        try {
            const response = await fetch(`http://localhost:3100/api/history/export?${params.toString()}`, {
                credentials: 'include'
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({ message: 'Export failed with no error details.' }));
                throw new Error(errData.message || 'Network response was not ok');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = 'library_history_report.xlsx';
            document.body.appendChild(a);
            a.click();
            
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

        } catch (error) {
            console.error('Failed to export history:', error);
            setError(`Export Failed: ${error.message}`);
        }
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
                    <label>Purpose:</label>
                    <select name="purpose" value={filters.purpose} onChange={handleFilterChange}>
                        <option value="">All</option>
                        <option value="Reading">Reading</option>
                        <option value="Lending">Lending</option>
                        <option value="Book Bank">Book Bank</option>
                    </select>
                </div>
                <div className="form-group">
                    <button type="button" onClick={clearFilters} className="btn-clear">Clear Filter</button>
                    <button type="button" onClick={handleExport} className="btn-export" style={{marginLeft: '10px'}}>
                        Export to Excel
                    </button>
                </div>
            </form>

            <Link to="/" className="nav-link">← Back to Punch-in Page</Link>
            
            {error && <div className="flash error">{error}</div>}

            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Register Number</th>
                        <th>Admission Number</th>
                        <th>Purpose</th>
                        <th>Punch In Time</th>
                        <th>Punch Out Time</th>
                        <th>Time Spent (Minutes)</th>
                    </tr>
                </thead>
                <tbody>
                    {visits.map((visit, index) => (
                        <tr key={index}>
                            <td>{visit.name}</td>
                            <td>{visit.register_number}</td>
                            <td>{visit.admission_number}</td>
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