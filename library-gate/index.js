require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const session = require('express-session');
const bcrypt = require('bcrypt');
const cors = require('cors');
const ExcelJS = require('exceljs'); // <-- ADD THIS LINE

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
    queueLimit: 0
});

// --- Middleware Setup ---
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'a_super_secret_key_for_node',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 60 * 60 * 1000,
        httpOnly: true
    }
}));
    
const requireLogin = (req, res, next) => {
    if (req.session && req.session.loggedIn) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

// --- API Routes ---

// POST /api/login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const sql = "SELECT * FROM users WHERE username = ?";
    try {
        const [users] = await dbPool.query(sql, [username]);
        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'Incorrect username or password.' });
        }
        const user = users[0];
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (passwordMatch) {
            req.session.loggedIn = true;
            req.session.username = user.username;
            res.json({ success: true, username: user.username });
        } else {
            res.status(401).json({ success: false, message: 'Incorrect username or password.' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'A database error occurred.' });
    }
});

// POST /api/logout
app.post('/api/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Could not log out.' });
        }
        res.clearCookie('connect.sid');
        res.json({ success: true, message: 'Logged out successfully.' });
    });
});

// GET /api/check-status
app.get('/api/check-status', requireLogin, (req, res) => {
    res.json({ success: true, username: req.session.username });
});

// POST /api/student-details
app.post('/api/student-details', requireLogin, async (req, res) => {
    const { student_id } = req.body;
    try {
        const findStudentSql = "SELECT * FROM students WHERE register_number = ? OR admission_number = ?";
        const [students] = await dbPool.query(findStudentSql, [student_id, student_id]);

        if (students.length === 0) {
            return res.json({ success: false, message: 'Student not found.' });
        }

        const student = students[0];
        const checkStatusSql = "SELECT id FROM visits WHERE (register_number = ? OR admission_number = ?) AND punch_out_time IS NULL";
        const [visits] = await dbPool.query(checkStatusSql, [student.register_number, student.admission_number]);

        res.json({
            success: true,
            student: student,
            isPunchedIn: visits.length > 0
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// POST /api/punch
app.post('/api/punch', requireLogin, async (req, res) => {
    const { register_number, admission_number, purpose, action } = req.body;
    try {
        if (action === 'punch_in') {
            const insertSql = "INSERT INTO visits (register_number, admission_number, purpose) VALUES (?, ?, ?)";
            await dbPool.query(insertSql, [register_number, admission_number, purpose]);
            res.json({ success: true, message: `Student ${register_number} punched IN for ${purpose}.` });
        } else if (action === 'punch_out') {
            const updateSql = "UPDATE visits SET punch_out_time = NOW() WHERE (register_number = ? OR admission_number = ?) AND punch_out_time IS NULL";
            const [result] = await dbPool.query(updateSql, [register_number, admission_number]);
            if (result.affectedRows > 0) {
                res.json({ success: true, message: `Student ${register_number} punched OUT.` });
            } else {
                res.json({ success: false, message: 'Could not find an open session.' });
            }
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// GET /api/history
app.get('/api/history', requireLogin, async (req, res) => {
    const { year, month, day, purpose } = req.query;
    let sql = `
        SELECT 
            v.register_number, v.admission_number, v.purpose, v.punch_in_time, v.punch_out_time,
            s.name,
            TIMESTAMPDIFF(MINUTE, v.punch_in_time, v.punch_out_time) AS duration_minutes 
        FROM visits v
        LEFT JOIN students s ON v.register_number = s.register_number
    `;
    const whereClauses = [];
    const params = [];

    if (year) { whereClauses.push("YEAR(v.punch_in_time) = ?"); params.push(year); }
    if (month) { whereClauses.push("MONTH(v.punch_in_time) = ?"); params.push(month); }
    if (day) { whereClauses.push("DAY(v.punch_in_time) = ?"); params.push(day); }
    if (purpose) { whereClauses.push("v.purpose = ?"); params.push(purpose); }

    if (whereClauses.length > 0) {
        sql += " WHERE " + whereClauses.join(" AND ");
    }
    sql += " ORDER BY v.punch_in_time DESC";

    try {
        const [rows] = await dbPool.query(sql, params);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error retrieving history." });
    }
});


// =========================================================================
// ========================= NEW EXPORT ROUTE START ========================
// =========================================================================

// GET /api/history/export - Exports visit history as an Excel file
app.get('/api/history/export', requireLogin, async (req, res) => {
    const { year, month, day, purpose } = req.query;

    let sql = `
        SELECT 
            s.name,
            v.register_number, 
            v.admission_number, 
            v.purpose, 
            v.punch_in_time, 
            v.punch_out_time,
            TIMESTAMPDIFF(MINUTE, v.punch_in_time, v.punch_out_time) AS duration_minutes 
        FROM visits v
        LEFT JOIN students s ON v.register_number = s.register_number
    `;
    
    const whereClauses = [];
    const params = [];

    if (year) { whereClauses.push("YEAR(v.punch_in_time) = ?"); params.push(year); }
    if (month) { whereClauses.push("MONTH(v.punch_in_time) = ?"); params.push(month); }
    if (day) { whereClauses.push("DAY(v.punch_in_time) = ?"); params.push(day); }
    if (purpose) { whereClauses.push("v.purpose = ?"); params.push(purpose); }

    if (whereClauses.length > 0) {
        sql += " WHERE " + whereClauses.join(" AND ");
    }
    sql += " ORDER BY v.punch_in_time DESC";

    try {
        const [rows] = await dbPool.query(sql, params);

        if (rows.length === 0) {
            return res.status(404).json({ message: "No records found for the given filters to export." });
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Library Visit History');

        worksheet.columns = [
            { header: 'Name', key: 'name', width: 30 },
            { header: 'Register Number', key: 'register_number', width: 20 },
            { header: 'Admission Number', key: 'admission_number', width: 20 },
            { header: 'Purpose', key: 'purpose', width: 15 },
            { header: 'Punch In Time', key: 'punch_in_time', width: 25, style: { numFmt: 'dd/mm/yyyy hh:mm:ss' } },
            { header: 'Punch Out Time', key: 'punch_out_time', width: 25, style: { numFmt: 'dd/mm/yyyy hh:mm:ss' } },
            { header: 'Time Spent (Minutes)', key: 'duration_minutes', width: 25 }
        ];

        worksheet.addRows(rows);

        res.setHeader(
            'Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition', 'attachment; filename=library_history_report.xlsx'
        );

        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {
        console.error('Export Error:', err);
        res.status(500).json({ error: "Failed to export history." });
    }
});

// =======================================================================
// ========================= NEW EXPORT ROUTE END ========================
// =======================================================================


// --- Start the server ---
app.listen(port, () => {
    console.log(`Backend API server running at http://localhost:${port}`);
}); 