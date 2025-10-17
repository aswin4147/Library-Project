import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import * as XLSX from "xlsx";

function StudentDetailsPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadMessageType, setUploadMessageType] = useState("");

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setError("");
    setLoading(true);
    try {
      const response = await fetch("http://localhost:3100/api/students", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (Array.isArray(data)) {
        setStudents(data);
      } else {
        setError(data.error || "Received unexpected data format from server.");
        setStudents([]);
      }
    } catch (err) {
      console.error("Failed to fetch students:", err);
      if (err.message.includes("Failed to fetch")) {
        setError(
          "Failed to connect to the server. Please ensure the backend server is running on port 3100."
        );
      } else {
        setError(`Error: ${err.message}`);
      }
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

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

    // Reset file input
    event.target.value = "";

    try {
      // Read Excel file
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
      // Transform Excel data to match our format
      const studentsData = excelData.map((row, index) => {
        const registerNumber = row.RegisterNumber || row["Register Number"];
        const name = row.Name;
        const admissionNumber = row.AdmissionNumber || row["Admission Number"];
        const department = row.Department;

        // Validate required fields
        if (!name || !admissionNumber || !department) {
          throw new Error(
            `Missing required fields in row ${
              index + 2
            }: Name, Admission Number, and Department are required`
          );
        }
        
        return {
          register_number: registerNumber || null,
          name: name,
          admission_number: admissionNumber,
          department: department,
        };
      });

      const response = await fetch(
        "http://localhost:3100/api/students/upload",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ students: studentsData }),
        }
      );

      const result = await response.json();

      if (result.success) {
        displayUploadMessage(result.message, "success");
        // Refresh the student list
        fetchStudents();
      } else {
        displayUploadMessage(result.message, "error");
      }
    } catch (err) {
      console.error("Upload error:", err);
      displayUploadMessage("Upload failed: " + err.message, "error");
    }
  };

  const handleUpdateRegisterNumbers = async (excelData) => {
    try {
      // Transform Excel data for updates
      const updates = excelData
        .map((row) => ({
          admission_number: row.AdmissionNumber || row["Admission Number"],
          register_number: row.RegisterNumber || row["Register Number"],
        }))
        .filter((update) => update.admission_number && update.register_number);

      const response = await fetch(
        "http://localhost:3100/api/students/update-register-numbers",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ updates }),
        }
      );

      const result = await response.json();

      if (result.success) {
        displayUploadMessage(result.message, "success");
        // Refresh the student list
        fetchStudents();
      } else {
        displayUploadMessage(result.message, "error");
      }
    } catch (err) {
      console.error("Update error:", err);
      displayUploadMessage("Update failed: " + err.message, "error");
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <p>Loading student data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container wide">
      {/* Updated page-header with both buttons */}
      <div className="page-header">
        <h1>Student Database</h1>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          {/* Upload New Data Button */}
          <label
            htmlFor="upload-new"
            className="btn-secondary"
            style={{ cursor: "pointer", margin: 0 }}
          >
            📥 Upload New Data
          </label>
          <input
            id="upload-new"
            type="file"
            accept=".xlsx,.xls"
            style={{ display: "none" }}
            onChange={(e) => handleFileUpload(e, false)}
          />

          {/* Update Register Numbers Button */}
          <label
            htmlFor="update-register"
            className="btn-secondary"
            style={{ cursor: "pointer", margin: 0 }}
          >
            🔄 Update Register Numbers
          </label>
          <input
            id="update-register"
            type="file"
            accept=".xlsx,.xls"
            style={{ display: "none" }}
            onChange={(e) => handleFileUpload(e, true)}
          />

          <Link to="/" className="btn-secondary">
            ← Back to Punch Page
          </Link>
        </div>
      </div>

      {/* Upload Messages */}
      {uploadMessage && (
        <div className={`flash ${uploadMessageType}`}>{uploadMessage}</div>
      )}

      {error && (
        <div className="flash error">
          {error}
          <div style={{ marginTop: "0.5rem", fontSize: "0.9rem" }}>
            Make sure your backend server is running on http://localhost:3100
          </div>
        </div>
      )}

      {!error && students.length === 0 && (
        <div className="flash error">
          No students found in the database. Please check if the students table
          has data.
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
              <tr key={student.admission_number}>
                <td>{student.name}</td>
                <td>{student.register_number || "Not Given"}</td>
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