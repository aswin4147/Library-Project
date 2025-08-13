const express = require('express');
const mysql = require('mysql2/promise'); // Using the promise-based version
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcrypt');
const cors = require('cors'); // Import cors

const app = express();
const port = 3100; // Backend API runs on port 3100

// --- MySQL Connection Pool Setup ---
// Using the credentials you provided.
const dbPool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'pass123',
    database: 'library_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// --- Middleware Setup ---
app.use(cors({
    origin: 'http://localhost:3000', // Allow requests from our React app
    credentials: true
}));
app.use(express.json()); // Allows Express to parse JSON body content
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'a_super_secret_key_for_node',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 60 * 60 * 1000, // Cookie expires in 1 hour
        httpOnly: true // Helps protect against XSS attacks
    }
}));
    
// Custom middleware to check if a user is logged in
const requireLogin = (req, res, next) => {
    if (req.session && req.session.loggedIn) {
        next(); // If logged in, continue to the requested route
    } else {
        // If not logged in, send an 'Unauthorized' error
        res.status(401).json({ error: 'Unauthorized' });
    }
};

// --- API Routes ---

// POST /api/login - Handles user login
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

// POST /api/logout - Handles user logout
app.post('/api/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Could not log out.' });
        }
        res.clearCookie('connect.sid'); // Clears the session cookie from the browser
        res.json({ success: true, message: 'Logged out successfully.' });
    });
});

// GET /api/check-status - Checks if a user session is active on page load
app.get('/api/check-status', requireLogin, (req, res) => {
    res.json({ success: true, username: req.session.username });
});

// POST /api/student-status - Checks if a student is currently punched in
app.post('/api/student-status', requireLogin, async (req, res) => {
    const { student_id } = req.body;
    try {
        const checkSql = "SELECT id FROM visits WHERE student_id = ? AND punch_out_time IS NULL";
        const [rows] = await dbPool.query(checkSql, [student_id]);
        res.json({ isPunchedIn: rows.length > 0 });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// POST /api/punch - Handles the final punch-in or punch-out action
app.post('/api/punch', requireLogin, async (req, res) => {
    const { student_id, purpose, action } = req.body;
    try {
        if (action === 'punch_in') {
            const insertSql = "INSERT INTO visits (student_id, purpose) VALUES (?, ?)";
            await dbPool.query(insertSql, [student_id, purpose]);
            res.json({ success: true, message: `Student ${student_id} punched IN for ${purpose}.` });
        } else if (action === 'punch_out') {
            const updateSql = "UPDATE visits SET punch_out_time = NOW() WHERE student_id = ? AND punch_out_time IS NULL";
            const [result] = await dbPool.query(updateSql, [student_id]);
            if (result.affectedRows > 0) {
                res.json({ success: true, message: `Student ${student_id} punched OUT.` });
            } else {
                res.json({ success: false, message: 'Could not find an open session.' });
            }
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// GET /api/history - Gets visit history with optional filters
app.get('/api/history', requireLogin, async (req, res) => {
    const { year, month, day } = req.query;
    let sql = `SELECT *, TIMESTAMPDIFF(MINUTE, punch_in_time, punch_out_time) AS duration_minutes FROM visits`;
    const whereClauses = [];
    const params = [];
    if (year) { whereClauses.push("YEAR(punch_in_time) = ?"); params.push(year); }
    if (month) { whereClauses.push("MONTH(punch_in_time) = ?"); params.push(month); }
    if (day) { whereClauses.push("DAY(punch_in_time) = ?"); params.push(day); }
    if (whereClauses.length > 0) {
        sql += " WHERE " + whereClauses.join(" AND ");
    }
    sql += " ORDER BY punch_in_time DESC";
    try {
        const [rows] = await dbPool.query(sql, params);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error retrieving history." });
    }
});


// --- Start the server ---
app.listen(port, () => {
    console.log(`Backend API server running at http://localhost:${port}`);
});