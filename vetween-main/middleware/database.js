const mysql = require('mysql2/promise');
const config = require('./config');

const sql = config.getDatabase();

const { host, user, password, port, database, connectionLimit } = sql;

const pool = mysql.createPool({
  host,
  user,
  password,
  port,
  database,
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 0,
});

// Ping database to check for common exception errors.
pool.getConnection((err, connection) => {
  if (err) {
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      console.error('Database connection was closed.');
    }
    if (err.code === 'ER_CON_COUNT_ERROR') {
      console.error('Database has too many connections.');
    }
    if (err.code === 'ECONNREFUSED') {
      console.error('Database connection was refused.');
    }
  }

  if (connection) connection.release();

  return;
});

pool.on('error', (err) => {
  console.error('Database Error');
  console.error(err);
});

module.exports = pool;