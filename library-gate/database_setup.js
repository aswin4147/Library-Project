const mysql = require("mysql2/promise");
require("dotenv").config();

(async () => {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || undefined,
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
      connectTimeout: 5000,
    });

    const [versionRows] = await conn.query("SELECT VERSION() AS v");
    console.log("MySQL reachable, version:", versionRows[0].v);

    // Create database if it doesn't exist
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'library_db'}\`;`);
    // Use the database
    await conn.query(`USE \`${process.env.DB_NAME || 'library_db'}\`;`);
    console.log(`Using database '${process.env.DB_NAME || 'library_db'}'`);


    // Create students table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS students (
        register_number VARCHAR(255) NULL,
        name VARCHAR(255) NOT NULL,
        admission_number VARCHAR(255) PRIMARY KEY,
        department VARCHAR(255) NOT NULL
      );
    `);
    console.log("Table 'students' is ready.");

    // Create visits table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS visits (
        id INT AUTO_INCREMENT PRIMARY KEY,
        register_number VARCHAR(255) NULL,
        admission_number VARCHAR(255) NOT NULL,
        purpose VARCHAR(255) NOT NULL,
        punch_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        punch_out_time TIMESTAMP NULL,
        FOREIGN KEY (admission_number) REFERENCES students(admission_number) ON DELETE CASCADE
      );
    `);
    console.log("Table 'visits' is ready.");

    // --- MODIFIED Users Table ---
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        username VARCHAR(255) PRIMARY KEY,
        password VARCHAR(255) NOT NULL
      );
    `);
    console.log("Table 'users' is ready.");
    // --- End of Modification ---

    await conn.end();
    console.log("Database setup complete.");
    process.exit(0);

  } catch (err) {
    console.error("DB setup failed:", err.message);
    if (conn) await conn.end();
    process.exit(1);
  }
})();