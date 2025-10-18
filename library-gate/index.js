require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const session = require("express-session");
const bcrypt = require("bcrypt");
const cors = require("cors");
const ExcelJS = require("exceljs");

const app = express();
const port = 3100;

// --- MySQL Connection Pool Setup ---
const dbPool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// --- Middleware Setup ---
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: "a_super_secret_key_for_node",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 60 * 60 * 1000,
      httpOnly: true,
    },
  })
);

const requireLogin = (req, res, next) => {
  if (req.session && req.session.loggedIn) {
    next();
  } else {
    res.status(401).json({ error: "Unauthorized" });
  }
};

// --- API Routes (No changes in this section) ---

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  const sql = "SELECT * FROM users WHERE username = ?";
  try {
    const [users] = await dbPool.query(sql, [username]);
    if (users.length === 0) {
      return res
        .status(401)
        .json({ success: false, message: "Incorrect username or password." });
    }
    const user = users[0];
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (passwordMatch) {
      req.session.loggedIn = true;
      req.session.username = user.username;
      res.json({ success: true, username: user.username });
    } else {
      res
        .status(401)
        .json({ success: false, message: "Incorrect username or password." });
    }
  } catch (err) {
    console.error("SQL Error in /api/login:", err);
    res
      .status(500)
      .json({ success: false, message: "A database error occurred." });
  }
});

app.post("/api/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res
        .status(500)
        .json({ success: false, message: "Could not log out." });
    }
    res.clearCookie("connect.sid");
    res.json({ success: true, message: "Logged out successfully." });
  });
});

app.get("/api/check-status", requireLogin, (req, res) => {
  res.json({ success: true, username: req.session.username });
});

