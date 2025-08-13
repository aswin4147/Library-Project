const express = require('express');
const mysql = require('mysql2/promise'); // Using the promise-based version
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const bcrypt = require('bcrypt');

const app = express();
const port = 3000;

// --- IMPORTANT: Update with your MySQL credentials ---
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
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false }));
app.use(session({
    secret: 'a_super_secret_key_for_node',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 60 * 60 * 1000 } // Cookie expires in 1 hour
}));
app.use(flash());

// This middleware makes session data available to all templates
app.use((req, res, next) => {
    res.locals.loggedIn = req.session.loggedIn;
    res.locals.username = req.session.username;
    next();
});

// Custom middleware to check if user is logged in
const requireLogin = (req, res, next) => {
    if (req.session.loggedIn) {
        next(); // If logged in, continue to the requested page
    } else {
        res.redirect('/login'); // If not logged in, redirect to login page
    }
};

// --- Routes ---

// GET /login - Show the login page
app.get('/login', (req, res) => {
    res.render('login', { messages: req.flash() });
});

// POST /login - Handle login attempt
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const sql = "SELECT * FROM users WHERE username = ?";
    
    try {
        const [users] = await dbPool.query(sql, [username]);
        if (users.length === 0) {
            req.flash('error', 'Incorrect username or password.');
            return res.redirect('/login');
        }

        const user = users[0];
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (passwordMatch) {
            req.session.loggedIn = true;
            req.session.username = user.username;
            res.redirect('/');
        } else {
            req.flash('error', 'Incorrect username or password.');
            res.redirect('/login');
        }
    } catch (err) {
        console.error(err);
        req.flash('error', 'An error occurred.');
        res.redirect('/login');
    }
});

// GET /logout - Handle logout
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.redirect('/');
        res.redirect('/login');
    });
});

// --- Protected Routes ---

// --- Protected Routes ---

// The main page, now just for ID entry
app.get('/', requireLogin, (req, res) => {
    res.render('index', { messages: req.flash() });
});

// This new route checks the student's status and shows the action page
app.post('/student-status', requireLogin, async (req, res) => {
    const { student_id } = req.body;
    if (!student_id) {
        req.flash('error', 'Student ID cannot be empty.');
        return res.redirect('/');
    }

    try {
        const checkSql = "SELECT id FROM visits WHERE student_id = ? AND punch_out_time IS NULL";
        const [rows] = await dbPool.query(checkSql, [student_id]);

        const isPunchedIn = rows.length > 0;

        res.render('action', { student_id: student_id, isPunchedIn: isPunchedIn });

    } catch (err) {
        console.error(err);
        req.flash('error', 'A database error occurred.');
        res.redirect('/');
    }
});


// This route now handles the final punch-in or punch-out action
app.post('/punch', requireLogin, async (req, res) => {
    const { student_id, purpose, action } = req.body;
    try {
        if (action === 'punch_in') {
            const insertSql = "INSERT INTO visits (student_id, purpose) VALUES (?, ?)";
            await dbPool.query(insertSql, [student_id, purpose]);
            req.flash('success', `Success! Student ${student_id} punched IN for ${purpose}.`);
        } else if (action === 'punch_out') {
            const updateSql = "UPDATE visits SET punch_out_time = NOW() WHERE student_id = ? AND punch_out_time IS NULL";
            const [result] = await dbPool.query(updateSql, [student_id]);
            if (result.affectedRows === 0) {
                req.flash('error', `Error: Could not find an open session for student ${student_id}.`);
            } else {
                req.flash('success', `Success! Student ${student_id} punched OUT.`);
            }
        }
    } catch (err) {
        console.error(err);
        req.flash('error', 'A database error occurred.');
    }
    res.redirect('/');
});


// The history route remains the same
app.get('/history', requireLogin, (req, res) => {
    res.render('history', { 
        filters: {} // Pass an empty filters object for the initial load
    });
});

// Add this new API route
app.get('/api/history', requireLogin, async (req, res) => {
    const { year, month, day } = req.query;

    let sql = `SELECT *, TIMESTAMPDIFF(MINUTE, punch_in_time, punch_out_time) AS duration_minutes FROM visits`;
    const whereClauses = [];
    const params = [];

    if (year) {
        whereClauses.push("YEAR(punch_in_time) = ?");
        params.push(year);
    }
    if (month) {
        whereClauses.push("MONTH(punch_in_time) = ?");
        params.push(month);
    }
    if (day) {
        whereClauses.push("DAY(punch_in_time) = ?");
        params.push(day);
    }

    if (whereClauses.length > 0) {
        sql += " WHERE " + whereClauses.join(" AND ");
    }

    sql += " ORDER BY punch_in_time DESC";

    try {
        const [rows] = await dbPool.query(sql, params);
        // Instead of rendering a template, send the data as JSON
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error retrieving history." });
    }
});

app.post('/punch', requireLogin, async (req, res) => {
    const { student_id, purpose, action } = req.body;
    try {
        if (action === 'punch_in') {
            const checkSql = "SELECT id FROM visits WHERE student_id = ? AND punch_out_time IS NULL";
            const [rows] = await dbPool.query(checkSql, [student_id]);
            if (rows.length > 0) {
                req.flash('error', `Error: Student ${student_id} is already punched in.`);
            } else {
                const insertSql = "INSERT INTO visits (student_id, purpose) VALUES (?, ?)";
                await dbPool.query(insertSql, [student_id, purpose]);
                req.flash('success', `Success! Student ${student_id} punched IN.`);
            }
        } else if (action === 'punch_out') {
            const updateSql = "UPDATE visits SET punch_out_time = NOW() WHERE student_id = ? AND punch_out_time IS NULL";
            const [result] = await dbPool.query(updateSql, [student_id]);
            if (result.affectedRows === 0) {
                req.flash('error', `Error: Could not find an open session for student ${student_id} to punch OUT.`);
            } else {
                req.flash('success', `Success! Student ${student_id} punched OUT.`);
            }
        }
    } catch (err) {
        console.error(err);
        req.flash('error', 'A database error occurred.');
    }
    res.redirect('/');
});

// --- Start the server ---
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});