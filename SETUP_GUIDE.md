# 🌱 HabitFlow — Complete Setup Guide (All 6 Phases)

---

## ✅ STEP 0 — Install Required Software (One-Time)

Install all three before doing anything else:

### 1. XAMPP (gives you MySQL + Apache)
- **Download:** https://www.apachefriends.org/download.html
- Choose Windows version → Run installer → click Next on everything
- After install, open **XAMPP Control Panel** from Start menu

### 2. Node.js 18+
- **Download:** https://nodejs.org → click the **LTS** button
- Run installer → click Next on everything
- **Verify:** open any terminal → type `node -v` → should show `v18.x.x` or higher

### 3. VS Code
- **Download:** https://code.visualstudio.com/download
- Run installer

---

## ✅ STEP 1 — Install VS Code Extensions

Open VS Code → press `Ctrl+Shift+X` → search and install each:

| Extension | Author | Why you need it |
|---|---|---|
| **Live Server** | Ritwick Dey | Opens HTML in browser, auto-reloads on save |
| **ESLint** | Microsoft | Highlights JS errors as you type |
| **Prettier** | Prettier | Auto-formats code on save |
| **Thunder Client** | Rangav | Test API endpoints inside VS Code (like Postman) |
| **MySQL** | cweijan | Browse your database tables inside VS Code |
| **DotENV** | mikestead | Highlights `.env` files with colors |
| **Auto Rename Tag** | Jun Han | Auto-renames HTML closing tags |

---

## ✅ STEP 2 — Extract the Project

Right-click `HabitFlow-Final-Complete.zip` → **Extract All** → choose a folder.

You will get:
```
HabitFlow/
├── habit_tracker_db.sql     ← Database file (import this)
├── fix_mysql_password.sql   ← Run this if you get Access Denied
├── SETUP_GUIDE.md           ← This file
├── backend/                 ← Node.js API server
└── frontend/                ← Website (HTML/CSS/JS)
```

Open VS Code → **File → Open Folder** → select the `HabitFlow` folder.

---

## ✅ STEP 3 — Start XAMPP

1. Open **XAMPP Control Panel** (search in Start menu)
2. Click **Start** next to **Apache** → wait for green ✅
3. Click **Start** next to **MySQL** → wait for green ✅

```
[Apache]  ✅ Running  Port 80, 443
[MySQL]   ✅ Running  Port 3306
```

> ⚠️ Keep XAMPP open the entire time you work. Both must stay green.

---

## ✅ STEP 4 — Fix MySQL Password (if needed)

**Problem:** Newer XAMPP versions set a MySQL root password automatically.
**Symptom:** When you run `node server.js` you see:
```
❌  MySQL connection failed!
    Error: Access denied for user 'root'@'localhost' (using password: NO)
```

**Fix in 3 steps:**

1. Open your browser → go to: **http://localhost/phpmyadmin**
2. Click the **SQL** tab at the top
3. Paste this and click **Go**:
   ```sql
   SET PASSWORD FOR 'root'@'localhost' = PASSWORD('');
   ```
4. Restart MySQL in XAMPP (Stop → Start)

> **OR** open `backend/.env` and set `DB_PASSWORD=your_mysql_password`
> **OR** run the included `fix_mysql_password.sql` file in phpMyAdmin SQL tab

---

## ✅ STEP 5 — Import the Database

1. Go to: **http://localhost/phpmyadmin**
2. Click the **Import** tab at the top
3. Click **Choose File** → select `habit_tracker_db.sql` from your HabitFlow folder
4. Scroll down → click **Go**
5. You should see: `Import has been successfully finished`

In the left sidebar you will now see `habit_tracker_db` with **8 tables**:
- `categories` — 5 rows (health, study, fitness, personal, productivity)
- `users` — 3 demo users
- `user_settings`, `habits`, `habit_logs`, `reminders`, `achievements`, `export_history`

And **14 views** + **5 stored procedures** covering all 6 phases.

---

## ✅ STEP 6 — Install Backend Dependencies

