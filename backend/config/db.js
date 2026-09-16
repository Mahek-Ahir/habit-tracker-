'use strict';
const mysql  = require('mysql2/promise');
require('dotenv').config();

// Print connection info so you can see exactly what is being used
console.log('HOST:    ', process.env.DB_HOST     || 'localhost');
console.log('USER:    ', process.env.DB_USER     || 'root');
console.log('DB:      ', process.env.DB_NAME     || 'habit_tracker_db');
console.log('PASSWORD:', process.env.DB_PASSWORD !== undefined
  ? (process.env.DB_PASSWORD === '' ? '(empty — no password)' : '(set)')
  : '(not set in .env)');

const pool = mysql.createPool({
  host              : process.env.DB_HOST     || 'localhost',
  port              : parseInt(process.env.DB_PORT || '3306', 10),
  user              : process.env.DB_USER     || 'root',
  password          : process.env.DB_PASSWORD || '',
  database          : process.env.DB_NAME     || 'habit_tracker_db',
  waitForConnections: true,
  connectionLimit   : 10,
  queueLimit        : 0,
  timezone          : 'Z',
  charset           : 'utf8mb4',
});

async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log('\n✅  MySQL connected  →  ' +
      (process.env.DB_NAME || 'habit_tracker_db') + '@' +
      (process.env.DB_HOST || 'localhost') + '\n');
    conn.release();
  } catch (err) {
    console.error('\n❌  MySQL connection failed!\n');
    console.error('    Error:', err.message, '\n');

    if (err.message.includes('Access denied')) {
      console.error('╔══════════════════════════════════════════════════════════════╗');
      console.error('║  FIX: Access Denied Error                                    ║');
      console.error('╠══════════════════════════════════════════════════════════════╣');
      console.error('║  STEP 1 — Open http://localhost/phpmyadmin                   ║');
      console.error('║  STEP 2 — Click the SQL tab at the top                       ║');
      console.error('║  STEP 3 — Paste this and click Go:                           ║');
      console.error('║                                                               ║');
      console.error('║    SET PASSWORD FOR "root"@"localhost" = PASSWORD("");        ║');
      console.error('║                                                               ║');
      console.error('║  STEP 4 — Restart MySQL in XAMPP Control Panel               ║');
      console.error('║  STEP 5 — Run  node server.js  again                         ║');
      console.error('╠══════════════════════════════════════════════════════════════╣');
      console.error('║  OR: Open backend/.env and set  DB_PASSWORD=root             ║');
      console.error('║  (some XAMPP versions set "root" as the default password)    ║');
      console.error('╚══════════════════════════════════════════════════════════════╝\n');
    } else if (err.message.includes('ECONNREFUSED') || err.message.includes('connect')) {
      console.error('╔══════════════════════════════════════════════════════════════╗');
      console.error('║  FIX: MySQL is NOT running                                   ║');
      console.error('║  → Open XAMPP Control Panel                                  ║');
      console.error('║  → Click START next to MySQL and wait for green              ║');
      console.error('╚══════════════════════════════════════════════════════════════╝\n');
    } else if (err.message.includes('Unknown database')) {
      console.error('╔══════════════════════════════════════════════════════════════╗');
      console.error('║  FIX: Database "habit_tracker_db" not found                  ║');
      console.error('║  → Open phpMyAdmin → Import tab                              ║');
      console.error('║  → Choose habit_tracker_db.sql → Click Go                   ║');
      console.error('╚══════════════════════════════════════════════════════════════╝\n');
    }

    process.exit(1);
  }
}

module.exports = { pool, testConnection };
