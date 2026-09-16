-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║   HABITFLOW — Complete Database (Phases 1–7) — FIXED VERSION               ║
-- ║   All views expose habit_id alias — zero import errors                      ║
-- ║   No DELIMITER · No Stored Procedures · No CALL statements                 ║
-- ║   Host: localhost | Port: 3307 | User: root | Password: (empty)             ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

SET FOREIGN_KEY_CHECKS = 0;
DROP DATABASE IF EXISTS habit_tracker_db;
CREATE DATABASE habit_tracker_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE habit_tracker_db;
SET FOREIGN_KEY_CHECKS = 1;
SET time_zone = '+00:00';

-- ═══════════════════════════════════════════════════════════════
-- PHASE 1 — 8 CORE TABLES
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE categories (
  id           TINYINT UNSIGNED   NOT NULL AUTO_INCREMENT,
  slug         VARCHAR(30)        NOT NULL,
  label        VARCHAR(50)        NOT NULL,
  icon_emoji   VARCHAR(10)        NOT NULL,
  color_hex    VARCHAR(7)         NOT NULL,
  sort_order   TINYINT UNSIGNED   NOT NULL DEFAULT 0,
  created_at   TIMESTAMP          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_slug (slug)
) ENGINE=InnoDB;

CREATE TABLE users (
  id                  INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  username            VARCHAR(50)    NOT NULL,
  email               VARCHAR(150)   NOT NULL,
  password_hash       VARCHAR(255)   NOT NULL,
  display_name        VARCHAR(100)   DEFAULT NULL,
  avatar_url          VARCHAR(500)   DEFAULT NULL,
  is_active           TINYINT(1)     NOT NULL DEFAULT 1,
  email_verified      TINYINT(1)     NOT NULL DEFAULT 0,
  email_verify_token  VARCHAR(100)   DEFAULT NULL,
  reset_token         VARCHAR(100)   DEFAULT NULL,
  reset_token_exp     DATETIME       DEFAULT NULL,
  last_login_at       DATETIME       DEFAULT NULL,
  created_at          TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email    (email),
  UNIQUE KEY uq_users_username (username),
  KEY idx_users_active (is_active)
) ENGINE=InnoDB;

