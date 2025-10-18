import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function HistoryPage() {
    const [visits, setVisits] = useState([]);
    const [filters, setFilters] = useState({ 
        year: '', 
        month: '', 
        day: '', 
        purpose: '',
        fromDate: '',
        toDate: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
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
            } finally {
                setLoading(false);
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
        setFilters({ 
            year: '', 
            month: '', 
            day: '', 
            purpose: '',
            fromDate: '',
            toDate: ''
        });
    };

    const handleExport = async () => {
        const activeFilters = Object.fromEntries(
            Object.entries(filters).filter(([_, value]) => value !== '')
        );
        const params = new URLSearchParams(activeFilters);
        setError('');

        try {
            // Dynamically generate the filename
            const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            const nameParts = ['History'];

            if (filters.year) nameParts.push(filters.year);
            if (filters.month) nameParts.push(monthNames[filters.month - 1]);
            if (filters.day) nameParts.push(filters.day);
            if (filters.purpose) nameParts.push(filters.purpose);
            if (filters.fromDate) nameParts.push(`From_${filters.fromDate}`);
            if (filters.toDate) nameParts.push(`To_${filters.toDate}`);
            
            let fileName;
            if (nameParts.length > 1) {
                fileName = `${nameParts.join('_')}.xlsx`;
            } else {
                const today = new Date().toISOString().slice(0, 10);
                fileName = `StudentVisits_upto_${today}.xlsx`;
            }

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
            a.download = fileName;
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
            <div className="page-header">
                <h1>Visit History</h1>
                <div>
                    <button onClick={handleExport} className="btn-secondary" style={{ marginRight: '1rem' }}>
                        Export to Excel
                    </button>
                    <Link to="/" className="btn-secondary">← Back to Punch Page</Link>
                </div>
            </div>
            
            <form className="filter-form">
                <div className="form-group">
                    <label>From Date</label>
                    <input 
                        type="date" 
                        name="fromDate" 
                        value={filters.fromDate} 
                        onChange={handleFilterChange} 
                    />
                </div>
                <div className="form-group">
                    <label>To Date</label>
                    <input 
                        type="date" 
                        name="toDate" 
                        value={filters.toDate} 
                        onChange={handleFilterChange} 
                    />
                </div>
                <div className="form-group">
                    <label>Year</label>
                    <input type="number" name="year" placeholder="YYYY" value={filters.year} onChange={handleFilterChange} />
                </div>
                <div className="form-group">
                    <label>Month</label>
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
                    <label>Day</label>
                    <input type="number" name="day" placeholder="DD" value={filters.day} onChange={handleFilterChange} />
                </div>
                <div className="form-group">
                    <label>Purpose</label>
                    <select name="purpose" value={filters.purpose} onChange={handleFilterChange}>
                        <option value="">All</option>
                        <option value="Reading">Reading</option>
                        <option value="Lending">Lending</option>
                        <option value="Book Bank">Book Bank</option>
                    </select>
                </div>
                <div className="form-group">
                    <button type="button" onClick={clearFilters} className="btn-clear">Clear All</button>
                </div>
            </form>

            {error && <div className="flash error">{error}</div>}

            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Register No.</th>
                        <th>Admission No.</th>
                        <th>Department</th>
                        <th>Purpose</th>
                        <th>Punch In</th>
                        <th>Punch Out</th>
                        <th>Duration (Mins)</th>
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        <tr>
                            <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>Loading history...</td>
                        </tr>
                    ) : visits.length > 0 ? visits.map((visit, index) => (
                        <tr key={index}>
                            <td>{visit.name || 'N/A'}</td>
                            <td>{visit.register_number || 'Not Given'}</td>
                            <td>{visit.admission_number}</td>
                            <td>{visit.department || 'N/A'}</td>
                            <td>{visit.purpose}</td>
                            <td>{new Date(visit.punch_in_time).toLocaleString('en-IN')}</td>
                            <td>{visit.punch_out_time ? new Date(visit.punch_out_time).toLocaleString('en-IN') : <strong style={{color: 'var(--success-color)'}}>Still In</strong>}</td>
                            <td>{visit.duration_minutes !== null ? visit.duration_minutes : '—'}</td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>No records found for the selected filters.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

export default HistoryPage;