const mysql = require('mysql2');
const bcrypt = require('bcrypt');

const saltRounds = 10; // For password hashing

// --- IMPORTANT: Update with your MySQL credentials ---
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'pass123',
    database: 'library_db'
});

connection.connect((err) => {
    if (err) return console.error('Error connecting to MySQL: ' + err.stack);
    console.log('Connected to MySQL as id ' + connection.threadId);
});

// SQL to create the visits table (if not exists)
const createVisitsTableSql = `
CREATE TABLE IF NOT EXISTS visits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(255) NOT NULL,
    purpose VARCHAR(255) NOT NULL,
    punch_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    punch_out_time TIMESTAMP NULL
);`;

// SQL to create the users table
const createUsersTableSql = `
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
);`;

// --- Run the queries ---
connection.query(createVisitsTableSql, (err) => {
    if (err) return console.error(err.message);
    console.log("Table 'visits' is ready.");
});

connection.query(createUsersTableSql, (err) => {
    if (err) return console.error(err.message);
    console.log("Table 'users' is ready.");

    // Now, insert a default admin user
    const defaultUsername = 'admin';
    const defaultPassword = 'password';

    // Hash the password before storing it
    bcrypt.hash(defaultPassword, saltRounds, (err, hash) => {
        if (err) return console.error('Error hashing password:', err);

        const insertUserSql = "INSERT INTO users (username, password) VALUES (?, ?) ON DUPLICATE KEY UPDATE username=username";
        connection.query(insertUserSql, [defaultUsername, hash], (err) => {
            if (err) return console.error('Error inserting default user:', err);
            console.log(`Default user '${defaultUsername}' with password '${defaultPassword}' is ready.`);

            // Close connection after all queries are done
            connection.end();
        });
    });
});