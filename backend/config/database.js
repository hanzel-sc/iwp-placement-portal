const mysql = require('mysql2/promise');

const dbConfig = {
    host: process.env.MYSQLHOST,           
    port: process.env.MYSQLPORT,           
    user: process.env.MYSQLUSER,           
    password: process.env.MYSQL_ROOT_PASSWORD, 
    database: process.env.MYSQL_DATABASE,  
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('Database connected successfully');
        connection.release();
    } catch (error) {
        console.error('Database connection failed:', error.message);
        process.exit(1);
    }
}

testConnection();

module.exports = pool;