Open VS Code Terminal: press `` Ctrl+` `` (backtick key, top-left of keyboard)

```bash
cd backend
npm install
```

**Expected output:**
```
added 126 packages in 3s
found 0 vulnerabilities
```

### What npm installs:

| Package | Purpose |
|---|---|
| `express` | Web framework — handles all API routes |
| `mysql2` | MySQL driver — talks to XAMPP database |
| `bcryptjs` | Password hashing — secures passwords (never stores plain text) |
| `jsonwebtoken` | JWT tokens — keeps users logged in |
| `cors` | Allows browser to call the API |
| `dotenv` | Reads your `.env` config file |
| `nodemon` | Dev tool — auto-restarts server when you save a file |

---

## ✅ STEP 7 — Start the Backend Server

In the VS Code terminal (make sure you're in the `backend` folder):

```bash
node server.js
```

### ✅ Success — you should see:
```
✅  MySQL connected  →  habit_tracker_db@localhost

╔══════════════════════════════════════════╗
║   🌱  HabitFlow API  —  Server Started   ║
╠══════════════════════════════════════════╣
║  URL  :  http://localhost:5000           ║
║  Mode :  development                     ║
║  DB   :  habit_tracker_db               ║
╚══════════════════════════════════════════╝

  POST   /api/auth/register
  POST   /api/auth/login
  GET    /api/auth/profile        [JWT]
  ...
