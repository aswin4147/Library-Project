require('dotenv').config(); // Loads credentials from .env
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

const saltRounds = 10;

// --- Define your superuser here ---
const adminUsername = 'admin';
const adminPassword = 'password';
// ----------------------------------

(async () => {
    let conn;
    console.log('Attempting to create/update superuser...');

    try {
        // 1. Connect to the database
        conn = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });
        console.log('Connected to MySQL database.');

        // 2. Hash the password
        console.log(`Hashing password for user: ${adminUsername}...`);
        const hash = await bcrypt.hash(adminPassword, saltRounds);

        // 3. Insert the user or update the password if the user already exists
        const sql = `
            INSERT INTO users (username, password) 
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE 
                password = VALUES(password);
        `;
        
        await conn.query(sql, [adminUsername, hash]);

        console.log('------------------------------------');
        console.log('🚀 Superuser creation successful!');
        console.log(`Username: ${adminUsername}`);
        console.log(`Password: ${adminPassword}`);
        console.log('------------------------------------');

    } catch (err) {
        console.error('Error creating superuser:', err.message);
    } finally {
        if (conn) {
            await conn.end();
            console.log('Database connection closed.');
        }
        process.exit(0);
    }
})();