app.post("/api/student-details", requireLogin, async (req, res) => {
  const { student_id } = req.body;
  try {
    const findStudentSql =
      "SELECT * FROM students WHERE register_number = ? OR admission_number = ?";
    const [students] = await dbPool.query(findStudentSql, [
      student_id,
      student_id,
    ]);

    if (students.length === 0) {
      return res.json({ success: false, message: "Student not found." });
    }

    const student = students[0];
    const checkStatusSql =
      "SELECT id FROM visits WHERE (register_number = ? OR admission_number = ?) AND punch_out_time IS NULL";
    const [visits] = await dbPool.query(checkStatusSql, [
      student.register_number,
      student.admission_number,
    ]);

    res.json({
      success: true,
      student: student,
      isPunchedIn: visits.length > 0,
    });
  } catch (err) {
    console.error("SQL Error in /api/student-details:", err);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/api/punch", requireLogin, async (req, res) => {
  const { register_number, admission_number, purpose, action } = req.body;
  try {
    if (action === "punch_in") {
      const insertSql =
        "INSERT INTO visits (register_number, admission_number, purpose) VALUES (?, ?, ?)";
      await dbPool.query(insertSql, [
        register_number,
        admission_number,
        purpose,
      ]);
      res.json({
        success: true,
        message: `Student punched IN for ${purpose}.`,
      });
    } else if (action === "punch_out") {
      const updateSql =
        "UPDATE visits SET punch_out_time = NOW() WHERE (register_number = ? OR admission_number = ?) AND punch_out_time IS NULL";
      const [result] = await dbPool.query(updateSql, [
        register_number,
        admission_number,
      ]);
      if (result.affectedRows > 0) {
        res.json({
          success: true,
          message: `Student punched OUT.`,
        });
      } else {
        res.json({
          success: false,
          message: "Could not find an open session.",
        });
      }
    }
  } catch (err) {
    console.error("SQL Error in /api/punch:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// --- HISTORY AND EXPORT ROUTES (CORRECTIONS ARE IN THIS SECTION) ---

// In your index.js file, update the /api/history and /api/history/export routes:

app.get("/api/history", requireLogin, async (req, res) => {
  const { year, month, day, purpose, fromDate, toDate } = req.query;
  let sql = `
        SELECT 
            v.register_number, v.admission_number, v.purpose, v.punch_in_time, v.punch_out_time,
            s.name,
            s.department, 
            TIMESTAMPDIFF(MINUTE, v.punch_in_time, v.punch_out_time) AS duration_minutes 
        FROM visits v
        LEFT JOIN students s ON v.admission_number = s.admission_number
    `;
  const whereClauses = [];
  const params = [];

  if (year) { whereClauses.push("YEAR(v.punch_in_time) = ?"); params.push(year); }
  if (month) { whereClauses.push("MONTH(v.punch_in_time) = ?"); params.push(month); }
  if (day) { whereClauses.push("DAY(v.punch_in_time) = ?"); params.push(day); }
  if (purpose) { whereClauses.push("v.purpose = ?"); params.push(purpose); }
  if (fromDate) { whereClauses.push("DATE(v.punch_in_time) >= ?"); params.push(fromDate); }
  if (toDate) { whereClauses.push("DATE(v.punch_in_time) <= ?"); params.push(toDate); }

  if (whereClauses.length > 0) {
    sql += " WHERE " + whereClauses.join(" AND ");
  }
  sql += " ORDER BY v.punch_in_time DESC";

  try {
    const [rows] = await dbPool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("SQL Error in /api/history:", err);
    res.status(500).json({ error: "Error retrieving history." });
  }
});

app.get("/api/history/export", requireLogin, async (req, res) => {
  const { year, month, day, purpose, fromDate, toDate } = req.query;
  let sql = `
        SELECT 
            s.name,
            s.department,
            v.register_number, 
            v.admission_number, 
            v.purpose, 
            v.punch_in_time, 
            v.punch_out_time,
            TIMESTAMPDIFF(MINUTE, v.punch_in_time, v.punch_out_time) AS duration_minutes 
        FROM visits v
        LEFT JOIN students s ON v.admission_number = s.admission_number
    `;
  const whereClauses = [];
  const params = [];

  if (year) { whereClauses.push("YEAR(v.punch_in_time) = ?"); params.push(year); }
  if (month) { whereClauses.push("MONTH(v.punch_in_time) = ?"); params.push(month); }
  if (day) { whereClauses.push("DAY(v.punch_in_time) = ?"); params.push(day); }
  if (purpose) { whereClauses.push("v.purpose = ?"); params.push(purpose); }
  if (fromDate) { whereClauses.push("DATE(v.punch_in_time) >= ?"); params.push(fromDate); }
  if (toDate) { whereClauses.push("DATE(v.punch_in_time) <= ?"); params.push(toDate); }

  if (whereClauses.length > 0) {
    sql += " WHERE " + whereClauses.join(" AND ");
  }
  sql += " ORDER BY v.punch_in_time DESC";

  try {
    const [rows] = await dbPool.query(sql, params);
    if (rows.length === 0) {
      return res.status(404).json({ message: "No records found to export." });
    }
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Library Visit History");
    worksheet.columns = [
      { header: "Name", key: "name", width: 30 },
      { header: "Register Number", key: "register_number", width: 20 },
      { header: "Admission Number", key: "admission_number", width: 20 },
      { header: "Department", key: "department", width: 25 },
      { header: "Purpose", key: "purpose", width: 15 },
      { header: "Punch In Time", key: "punch_in_time", width: 25, style: { numFmt: "dd/mm/yyyy hh:mm:ss" } },
      { header: "Punch Out Time", key: "punch_out_time", width: 25, style: { numFmt: "dd/mm/yyyy hh:mm:ss" } },
      { header: "Time Spent (Minutes)", key: "duration_minutes", width: 25 },
    ];
    worksheet.addRows(rows);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=library_history_report.xlsx");
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("SQL Error in /api/history/export:", err);
    res.status(500).json({ error: "Failed to export history." });
  }
});

// --- STUDENT DATABASE MANAGEMENT ROUTES (No changes in this section) ---

app.get("/api/students", requireLogin, async (req, res) => {
    // --- 1. Get filter parameters from query string ---
    const { department, register_number, admission_number } = req.query;

    try {
        let sql = "SELECT register_number, name, admission_number, department FROM students";
        const whereClauses = [];
        const params = [];

        // --- 2. Build WHERE clause dynamically ---
        if (department) {
            // Use LIKE for partial matching on department
            whereClauses.push("department LIKE ?");
            params.push(`%${department}%`);
        }
        if (register_number) {
            whereClauses.push("register_number = ?");
            params.push(register_number);
        }
        if (admission_number) {
            whereClauses.push("admission_number = ?");
            params.push(admission_number);
        }

        if (whereClauses.length > 0) {
            sql += " WHERE " + whereClauses.join(" AND ");
        }

        sql += " ORDER BY name"; // Keep ordering

        // --- 3. Execute the query with params ---
        const [rows] = await dbPool.query(sql, params);
        res.json(rows);

    } catch (err) {
        console.error("SQL Error fetching students:", err);
        res.status(500).json({ error: "Database error while fetching students." });
    }
});

app.post("/api/students/upload", requireLogin, async (req, res) => {
    let connection;
    try {
        const { students } = req.body;
        if (!Array.isArray(students)) {
            return res.status(400).json({ success: false, message: "Invalid data format." });
        }
        connection = await dbPool.getConnection();
        let insertedCount = 0;
        let updatedCount = 0;
        let errors = [];
        for (const [index, student] of students.entries()) {
            try {
                if (!student.name || !student.admission_number || !student.department) {
                    errors.push(`Row ${index + 2}: Missing required fields`);
                    continue;
                }
                const registerNumber = (student.register_number === 'not given' || !student.register_number) 
                    ? null 
                    : student.register_number;
                const checkSql = "SELECT * FROM students WHERE admission_number = ?";
                const [existing] = await connection.query(checkSql, [student.admission_number]);
                if (existing.length > 0) {
                    const updateSql = "UPDATE students SET register_number = ?, name = ?, department = ? WHERE admission_number = ?";
                    await connection.query(updateSql, [
                        registerNumber,
                        student.name,
                        student.department,
                        student.admission_number
                    ]);
                    updatedCount++;
                } else {
                    const insertSql = "INSERT INTO students (register_number, name, admission_number, department) VALUES (?, ?, ?, ?)";
                    await connection.query(insertSql, [
                        registerNumber,
                        student.name,
                        student.admission_number,
                        student.department
                    ]);
                    insertedCount++;
                }
            } catch (err) {
                console.error(`Error processing row ${index + 2}:`, err);
                errors.push(`Row ${index + 2}: ${err.message}`);
            }
        }
        let message = `Upload completed! ${insertedCount} new students added, ${updatedCount} students updated.`;
        if (errors.length > 0) {
            message += ` ${errors.length} errors occurred.`;
        }
        res.json({
            success: errors.length === 0,
            message: message,
            inserted: insertedCount,
            updated: updatedCount,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (err) {
        console.error("SQL Error in /api/students/upload:", err);
        res.status(500).json({ success: false, message: "Database error during upload: " + err.message });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

app.post("/api/students/update-register-numbers", requireLogin, async (req, res) => {
    try {
        const { updates } = req.body;
        if (!Array.isArray(updates)) {
            return res.status(400).json({ success: false, message: "Invalid data format." });
        }
        let updatedCount = 0;
        let notFoundCount = 0;
        for (const update of updates) {
            if (!update.admission_number || !update.register_number) {
                console.warn('Skipping invalid update data:', update);
                continue;
            }
            const updateSql = "UPDATE students SET register_number = ? WHERE admission_number = ?";
            const [result] = await dbPool.query(updateSql, [update.register_number, update.admission_number]);
            if (result.affectedRows > 0) {
                updatedCount++;
            } else {
                notFoundCount++;
            }
        }
        res.json({
            success: true,
            message: `Update completed! ${updatedCount} students updated, ${notFoundCount} students not found.`,
            updated: updatedCount,
            notFound: notFoundCount
        });
    } catch (err) {
        console.error("SQL Error in /api/students/update-register-numbers:", err);
        res.status(500).json({ success: false, message: "Database error during update: " + err.message });
    }
});

// --- Start the server ---
app.listen(port, () => {
  console.log(`Backend API server running at http://localhost:${port}`);
});