```

> **Leave this terminal open.** Don't close it while working.

---

## ✅ STEP 8 — Open the Frontend

1. In VS Code Explorer (left sidebar), expand `frontend/`
2. Right-click **`login.html`**
3. Click **"Open with Live Server"**

Your browser opens at: **http://127.0.0.1:5500/login.html**

> The **Go Live** button also appears in the VS Code bottom blue status bar.

---

## ✅ STEP 9 — Test the App

1. Go to **http://127.0.0.1:5500/register.html**
2. Fill in username, email, password → click **Create Account**
3. You'll be redirected to the dashboard automatically
4. Add your first habit on the dashboard!

---

## 🔴 Error Solutions

| Error | Solution |
|---|---|
| `Access denied for user 'root'` | Do Step 4 (fix MySQL password) |
| `ECONNREFUSED` / `connect ETIMEDOUT` | XAMPP MySQL is not running — open XAMPP → Start MySQL |
| `Unknown database 'habit_tracker_db'` | Do Step 5 (import the SQL file) |
| `Cannot find module 'express'` | Do Step 6 (run `npm install`) |
| `Port 5000 already in use` | Open `backend/.env` → change `PORT=5001` → restart server |
| CORS error in browser | Check `CLIENT_ORIGIN` in `backend/.env` matches your Live Server URL exactly |
| Stuck on login redirect loop | Open DevTools → Application → Local Storage → delete `hf_token` → refresh |
| `Live Server` option not showing | Install the Live Server extension (Step 1) → restart VS Code |

---

## 📁 Complete File Structure

```
HabitFlow/
│
├── habit_tracker_db.sql          ← ★ Import this into phpMyAdmin (Step 5)
├── fix_mysql_password.sql        ← Run if you get Access Denied error
├── SETUP_GUIDE.md                ← This file
│
├── backend/                      ← Node.js + Express API (Phase 2, 4, 5, 6)
│   ├── .env                      ← DB credentials + JWT secret (edit here)
│   ├── package.json              ← npm dependencies
│   ├── server.js                 ← ★ Run this: node server.js
│   │
│   ├── config/
│   │   └── db.js                 ← MySQL connection pool
│   │
│   ├── controllers/
│   │   ├── authController.js     ← Register, login, profile, settings
│   │   ├── habitController.js    ← Create, read, update, delete habits
│   │   ├── trackingController.js ← Mark complete, streak, dashboard stats
│   │   └── analyticsController.js ← Charts, calendar, best habit, missed habits
│   │
│   ├── middleware/
│   │   └── authMiddleware.js     ← JWT token verification
│   │
│   ├── routes/
│   │   ├── authRoutes.js         ← /api/auth/*
│   │   ├── habitRoutes.js        ← /api/habits/*
│   │   ├── trackingRoutes.js     ← /api/habits/:id/complete, /api/dashboard/stats
│   │   └── analyticsRoutes.js   ← /api/analytics/*, /api/calendar/*
│   │
│   └── utils/
│       ├── dateUtils.js          ← Date formatting, weekday helpers
│       ├── streakUtils.js        ← Streak calculation engine
│       └── analyticsUtils.js    ← Chart data builders, productivity score
│
└── frontend/                     ← HTML + CSS + JS website (Phase 3)
    ├── login.html                ← ★ Open this with Live Server (Step 8)
    ├── register.html             ← Register page
    ├── index.html                ← Main dashboard (auto-redirects if not logged in)
    │
    ├── css/
    │   ├── variables.css         ← CSS custom properties (colors, fonts)
    │   ├── style.css             ← Main styles
    │   ├── auth.css              ← Login/register styles
    │   ├── animations.css        ← Transitions
    │   ├── theme.css             ← Dark/light theme
    │   └── responsive.css        ← Mobile styles
    │
    ├── js/
    │   ├── auth.js               ← JWT storage, route guards, login/register
    │   ├── api.js                ← All API call functions (calls backend)
    │   ├── app.js                ← Main app logic
    │   ├── utils/
    │   │   └── constants.js      ← App constants (categories, icons)
    │   └── views/
    │       ├── NavbarView.js
    │       ├── DashboardView.js
    │       ├── HabitView.js
    │       ├── AnalyticsView.js
    │       ├── CalendarView.js
    │       └── SettingsView.js
    │
    └── assets/
        ├── icons/                ← Category SVG icons
        └── images/               ← Empty state illustration
```

---

## 🔌 All 23 API Endpoints

| Method | URL | Auth | Phase |
|---|---|---|---|
| `POST` | `/api/auth/register` | ❌ | 2 |
| `POST` | `/api/auth/login` | ❌ | 2 |
| `GET` | `/api/auth/profile` | ✅ JWT | 2 |
| `PUT` | `/api/auth/profile` | ✅ JWT | 2 |
| `PUT` | `/api/auth/change-password` | ✅ JWT | 2 |
| `PUT` | `/api/auth/settings` | ✅ JWT | 2 |
| `POST` | `/api/auth/logout` | ✅ JWT | 2 |
| `POST` | `/api/habits` | ✅ JWT | 4 |
| `GET` | `/api/habits` | ✅ JWT | 4 |
| `GET` | `/api/habits/:id` | ✅ JWT | 4 |
| `PUT` | `/api/habits/:id` | ✅ JWT | 4 |
| `DELETE` | `/api/habits/:id` | ✅ JWT | 4 |
| `POST` | `/api/habits/:id/complete` | ✅ JWT | 5 |
| `DELETE` | `/api/habits/:id/complete` | ✅ JWT | 5 |
| `GET` | `/api/habits/:id/streak` | ✅ JWT | 5 |
| `GET` | `/api/dashboard/stats` | ✅ JWT | 5 |
| `GET` | `/api/analytics/weekly` | ✅ JWT | 6 |
| `GET` | `/api/analytics/monthly` | ✅ JWT | 6 |
| `GET` | `/api/analytics/category` | ✅ JWT | 6 |
| `GET` | `/api/analytics/completion` | ✅ JWT | 6 |
| `GET` | `/api/analytics/best-habit` | ✅ JWT | 6 |
| `GET` | `/api/analytics/missed-habits` | ✅ JWT | 6 |
| `GET` | `/api/calendar/:month/:year` | ✅ JWT | 6 |

---

## 🔄 Daily Workflow (Every Time You Work)

```
1. Open XAMPP Control Panel → Start Apache + MySQL
2. Open VS Code → open HabitFlow folder
3. Open terminal (Ctrl+`)
4. cd backend
5. node server.js           ← keep this terminal open!
6. Right-click login.html → Open with Live Server
7. Code away!
```

**To stop the server:** press `Ctrl+C` in the terminal.
**Auto-restart on changes:** use `npm run dev` instead of `node server.js`.

---

## 💡 Pro Tips

- **Test APIs without curl:** Use the **Thunder Client** VS Code extension → create requests with your JWT token
- **View DB tables in VS Code:** Use the **MySQL extension** → connect to localhost:3306 root (no password)
- **API token for Thunder Client:** After login, copy the `token` from the response → add header `Authorization: Bearer YOUR_TOKEN`
- **CORS mismatch?** Check that `CLIENT_ORIGIN` in `backend/.env` exactly matches what Live Server shows in the browser URL bar
- **See what's in your DB?** Open http://localhost/phpmyadmin → click `habit_tracker_db` → click any table
