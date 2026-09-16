-- ════════════════════════════════════════════════════════════════
--  fix_mysql_password.sql
--  Fixes: "Access denied for user 'root'@'localhost' (using password: NO)"
--
--  HOW TO USE:
--  1. Open http://localhost/phpmyadmin in your browser
--  2. Click the SQL tab at the top
--  3. Paste ONE of the options below and click Go
--  4. Stop MySQL in XAMPP → Start MySQL again
--  5. Run: node server.js  (should connect now)
-- ════════════════════════════════════════════════════════════════

-- ── Option 1: For MariaDB (most XAMPP on Windows) ─────────────
SET PASSWORD FOR 'root'@'localhost' = PASSWORD('');

-- ── Option 2: For MySQL 8.0 (try if Option 1 gives an error) ──
-- ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '';
-- FLUSH PRIVILEGES;

-- ════════════════════════════════════════════════════════════════
