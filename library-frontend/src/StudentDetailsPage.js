import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import * as XLSX from "xlsx"; // You'll need to run 'npm install xlsx' in your frontend

function StudentDetailsPage() {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [uploadMessage, setUploadMessage] = useState("");
    const [uploadMessageType, setUploadMessageType] = useState("");

    // --- 1. Add state for filters ---
    const [filters, setFilters] = useState({
        department: "",
        register_number: "",
        admission_number: "",
    });

    // --- 2. Update useEffect to refetch when filters change ---
    useEffect(() => {
        fetchStudents();
    }, [filters]); // Dependency array includes filters

    const fetchStudents = async () => {
        setError("");
        setLoading(true);

        // --- 3. Build query parameters from filters ---
        const activeFilters = Object.fromEntries(
            Object.entries(filters).filter(([_, value]) => value.trim() !== "")
        );
        const params = new URLSearchParams(activeFilters);

        try {
            // --- 4. Add params to the fetch URL ---
            const response = await fetch(
                `http://localhost:3100/api/students?${params.toString()}`,
                {
                    credentials: "include",
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (Array.isArray(data)) {
                setStudents(data);
            } else {
                setError(
                    data.error || "Received unexpected data format from server."
                );
                setStudents([]);
            }
        } catch (err) {
            console.error("Failed to fetch students:", err);
            setError(`Error fetching students: ${err.message}`);
            setStudents([]);
        } finally {
            setLoading(false);
        }
    };

    // --- 5. Handler for filter input changes ---
    const handleFilterChange = (e) => {
        setFilters({
            ...filters,
            [e.target.name]: e.target.value,
        });
    };

    // Function to clear all filters
    const clearFilters = () => {
        setFilters({ department: "", register_number: "", admission_number: "" });
    };

    // --- Upload/Update functions remain unchanged ---
    // (handleFileUpload, readExcelFile, handleNewStudentsUpload, handleUpdateRegisterNumbers)
    const displayUploadMessage = (msg, type) => {
        setUploadMessage(msg);
        setUploadMessageType(type);
        setTimeout(() => {
            setUploadMessage("");
            setUploadMessageType("");
        }, 5000);
    };

    const handleFileUpload = async (event, isUpdate = false) => {
        const file = event.target.files[0];
        if (!file) return;
        event.target.value = ""; // Reset file input

        try {
            const data = await readExcelFile(file);
            if (isUpdate) {
                await handleUpdateRegisterNumbers(data);
            } else {
                await handleNewStudentsUpload(data);
            }
        } catch (err) {
            console.error("File processing error:", err);
            displayUploadMessage("Error processing file: " + err.message, "error");
        }
    };

    const readExcelFile = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: "array" });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);
                    resolve(jsonData);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = () => reject(new Error("Failed to read file"));
            reader.readAsArrayBuffer(file);
        });
    };

    const handleNewStudentsUpload = async (excelData) => {
        try {
            const studentsData = excelData.map((row, index) => {
                const registerNumber = row.RegisterNumber || row["Register Number"];
                const name = row.Name;
                const admissionNumber = row.AdmissionNumber || row["Admission Number"];
                const department = row.Department;
                if (!name || !admissionNumber || !department) {
                    throw new Error(`Missing required fields in row ${index + 2}: Name, Admission Number, Department`);
                }
                return { register_number: registerNumber || null, name, admission_number: admissionNumber, department };
            });
            const response = await fetch("http://localhost:3100/api/students/upload", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ students: studentsData }) });
            const result = await response.json();
            if (result.success) { displayUploadMessage(result.message, "success"); fetchStudents(); } else { displayUploadMessage(result.message, "error"); }
        } catch (err) { console.error("Upload error:", err); displayUploadMessage("Upload failed: " + err.message, "error"); }
    };

    const handleUpdateRegisterNumbers = async (excelData) => {
        try {
            const updates = excelData.map(row => ({ admission_number: row.AdmissionNumber || row["Admission Number"], register_number: row.RegisterNumber || row["Register Number"] })).filter(update => update.admission_number && update.register_number);
            const response = await fetch("http://localhost:3100/api/students/update-register-numbers", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ updates }) });
            const result = await response.json();
            if (result.success) { displayUploadMessage(result.message, "success"); fetchStudents(); } else { displayUploadMessage(result.message, "error"); }
        } catch (err) { console.error("Update error:", err); displayUploadMessage("Update failed: " + err.message, "error"); }
    };

    return (
        <div className="container wide">
            <div className="page-header">
                <h1>Student Database</h1>
                {/* Upload Buttons remain unchanged */}
                <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                    <label htmlFor="upload-new" className="btn-secondary" style={{ cursor: "pointer", margin: 0 }}>📥 Upload New Data</label>
                    <input id="upload-new" type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={(e) => handleFileUpload(e, false)} />
                    <label htmlFor="update-register" className="btn-secondary" style={{ cursor: "pointer", margin: 0 }}>🔄 Update Register Numbers</label>
                    <input id="update-register" type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={(e) => handleFileUpload(e, true)} />
                    <Link to="/" className="btn-secondary">← Back to Punch Page</Link>
                </div>
            </div>

            {/* --- 6. Add Filter Form --- */}
            <form className="filter-form student-filter-form">
                <div className="form-group">
                    <label htmlFor="filter-department">Department</label>
                    <input type="text" id="filter-department" name="department" placeholder="Enter department" value={filters.department} onChange={handleFilterChange} />
                </div>
                <div className="form-group">
                    <label htmlFor="filter-register_number">Register Number</label>
                    <input type="text" id="filter-register_number" name="register_number" placeholder="Enter register number" value={filters.register_number} onChange={handleFilterChange} />
                </div>
                <div className="form-group">
                    <label htmlFor="filter-admission_number">Admission Number</label>
                    <input type="text" id="filter-admission_number" name="admission_number" placeholder="Enter admission number" value={filters.admission_number} onChange={handleFilterChange} />
                </div>
                <div className="form-group">
                    <button type="button" onClick={clearFilters} className="btn-clear">Clear Filters</button>
                </div>
            </form>

            {uploadMessage && (<div className={`flash ${uploadMessageType}`}>{uploadMessage}</div>)}
            {error && (<div className="flash error">{error}</div>)}

            {/* Table remains unchanged, but will now show filtered data */}
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
                    {loading ? (
                        <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>Loading...</td></tr>
                    ) : students.length > 0 ? (
                        students.map((student) => (
                            <tr key={student.admission_number}>
                                <td>{student.name}</td>
                                <td>{student.register_number || "Not Given"}</td>
                                <td>{student.admission_number}</td>
                                <td>{student.department}</td>
                            </tr>
                        ))
                    ) : (
                        <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>No students found matching filters.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

export default StudentDetailsPage;