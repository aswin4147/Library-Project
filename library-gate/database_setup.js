const mysql = require("mysql2/promise");
require("dotenv").config();

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || undefined,
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
      connectTimeout: 5000,
    });

    const [versionRows] = await conn.query("SELECT VERSION() AS v");
    console.log("MySQL reachable, version:", versionRows[0].v);

    // Drop existing tables
    await conn.query("DROP TABLE IF EXISTS visits;");
    await conn.query("DROP TABLE IF EXISTS students;");

    // Create students table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS students (
        id INT AUTO_INCREMENT PRIMARY KEY,
        register_number VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        admission_number VARCHAR(255) NOT NULL UNIQUE
      );
    `);
    console.log("Table 'students' is ready.");

    // Create visits table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS visits (
        id INT AUTO_INCREMENT PRIMARY KEY,
        register_number VARCHAR(255) NOT NULL,
        admission_number VARCHAR(255) NOT NULL,
        purpose VARCHAR(255) NOT NULL,
        punch_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        punch_out_time TIMESTAMP NULL
      );
    `);
    console.log("Table 'visits' is ready.");

    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error("DB setup failed:", err.message);
    process.exit(1);
  }
})();
