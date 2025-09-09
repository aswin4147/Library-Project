const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const saltRounds = 10;

// Update with your MySQL credentials
const connection = mysql.createConnection({
    host: 'localhost', user: 'root', password: 'pass123', database: 'library_db'
});

connection.connect((err) => {
    if (err) return console.error('Error connecting to MySQL: ' + err.stack);
    console.log('Connected to MySQL.');
});

// Drop existing tables to recreate them with new structure
const dropVisitsSql = "DROP TABLE IF EXISTS visits;";
const dropStudentsSql = "DROP TABLE IF EXISTS students;";

const createStudentsTableSql = `
CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    register_number VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    admission_number VARCHAR(255) NOT NULL UNIQUE
);`;

const createVisitsTableSql = `
CREATE TABLE IF NOT EXISTS visits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    register_number VARCHAR(255) NOT NULL,
    admission_number VARCHAR(255) NOT NULL,
    purpose VARCHAR(255) NOT NULL,
    punch_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    punch_out_time TIMESTAMP NULL
);`;

// Run the setup
connection.query(dropStudentsSql, (err) => {
    if (err) return console.error(err.message);
    connection.query(dropVisitsSql, (err) => {
        if (err) return console.error(err.message);
        
        connection.query(createStudentsTableSql, (err) => {
            if (err) return console.error(err.message);
            console.log("Table 'students' is ready.");
            
            connection.query(createVisitsTableSql, (err) => {
                if (err) return console.error(err.message);
                console.log("Table 'visits' is ready.");
                connection.end();
            });
        });
    });
});