CREATE TABLE user_settings (
  id                    INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  user_id               INT UNSIGNED  NOT NULL,
  theme                 ENUM('dark','light') NOT NULL DEFAULT 'dark',
  accent_color          ENUM('purple','blue','green','pink','orange','teal','yellow','red') NOT NULL DEFAULT 'purple',
  font_size             ENUM('small','medium','large','xlarge') NOT NULL DEFAULT 'medium',
  notifications_enabled TINYINT(1)    NOT NULL DEFAULT 0,
  reminder_time         TIME          DEFAULT '08:00:00',
  streak_alerts         TINYINT(1)    NOT NULL DEFAULT 1,
  weekly_summary        TINYINT(1)    NOT NULL DEFAULT 0,
  data_reset_at         DATETIME      DEFAULT NULL,
  created_at            TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_settings_user (user_id),
  CONSTRAINT fk_user_settings_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE habits (
  id                INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  user_id           INT UNSIGNED      NOT NULL,
  category_id       TINYINT UNSIGNED  NOT NULL,
  name              VARCHAR(120)      NOT NULL,
  description       TEXT              DEFAULT NULL,
  icon_emoji        VARCHAR(10)       NOT NULL DEFAULT '⭐',
  color_hex         VARCHAR(7)        NOT NULL DEFAULT '#7c3aed',
  frequency         ENUM('daily','weekdays','weekends','weekly','custom') NOT NULL DEFAULT 'daily',
  custom_days       JSON              DEFAULT NULL,
  start_date        DATE              NOT NULL,
  current_streak    SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  longest_streak    SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  total_completions INT UNSIGNED      NOT NULL DEFAULT 0,
  missed_days       INT UNSIGNED      NOT NULL DEFAULT 0,
  is_archived       TINYINT(1)        NOT NULL DEFAULT 0,
  sort_order        SMALLINT          NOT NULL DEFAULT 0,
  created_at        TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_habits_user          (user_id),
  KEY idx_habits_category      (category_id),
  KEY idx_habits_user_archived (user_id, is_archived),
  KEY idx_habits_streak        (user_id, current_streak DESC),
  CONSTRAINT fk_habits_user
    FOREIGN KEY (user_id)     REFERENCES users(id)      ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_habits_category
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE habit_logs (
  id          BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  habit_id    INT UNSIGNED     NOT NULL,
  user_id     INT UNSIGNED     NOT NULL,
  log_date    DATE             NOT NULL,
  completed   TINYINT(1)       NOT NULL DEFAULT 1,
  note        VARCHAR(255)     DEFAULT NULL,
  logged_at   TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_habit_log_date  (habit_id, log_date),
  KEY idx_logs_user_date        (user_id, log_date),
  KEY idx_logs_habit_date       (habit_id, log_date),
  KEY idx_logs_user_month       (user_id, log_date, completed),
  CONSTRAINT fk_logs_habit
    FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_logs_user
    FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE reminders (
  id              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  user_id         INT UNSIGNED  NOT NULL,
  habit_id        INT UNSIGNED  DEFAULT NULL,
  reminder_time   TIME          NOT NULL DEFAULT '08:00:00',
  is_enabled      TINYINT(1)    NOT NULL DEFAULT 1,
  days_of_week    JSON          DEFAULT NULL,
  message         VARCHAR(255)  DEFAULT NULL,
  last_sent_at    DATETIME      DEFAULT NULL,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_reminders_user  (user_id),
  KEY idx_reminders_habit (habit_id),
  CONSTRAINT fk_reminders_user
    FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_reminders_habit
    FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE achievements (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED  NOT NULL,
  badge_id    VARCHAR(30)   NOT NULL,
  badge_title VARCHAR(60)   NOT NULL,
  badge_icon  VARCHAR(10)   NOT NULL,
  badge_desc  VARCHAR(150)  NOT NULL,
  earned_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_achievement_user_badge (user_id, badge_id),
  KEY idx_achievements_user (user_id),
  CONSTRAINT fk_achievements_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE export_history (
  id              BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  user_id         INT UNSIGNED     NOT NULL,
  export_type     ENUM('csv','json','pdf') NOT NULL,
  file_name       VARCHAR(200)     NOT NULL,
  file_size_kb    DECIMAL(10,2)    DEFAULT NULL,
  habit_count     SMALLINT UNSIGNED DEFAULT NULL,
  date_range_from DATE             DEFAULT NULL,
  date_range_to   DATE             DEFAULT NULL,
  exported_at     TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_address      VARCHAR(45)      DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_export_user (user_id),
  CONSTRAINT fk_export_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ═══════════════════════════════════════════════════════════════
-- PHASE 2 — AUTH VIEW
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW vw_user_profile AS
SELECT
  u.id, u.username, u.email, u.display_name, u.avatar_url,
  u.is_active, u.email_verified, u.last_login_at,
  u.created_at AS registered_at,
  s.theme, s.accent_color, s.font_size,
  s.notifications_enabled, s.reminder_time,
  s.streak_alerts, s.weekly_summary
FROM users u
LEFT JOIN user_settings s ON s.user_id = u.id;

-- ═══════════════════════════════════════════════════════════════
-- PHASE 4 — HABIT CRUD VIEWS
-- NOTE: h.id aliased as BOTH id AND habit_id so all queries work
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW vw_habits_with_category AS
SELECT
  h.id          AS id,
  h.id          AS habit_id,
  h.user_id,
  h.name,
  h.description,
  h.icon_emoji,
  h.color_hex,
  h.frequency,
  h.custom_days,
  h.start_date,
  h.current_streak,
  h.longest_streak,
  h.total_completions,
  h.missed_days,
  h.is_archived,
  h.sort_order,
  h.created_at,
  h.updated_at,
  c.id          AS category_id,
  c.slug        AS category_slug,
  c.label       AS category_label,
  c.icon_emoji  AS category_icon,
  c.color_hex   AS category_color
FROM habits h
JOIN categories c ON c.id = h.category_id;

CREATE OR REPLACE VIEW vw_active_habits AS
SELECT * FROM vw_habits_with_category WHERE is_archived = 0;

-- ═══════════════════════════════════════════════════════════════
-- PHASE 5 — TRACKING & STREAK VIEWS
-- NOTE: h.id aliased as BOTH id AND habit_id in every view
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW vw_today_status AS
SELECT
  h.id          AS id,
  h.id          AS habit_id,
  h.user_id,
  h.name,
  h.icon_emoji,
  h.color_hex,
  c.id          AS category_id,
  c.slug        AS category,
  c.label       AS category_label,
  h.frequency,
  h.current_streak,
  h.longest_streak,
  h.total_completions,
  h.missed_days,
  CASE WHEN hl.id IS NOT NULL THEN 1 ELSE 0 END AS completed_today,
  CURDATE() AS today_date
FROM habits h
JOIN categories c ON c.id = h.category_id
LEFT JOIN habit_logs hl
  ON hl.habit_id  = h.id
 AND hl.log_date  = CURDATE()
 AND hl.completed = 1
WHERE h.is_archived = 0;

CREATE OR REPLACE VIEW vw_tracking_status AS
SELECT
  h.user_id,
  COUNT(DISTINCT h.id)                                              AS total_habits,
  SUM(CASE WHEN hl.completed = 1 THEN 1 ELSE 0 END)               AS completed_today,
  COUNT(DISTINCT h.id)
    - SUM(CASE WHEN hl.completed = 1 THEN 1 ELSE 0 END)           AS pending_today,
  COALESCE(MAX(h.current_streak), 0)                               AS best_current_streak,
  COALESCE(MAX(h.longest_streak), 0)                               AS best_ever_streak,
  COALESCE(SUM(h.missed_days), 0)                                  AS total_missed,
  COALESCE(SUM(h.total_completions), 0)                            AS all_completions
FROM habits h
LEFT JOIN habit_logs hl
  ON hl.habit_id  = h.id
 AND hl.log_date  = CURDATE()
 AND hl.completed = 1
WHERE h.is_archived = 0
GROUP BY h.user_id;

CREATE OR REPLACE VIEW vw_habit_streak_detail AS
SELECT
  h.id          AS id,
  h.id          AS habit_id,
  h.user_id,
  h.name,
  h.frequency,
  h.custom_days,
  h.start_date,
  h.current_streak,
  h.longest_streak,
  h.total_completions,
  h.missed_days,
  c.label       AS category,
  CASE WHEN hl_today.id IS NOT NULL THEN 1 ELSE 0 END AS completed_today
FROM habits h
JOIN categories c ON c.id = h.category_id
LEFT JOIN habit_logs hl_today
  ON hl_today.habit_id  = h.id
 AND hl_today.log_date  = CURDATE()
 AND hl_today.completed = 1
WHERE h.is_archived = 0;

CREATE OR REPLACE VIEW vw_streak_leaderboard AS
SELECT
  h.user_id,
  h.id          AS id,
  h.id          AS habit_id,
  h.name,
  h.icon_emoji,
  h.color_hex,
  c.label       AS category,
  h.current_streak,
  h.longest_streak,
  h.total_completions,
  h.missed_days,
  RANK() OVER (
    PARTITION BY h.user_id
    ORDER BY h.current_streak DESC
  ) AS streak_rank
FROM habits h
JOIN categories c ON c.id = h.category_id
WHERE h.is_archived = 0;

-- ═══════════════════════════════════════════════════════════════
-- PHASE 6 — ANALYTICS & CALENDAR VIEWS
-- NOTE: h.id aliased as BOTH id AND habit_id in every view
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW vw_analytics_weekly AS
SELECT
  hl.user_id,
  hl.log_date,
  DAYNAME(hl.log_date)          AS day_name,
  LEFT(DAYNAME(hl.log_date), 3) AS day_short,
  COUNT(DISTINCT hl.habit_id)   AS habits_completed,
  (SELECT COUNT(*) FROM habits h
   WHERE h.user_id = hl.user_id AND h.is_archived = 0) AS total_habits,
  ROUND(
    COUNT(DISTINCT hl.habit_id) * 100.0
    / NULLIF((SELECT COUNT(*) FROM habits h2
              WHERE h2.user_id = hl.user_id AND h2.is_archived = 0), 0)
  , 1) AS completion_pct
FROM habit_logs hl
WHERE hl.log_date  >= CURDATE() - INTERVAL 6 DAY
  AND hl.completed  = 1
GROUP BY hl.user_id, hl.log_date
ORDER BY hl.log_date;

CREATE OR REPLACE VIEW vw_analytics_monthly AS
SELECT
  hl.user_id,
  DATE_FORMAT(hl.log_date, '%Y-%m') AS month_key,
  DATE_FORMAT(hl.log_date, '%b %Y') AS month_label,
  COUNT(*)                          AS total_completions,
  COUNT(DISTINCT hl.habit_id)       AS unique_habits_done,
  COUNT(DISTINCT hl.log_date)       AS active_days
FROM habit_logs hl
WHERE hl.log_date  >= CURDATE() - INTERVAL 6 MONTH
  AND hl.completed  = 1
GROUP BY hl.user_id, month_key, month_label
ORDER BY month_key;

CREATE OR REPLACE VIEW vw_analytics_category AS
SELECT
  h.user_id,
  c.id                                  AS category_id,
  c.slug                                AS category,
  c.label                               AS category_label,
  c.icon_emoji,
  c.color_hex,
  COUNT(DISTINCT h.id)                  AS habit_count,
  COALESCE(SUM(h.total_completions), 0) AS total_completions,
  COALESCE(SUM(h.current_streak), 0)    AS total_streak
FROM habits h
JOIN categories c ON c.id = h.category_id
WHERE h.is_archived = 0
GROUP BY h.user_id, c.id, c.slug, c.label, c.icon_emoji, c.color_hex;

CREATE OR REPLACE VIEW vw_analytics_completion AS
SELECT
  h.user_id,
  COUNT(DISTINCT h.id) AS total_habits,
  SUM(CASE WHEN hl_today.completed = 1 THEN 1 ELSE 0 END) AS completed_today,
  ROUND(
    SUM(CASE WHEN hl_today.completed = 1 THEN 1 ELSE 0 END) * 100.0
    / NULLIF(COUNT(DISTINCT h.id), 0)
  , 1) AS completion_rate_today,
  (SELECT COUNT(*) FROM habit_logs hl30
   WHERE hl30.user_id   = h.user_id
     AND hl30.completed = 1
     AND hl30.log_date >= CURDATE() - INTERVAL 29 DAY) AS completions_last_30_days
FROM habits h
LEFT JOIN habit_logs hl_today
  ON hl_today.habit_id  = h.id
 AND hl_today.log_date  = CURDATE()
 AND hl_today.completed = 1
WHERE h.is_archived = 0
GROUP BY h.user_id;

CREATE OR REPLACE VIEW vw_best_habit AS
SELECT
  h.user_id,
  h.id          AS id,
  h.id          AS habit_id,
  h.name,
  h.icon_emoji,
  h.color_hex,
  c.label       AS category,
  h.current_streak,
  h.longest_streak,
  h.total_completions,
  h.missed_days,
  (h.current_streak * 3
   + h.longest_streak * 2
   + h.total_completions
   - h.missed_days)  AS performance_score,
  RANK() OVER (
    PARTITION BY h.user_id
    ORDER BY (h.current_streak * 3
              + h.longest_streak * 2
              + h.total_completions
              - h.missed_days) DESC
  ) AS perf_rank
FROM habits h
JOIN categories c ON c.id = h.category_id
WHERE h.is_archived = 0;

CREATE OR REPLACE VIEW vw_missed_analysis AS
SELECT
  h.user_id,
  h.id          AS id,
  h.id          AS habit_id,
  h.name,
  h.icon_emoji,
  c.label       AS category,
  h.missed_days AS total_missed_days,
  (SELECT COUNT(*) FROM habit_logs hl
   WHERE hl.habit_id  = h.id
     AND hl.completed = 1
     AND hl.log_date >= CURDATE() - INTERVAL 13 DAY) AS completions_14d,
  CASE
    WHEN (SELECT COUNT(*) FROM habit_logs hl
          WHERE hl.habit_id  = h.id
            AND hl.completed = 1
            AND hl.log_date >= CURDATE() - INTERVAL 13 DAY) <= 4 THEN 'High'
    WHEN (SELECT COUNT(*) FROM habit_logs hl
          WHERE hl.habit_id  = h.id
            AND hl.completed = 1
            AND hl.log_date >= CURDATE() - INTERVAL 13 DAY) <= 8 THEN 'Medium'
    ELSE 'Low'
  END AS risk_level
FROM habits h
JOIN categories c ON c.id = h.category_id
WHERE h.is_archived = 0;

CREATE OR REPLACE VIEW vw_calendar_current_month AS
SELECT
  hl.user_id,
  hl.log_date,
  COUNT(DISTINCT CASE WHEN hl.completed = 1 THEN hl.habit_id END) AS habits_completed,
  COUNT(DISTINCT hl.habit_id)                                      AS habits_touched,
  ROUND(
    COUNT(DISTINCT CASE WHEN hl.completed = 1 THEN hl.habit_id END) * 100.0
    / NULLIF((SELECT COUNT(*) FROM habits h
              WHERE h.user_id = hl.user_id AND h.is_archived = 0), 0)
  , 1) AS day_completion_pct
FROM habit_logs hl
WHERE YEAR(hl.log_date)  = YEAR(CURDATE())
  AND MONTH(hl.log_date) = MONTH(CURDATE())
GROUP BY hl.user_id, hl.log_date
ORDER BY hl.log_date;

-- ═══════════════════════════════════════════════════════════════
-- SAMPLE DATA
-- ═══════════════════════════════════════════════════════════════

INSERT INTO categories (slug, label, icon_emoji, color_hex, sort_order) VALUES
  ('health',       'Health',       '🏥', '#ef4444', 1),
  ('study',        'Study',        '📚', '#0ea5e9', 2),
  ('fitness',      'Fitness',      '💪', '#22c55e', 3),
  ('personal',     'Personal',     '🌱', '#f59e0b', 4),
  ('productivity', 'Productivity', '⚡', '#ec4899', 5);

INSERT INTO users
  (username, email, password_hash, display_name, is_active, email_verified)
VALUES
  ('ravi_patel',  'ravi@example.com',   '$2y$12$DEMO_HASH_REPLACE_REGISTER_001', 'Ravi Patel', 1, 1),
  ('priya_shah',  'priya@example.com',  '$2y$12$DEMO_HASH_REPLACE_REGISTER_002', 'Priya Shah', 1, 1),
  ('demo_user',   'demo@habitflow.app', '$2y$12$DEMO_HASH_REPLACE_REGISTER_003', 'Demo User',  1, 1);

INSERT INTO user_settings
  (user_id, theme, accent_color, font_size, notifications_enabled, reminder_time, streak_alerts)
VALUES
  (1, 'dark',  'purple', 'medium', 1, '07:00:00', 1),
  (2, 'light', 'blue',   'large',  1, '08:30:00', 1),
  (3, 'dark',  'green',  'medium', 0, '08:00:00', 1);

INSERT INTO habits
  (user_id, category_id, name, description, icon_emoji, color_hex,
   frequency, start_date, current_streak, longest_streak, total_completions, missed_days)
VALUES
  (1,1,'Drink 8 Glasses of Water','Stay hydrated throughout the day',      '💧','#ef4444','daily',   DATE_SUB(CURDATE(),INTERVAL 30 DAY),7,14,24,6),
  (1,3,'Morning Run',             '30-minute jog every morning',           '🏃','#22c55e','daily',   DATE_SUB(CURDATE(),INTERVAL 45 DAY),5,21,30,15),
  (1,2,'Read 20 Pages',           'Non-fiction or programming books',       '📖','#0ea5e9','daily',   DATE_SUB(CURDATE(),INTERVAL 20 DAY),12,12,18,2),
  (1,4,'Meditate 10 Minutes',     'Mindfulness and breathing exercises',    '🧘','#f59e0b','daily',   DATE_SUB(CURDATE(),INTERVAL 60 DAY),3,30,45,15),
  (1,5,'Plan Tomorrow Tonight',   'Write 3 tasks for next day',             '📝','#ec4899','daily',   DATE_SUB(CURDATE(),INTERVAL 15 DAY),8,8,12,3),
  (1,3,'Home Workout',            '20-min bodyweight session',              '🏋','#16a34a','weekdays',DATE_SUB(CURDATE(),INTERVAL 25 DAY),4,10,15,5),
  (2,1,'Sleep by 10 PM',          'Consistent sleep schedule',              '💤','#ef4444','daily',   DATE_SUB(CURDATE(),INTERVAL 14 DAY),6,6,10,4),
  (2,2,'JavaScript Practice',     'LeetCode and personal projects',         '💻','#0ea5e9','daily',   DATE_SUB(CURDATE(),INTERVAL 30 DAY),9,9,25,5),
  (2,4,'Gratitude Journal',       'Write 3 things I am grateful for',       '✍', '#f59e0b','daily',  DATE_SUB(CURDATE(),INTERVAL 10 DAY),10,10,10,0),
  (3,1,'Take Vitamins',           'Daily multivitamin after breakfast',      '💊','#ef4444','daily',   DATE_SUB(CURDATE(),INTERVAL 7 DAY),3,3,5,2),
  (3,5,'No Phone 1st Hour',       'No screen for first hour of day',         '🌅','#ec4899','daily',  DATE_SUB(CURDATE(),INTERVAL 7 DAY),2,3,4,3);

INSERT INTO habit_logs (habit_id, user_id, log_date, completed) VALUES
  (1,1,DATE_SUB(CURDATE(),INTERVAL 13 DAY),1),(1,1,DATE_SUB(CURDATE(),INTERVAL 12 DAY),1),
  (1,1,DATE_SUB(CURDATE(),INTERVAL 11 DAY),0),(1,1,DATE_SUB(CURDATE(),INTERVAL 10 DAY),1),
  (1,1,DATE_SUB(CURDATE(),INTERVAL  9 DAY),0),(1,1,DATE_SUB(CURDATE(),INTERVAL  8 DAY),1),
  (1,1,DATE_SUB(CURDATE(),INTERVAL  7 DAY),1),(1,1,DATE_SUB(CURDATE(),INTERVAL  6 DAY),1),
  (1,1,DATE_SUB(CURDATE(),INTERVAL  5 DAY),1),(1,1,DATE_SUB(CURDATE(),INTERVAL  4 DAY),1),
  (1,1,DATE_SUB(CURDATE(),INTERVAL  3 DAY),1),(1,1,DATE_SUB(CURDATE(),INTERVAL  2 DAY),1),
  (1,1,DATE_SUB(CURDATE(),INTERVAL  1 DAY),1),(1,1,CURDATE(),1),
  (2,1,DATE_SUB(CURDATE(),INTERVAL 10 DAY),1),(2,1,DATE_SUB(CURDATE(),INTERVAL  9 DAY),1),
  (2,1,DATE_SUB(CURDATE(),INTERVAL  8 DAY),0),(2,1,DATE_SUB(CURDATE(),INTERVAL  7 DAY),1),
  (2,1,DATE_SUB(CURDATE(),INTERVAL  6 DAY),1),(2,1,DATE_SUB(CURDATE(),INTERVAL  5 DAY),1),
  (2,1,DATE_SUB(CURDATE(),INTERVAL  4 DAY),1),(2,1,DATE_SUB(CURDATE(),INTERVAL  3 DAY),1),
  (2,1,DATE_SUB(CURDATE(),INTERVAL  2 DAY),1),(2,1,DATE_SUB(CURDATE(),INTERVAL  1 DAY),1),
  (2,1,CURDATE(),1),
  (3,1,DATE_SUB(CURDATE(),INTERVAL 12 DAY),1),(3,1,DATE_SUB(CURDATE(),INTERVAL 11 DAY),1),
  (3,1,DATE_SUB(CURDATE(),INTERVAL 10 DAY),1),(3,1,DATE_SUB(CURDATE(),INTERVAL  9 DAY),1),
  (3,1,DATE_SUB(CURDATE(),INTERVAL  8 DAY),1),(3,1,DATE_SUB(CURDATE(),INTERVAL  7 DAY),1),
  (3,1,DATE_SUB(CURDATE(),INTERVAL  6 DAY),1),(3,1,DATE_SUB(CURDATE(),INTERVAL  5 DAY),1),
  (3,1,DATE_SUB(CURDATE(),INTERVAL  4 DAY),1),(3,1,DATE_SUB(CURDATE(),INTERVAL  3 DAY),1),
  (3,1,DATE_SUB(CURDATE(),INTERVAL  2 DAY),1),(3,1,DATE_SUB(CURDATE(),INTERVAL  1 DAY),1),
  (4,1,DATE_SUB(CURDATE(),INTERVAL  7 DAY),1),(4,1,DATE_SUB(CURDATE(),INTERVAL  5 DAY),1),
  (4,1,DATE_SUB(CURDATE(),INTERVAL  3 DAY),1),(4,1,DATE_SUB(CURDATE(),INTERVAL  1 DAY),1),
  (5,1,DATE_SUB(CURDATE(),INTERVAL  8 DAY),1),(5,1,DATE_SUB(CURDATE(),INTERVAL  7 DAY),1),
  (5,1,DATE_SUB(CURDATE(),INTERVAL  6 DAY),1),(5,1,DATE_SUB(CURDATE(),INTERVAL  5 DAY),1),
  (5,1,DATE_SUB(CURDATE(),INTERVAL  4 DAY),1),(5,1,DATE_SUB(CURDATE(),INTERVAL  3 DAY),1),
  (5,1,DATE_SUB(CURDATE(),INTERVAL  2 DAY),1),(5,1,DATE_SUB(CURDATE(),INTERVAL  1 DAY),1),
  (8,2,DATE_SUB(CURDATE(),INTERVAL  9 DAY),1),(8,2,DATE_SUB(CURDATE(),INTERVAL  8 DAY),1),
  (8,2,DATE_SUB(CURDATE(),INTERVAL  7 DAY),1),(8,2,DATE_SUB(CURDATE(),INTERVAL  6 DAY),1),
  (8,2,DATE_SUB(CURDATE(),INTERVAL  5 DAY),1),(8,2,DATE_SUB(CURDATE(),INTERVAL  4 DAY),1),
  (8,2,DATE_SUB(CURDATE(),INTERVAL  3 DAY),1),(8,2,DATE_SUB(CURDATE(),INTERVAL  2 DAY),1),
  (8,2,DATE_SUB(CURDATE(),INTERVAL  1 DAY),1),(8,2,CURDATE(),1);

INSERT INTO reminders (user_id, habit_id, reminder_time, is_enabled, days_of_week, message) VALUES
  (1, NULL, '07:00:00', 1, NULL, 'Good morning! Time to build your habits'),
  (2, NULL, '08:30:00', 1, NULL, 'Start your day strong!'),
  (3, NULL, '08:00:00', 0, NULL, 'Daily habit reminder');

INSERT INTO achievements (user_id, badge_id, badge_title, badge_icon, badge_desc) VALUES
  (1,'first_habit', 'First Step',   '🌱','Added your first habit'),
  (1,'five_habits', 'Goal Setter',  '🎯','Added 5 habits'),
  (1,'streak_3',    'On Fire',      '🔥','3-day streak on any habit'),
  (1,'streak_7',    'Week Warrior', '⚡','7-day streak on any habit'),
  (2,'first_habit', 'First Step',   '🌱','Added your first habit'),
  (3,'first_habit', 'First Step',   '🌱','Added your first habit');

INSERT INTO export_history
  (user_id, export_type, file_name, file_size_kb, habit_count, date_range_from, date_range_to)
VALUES
  (1,'csv','habitflow-export.csv',12.40,6,DATE_SUB(CURDATE(),INTERVAL 30 DAY),CURDATE()),
  (1,'pdf','habitflow-report.pdf',45.20,6,DATE_SUB(CURDATE(),INTERVAL 30 DAY),CURDATE()),
  (2,'csv','habitflow-export.csv', 5.70,3,DATE_SUB(CURDATE(),INTERVAL 14 DAY),CURDATE());

-- ═══════════════════════════════════════════════════════════════
-- VERIFICATION — run after import, all must return green results
-- ═══════════════════════════════════════════════════════════════

SELECT 'categories'    AS table_name, COUNT(*) AS row_count FROM categories    UNION ALL
SELECT 'users'         AS table_name, COUNT(*) AS row_count FROM users          UNION ALL
SELECT 'user_settings' AS table_name, COUNT(*) AS row_count FROM user_settings  UNION ALL
SELECT 'habits'        AS table_name, COUNT(*) AS row_count FROM habits         UNION ALL
SELECT 'habit_logs'    AS table_name, COUNT(*) AS row_count FROM habit_logs     UNION ALL
SELECT 'reminders'     AS table_name, COUNT(*) AS row_count FROM reminders      UNION ALL
SELECT 'achievements'  AS table_name, COUNT(*) AS row_count FROM achievements   UNION ALL
SELECT 'export_history'AS table_name, COUNT(*) AS row_count FROM export_history;

SELECT habit_id, id, name, category_label, frequency
FROM vw_habits_with_category WHERE user_id = 1;

SELECT habit_id, id, name, category, current_streak, completed_today
FROM vw_today_status WHERE user_id = 1;

SELECT day_short, habits_completed, total_habits, completion_pct
FROM vw_analytics_weekly WHERE user_id = 1;

SELECT habit_id, id, name, current_streak, performance_score
FROM vw_best_habit WHERE user_id = 1 AND perf_rank = 1;
