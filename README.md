# 🌱 HabitFlow — Production Habit Tracker Platform

![Version](https://img.shields.io/badge/version-8.0.0-purple.svg)
![Stack](https://img.shields.io/badge/stack-Node.js%20|%20Express%20|%20MySQL%20|%20Vanilla%20JS-blue.svg)
![Build](https://img.shields.io/badge/build-passing-brightgreen.svg)

HabitFlow is a full-stack, production-level habit tracker designed to help users build lasting habits with actionable analytics, streak management, browser push notifications, printable PDF reports, CSV data exports, and custom user preferences.

---

## 🚀 Phase 1 – Phase 8 Features Overview

### 🎨 Frontend & Design Aesthetics
- **Modern Responsive Design**: Dark mode glassmorphism UI built with Vanilla CSS variables and micro-animations.
- **Toast Notification Engine**: Dynamic popups for instant feedback (success, error, warning, info).
- **Confirmation Modals**: Reusable dialogs for critical actions like habit deletion and complete data resets.
- **Chart.js Analytics Dashboard**: 4 interactive charts (Weekly trend line, Monthly bar, Category distribution pie, Completion donut) + Activity Heatmap + Streak Leaderboard.
- **Interactive Calendar View**: Day-by-day status breakdown with visual indicators for completed, partial, missed, and active days.

### ⚙️ Backend & API Capabilities (Node.js + Express.js + MySQL)
- **Authentication & Security**: User registration, login, JWT token auth, bcrypt password hashing, input validation.
- **Database Views**: Pre-compiled MySQL views (`vw_habits_with_category`, `vw_today_status`, `vw_analytics_weekly`, `vw_best_habit`, `vw_user_profile`).
- **Export Data Services**:
  - `GET /api/export/csv`: Export habit summaries and 90-day completion logs as CSV file.
  - `GET /api/export/pdf`: Generate printable PDF reports using `pdfkit` complete with brand header, summary metrics, and status tables.
- **User Data Management**:
  - `DELETE /api/user/reset-data`: Transactional reset of habit logs, habits, reminders, and achievements.
- **Reminders & Settings Integration**:
  - `POST /api/reminders` & `GET /api/reminders`: Persist daily reminder time in MySQL `reminders` and `user_settings` tables.
  - `PUT /api/settings` & `GET /api/settings`: Synchronize theme, accent color, font size, notification preferences, and streak alert settings.

---

## 🛠️ Project Structure

```
HabitFlow/
├── backend/
│   ├── config/
│   │   └── db.js                 # MySQL pool & connection health check
│   ├── controllers/
│   │   ├── analyticsController.js # Analytics & calendar logic
│   │   ├── authController.js      # Auth, profile, password management
│   │   ├── exportController.js    # CSV & PDF export endpoints
│   │   ├── habitController.js     # Habit CRUD operations
│   │   ├── settingsController.js  # User settings, data reset, reminders
│   │   └── trackingController.js  # Completion logging & streak logic
│   ├── middleware/
│   │   └── authMiddleware.js      # JWT token authentication protect middleware
│   ├── routes/
│   │   ├── analyticsRoutes.js     # /api/analytics/* & /api/calendar/*
│   │   ├── authRoutes.js          # /api/auth/*
│   │   ├── exportRoutes.js         # /api/export/csv & /api/export/pdf
│   │   ├── habitRoutes.js         # /api/habits/*
│   │   ├── settingsRoutes.js      # /api/settings, /api/user/reset-data, /api/reminders
│   │   └── trackingRoutes.js      # /api/habits/:id/complete, /api/dashboard/stats
│   ├── services/
│   │   └── exportService.js       # CSV & PDF generation + export_history logging
│   ├── .env                       # Database & JWT configuration
│   ├── package.json
│   └── server.js                  # Express server entry point
├── docs/
│   └── backend-upgrade-plan.md    # Production upgrade plan (Firebase/MongoDB/Node)
├── frontend/
│   ├── css/                       # Modular CSS stylesheets (variables, theme, style, animations)
│   ├── js/
│   │   ├── utils/constants.js     # App constants & achievement definitions
│   │   ├── views/                 # View controllers (Dashboard, Habit, Analytics, Calendar, Settings, Navbar)
│   │   ├── api.js                 # Frontend API client for Express backend
│   │   ├── app.js                 # Main application controller & event wiring
│   │   ├── auth.js                # Auth guard, token storage, login logic
│   │   ├── DashboardController.js # Dashboard state
│   │   ├── HabitController.js     # Habit state
│   │   └── TrackingController.js  # Tracking state
│   ├── index.html                 # Main dashboard application
│   ├── login.html                 # Login page
│   └── register.html              # Registration page
├── habit_tracker_db.sql           # Complete MySQL Database Script (Phases 1–8)
└── README.md                      # Project documentation
```

---

## 🗄️ Database Setup (`habit_tracker_db`)

1. Start your local MySQL server (MySQL 8.0+ or MariaDB).
2. Import the schema script:
   ```bash
   mysql -u root -p < habit_tracker_db.sql
   ```
   *Note: If using empty password on localhost, run `mysql -u root < habit_tracker_db.sql`.*

3. The script creates the database `habit_tracker_db` with all 8 core tables:
   - `users`, `user_settings`, `categories`, `habits`, `habit_logs`, `reminders`, `achievements`, `export_history`
   - Plus all pre-compiled SQL views for instantaneous analytics.

---

## 📡 API Reference Summary

### Authentication Routes
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Create a new user account | No |
| `POST` | `/api/auth/login` | Authenticate user & receive JWT token | No |
| `GET`  | `/api/auth/profile` | Fetch authenticated user profile & settings | Yes |
| `PUT`  | `/api/auth/profile` | Update profile display name or avatar | Yes |
| `PUT`  | `/api/auth/change-password` | Change user password | Yes |

### Habits & Tracking Routes
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET`  | `/api/habits` | Get all active habits for user | Yes |
| `POST` | `/api/habits` | Create a new habit | Yes |
| `PUT`  | `/api/habits/:id` | Update habit details | Yes |
| `DELETE` | `/api/habits/:id` | Soft archive or delete habit | Yes |
| `POST` | `/api/habits/:id/complete` | Mark habit completed for date | Yes |
| `DELETE` | `/api/habits/:id/complete` | Unmark completion for date | Yes |
| `GET`  | `/api/dashboard/stats` | Fetch aggregated dashboard stats | Yes |

### Phase 8 Production Features Routes
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET`  | `/api/export/csv` | Download habit data & logs as CSV | Yes |
| `GET`  | `/api/export/pdf` | Download printable PDF performance report | Yes |
| `PUT`  | `/api/settings` | Save theme, accent, font, notification settings | Yes |
| `GET`  | `/api/settings` | Fetch user settings | Yes |
| `POST` | `/api/reminders` | Create or update daily reminder time | Yes |
| `GET`  | `/api/reminders` | Fetch user reminders | Yes |
| `DELETE` | `/api/user/reset-data` | Permanently reset all user habits and logs | Yes |

---

## 💻 Quick Start & Running Locally

### Step 1: Start Backend Server
```bash
cd backend
npm install
npm run dev
```
For local development, the server starts at `http://localhost:5000` and serves the frontend too.

### Step 2: Open Frontend Application
Open `http://localhost:5000/login.html` in your browser. Live Server at `http://localhost:5500` is still supported.

### Production deployment
1. Create a hosted MySQL database and import `habit_tracker_db.sql`.
2. Copy `backend/.env.example` to `backend/.env` on the server.
3. Set production values for `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, and a unique `JWT_SECRET` of at least 32 characters.
4. Set `NODE_ENV=production` and run:
  ```bash
  cd backend
  npm ci --omit=dev
  npm start
  ```
5. Open the deployed server URL. It serves the login page and `/api/health` provides the health check.

Never upload `backend/.env` or `backend/node_modules` to source control or a deployment bundle.

---

## 📄 License
This project is released under the MIT License.
