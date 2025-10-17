require('dotenv').config();
const xlsx = require('xlsx');
const mysql = require('mysql2/promise');

// --- Configuration ---
const EXCEL_FILE_PATH = './students_data.xlsx'; // The name of your Excel file
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
};

async function importData() {
    let connection;
    try {
        console.log('Reading data from Excel file...');
        
        // 1. Read the Excel file
        const workbook = xlsx.readFile(EXCEL_FILE_PATH);
        const sheetName = workbook.SheetNames[0]; // Get the first sheet name
        const worksheet = workbook.Sheets[sheetName];
        
        // 2. Convert the sheet to a JSON array
        // **MODIFIED**: Added "Department" to the header array.
        // This assumes your Excel file now has a 'Department' column.
        const students = xlsx.utils.sheet_to_json(worksheet, {
            header: ["SlNo", "RegisterNumber", "Name", "AdmissionNumber", "Department"],
            range: 1 // Skip the first row (headers)
        });

        if (students.length === 0) {
            console.log('No students found in the Excel file.');
            return;
        }

        console.log(`Found ${students.length} students to import.`);

        // 3. Connect to the MySQL database
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to MySQL database.');

        let recordsInserted = 0;
        let recordsUpdated = 0;
        
        // 4. Loop through each student and insert/update the database
        for (const student of students) {
            // **MODIFIED**: Added a check for student.Department.
            if (!student.RegisterNumber || !student.Name || !student.AdmissionNumber || !student.Department) {
                console.warn('Skipping row due to missing data:', student);
                continue;
            }

            // **MODIFIED**: Updated the SQL query to include the 'department' column.
            const sql = `
                INSERT INTO students (register_number, name, admission_number, department) 
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    name = VALUES(name), 
                    admission_number = VALUES(admission_number),
                    department = VALUES(department);
            `;
            
            // **MODIFIED**: Added student.Department to the parameters array.
            const params = [student.RegisterNumber, student.Name, student.AdmissionNumber, student.Department];
            const [result] = await connection.execute(sql, params);

            if (result.affectedRows > 0) {
                if (result.insertId > 0) {
                    recordsInserted++;
                } else {
                    // This counts updates, including cases where data was identical.
                    recordsUpdated++;
                }
            }
        }

        console.log('------------------------------------');
        console.log('Import Complete!');
        console.log(`New Records Inserted: ${recordsInserted}`);
        console.log(`Existing Records Updated: ${recordsUpdated}`);
        console.log('------------------------------------');

    } catch (error) {
        console.error('An error occurred:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('Database connection closed.');
        }
    }
}

importData();
