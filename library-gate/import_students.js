const xlsx = require('xlsx');
const mysql = require('mysql2/promise');

// --- Configuration ---
const EXCEL_FILE_PATH = './students_data.xlsx'; // The name of your Excel file
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'pass123',
    database: 'library_db'
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
        // IMPORTANT: The `header` option assumes your Excel columns are named exactly:
        // 'RegisterNumber', 'Name', 'AdmissionNumber'
        const students = xlsx.utils.sheet_to_json(worksheet, {
            header: ["SlNo", "RegisterNumber", "Name", "AdmissionNumber"],
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
            // Make sure the required fields exist
            if (!student.RegisterNumber || !student.Name || !student.AdmissionNumber) {
                console.warn('Skipping row due to missing data:', student);
                continue;
            }

            const sql = `
                INSERT INTO students (register_number, name, admission_number) 
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    name = VALUES(name), 
                    admission_number = VALUES(admission_number);
            `;
            
            const params = [student.RegisterNumber, student.Name, student.AdmissionNumber];
            const [result] = await connection.execute(sql, params);

            if (result.affectedRows > 0) {
                // `insertId` is non-zero for new inserts, `affectedRows` can be 1 for an update with no actual data change
                // A better check is `result.warningStatus === 0` for insert and non-zero for update
                if (result.insertId > 0) {
                    recordsInserted++;
                } else {
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