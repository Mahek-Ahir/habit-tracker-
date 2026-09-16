# ⚡ HabitFlow — Production Habit Tracker

> **Build habits that last a lifetime.** A complete, production-level habit tracking web app built with pure HTML, CSS & Vanilla JavaScript — zero frameworks, zero build tools, zero dependencies.

[![Phases](https://img.shields.io/badge/Phases-5%20Complete-7c3aed)](#)
[![Tech](https://img.shields.io/badge/Tech-HTML%20%7C%20CSS%20%7C%20JS-0ea5e9)](#)
[![Charts](https://img.shields.io/badge/Charts-Chart.js%204.4-22c55e)](#)
[![License](https://img.shields.io/badge/License-MIT-f59e0b)](#)

---

## 🚀 Features

### Phase 1 — UI/UX Foundation
- 🎨 Glassmorphism dark/light theme with CSS custom properties
- 📱 Fully responsive (375px → 1400px+)
- 🧭 Single-page navigation (Dashboard · Habits · Analytics · Calendar · Settings)
- ✨ Smooth animations, hover effects, micro-interactions
- 🌗 Dark/Light mode toggle with persistence

### Phase 2 — Full CRUD + Data Layer
- ➕ Add habits with icon, color, category, frequency, start date
- ✏️ Edit any habit with pre-filled modal
- 🗑️ Delete with confirmation modal
- 🔍 Live search by name or category
- 🔽 Filter tabs: All · Done · Pending · Missed · 5 Categories
- 💾 **100% localStorage** — all data survives browser refresh
- ✅ Form validation with duplicate detection and shake animation
- 🔔 Toast notification system (success / warning / error / info)

### Phase 3 — Tracking System & Streak Logic
- 📅 One completion per day — toggle on/off
- 🔥 **Streak calculation** — consecutive days, resets on miss
- 🏆 Longest streak tracked permanently
- ⚠️ Missed days counter per habit
- 📊 Daily progress bar with gradient and contextual status
- 💬 Dynamic motivational messages (6 levels based on % completion)
- 📆 Weekly summary mini-bars on dashboard
- 🌱 Habit status badges: Completed · Pending · Upcoming
- 🎯 7-day dot track on every habit card
- 🏅 **12 Achievement badges** with unlock toasts

### Phase 4 — Analytics Dashboard (Chart.js)
- 📈 **Line chart** — 14-day weekly progress
- 📊 **Bar chart** — 6-month monthly completion
- 🥧 **Pie chart** — category distribution
- 🍩 **Doughnut chart** — today's completion vs pending
- 🌡️ 70-day activity heatmap
- 📉 Missed habit analysis (14-day risk: Low / Medium / High)
- 🥇 Streak leaderboard (top 5 with medals)
- 🏅 Best & Worst performer cards (14-day rate)
- 💯 **Productivity Score** /100 (composite metric)
- 6 analytics dashboard stat cards

### Phase 5 — Production Polish
- 🔔 **Browser notifications** — daily reminders with permission flow
- 📄 **PDF export** — professional report via jsPDF
- 📊 **CSV & JSON export** — complete data backup
- ⌨️ **Keyboard navigation** — Alt+1-5, Alt+N, Esc
- ♿ **Accessibility** — ARIA labels, roles, skip link, focus rings
- 💀 **Skeleton loaders** — animated placeholders during render
- 🌟 **Premium toasts** — slide-in with dismiss button
- ⚙️ **Font size control** — Small / Medium / Large / X-Large
- 🔒 **Reset confirmation modal** — custom popup (not native alert)
- 📱 **Mobile-optimized** — bottom-sheet toasts, touch targets
- 🖨️ **Print styles** — clean printable output
- 🌐 **SEO meta tags** — OpenGraph, description, keywords
- 📦 Page loader with spinner

---

## 🗂️ Folder Structure

```
HabitTracker/
├── index.html                  ← Single entry point (SEO-optimized)
│
├── assets/
│   ├── images/
│   │   └── empty-state.svg     ← Animated empty state illustration
│   └── icons/                  ← Category SVG icons
│       ├── health.svg
│       ├── fitness.svg
│       ├── study.svg
│       ├── personal.svg
│       └── productivity.svg
│
├── css/
│   ├── variables.css           ← Design tokens (colors, spacing, radii, transitions)
│   ├── animations.css          ← All @keyframes + animation utilities
│   ├── theme.css               ← Dark / Light theme overrides
│   ├── style.css               ← Full component styles (Phases 1–5)
│   └── responsive.css          ← Media queries (mobile → desktop)
│
├── js/
│   ├── app.js                  ← Model · ToastView · SkeletonLoader ·
│   │                              NotificationService · PDFExport ·
│   │                              AchievementEngine · App Controller
│   ├── utils/
│   │   └── constants.js        ← All constants + 15 utility functions
│   └── views/
│       ├── NavbarView.js       ← Navigation, theme, mobile menu, scroll
│       ├── DashboardView.js    ← Stats, progress, motivational msg, weekly, achievements
│       ├── HabitView.js        ← Cards, CRUD modal, filter, search
│       ├── AnalyticsView.js    ← 4 Chart.js charts, heatmap, leaderboard
│       ├── CalendarView.js     ← Monthly calendar, day detail
│       └── SettingsView.js     ← All settings with live state sync
│
└── README.md
```

---

## 🛠️ Installation

### Option 1 — Open directly (no server needed)
```bash
# Clone or unzip the project
open HabitTracker/index.html
# — or double-click index.html in your file manager
```

### Option 2 — Local development server
```bash
# Python (built-in)
cd HabitTracker
python -m http.server 3000
# Visit: http://localhost:3000

# Node.js
npx serve .

# VS Code
# Install "Live Server" extension → right-click index.html → Open with Live Server
```

---

## 🎨 Design System

| Token | Value |
|---|---|
| Primary Font | Inter |
| Display Font | Space Grotesk |
| Icons | Font Awesome 6.5 Free |
| Charts | Chart.js 4.4.0 |
| PDF | jsPDF 2.5.1 |
| Default Theme | Dark |
| Accent Colors | Purple · Blue · Green · Amber · Pink |
| Border Radius | 8px / 14px / 20px / 28px |
| Transition | 150ms / 250ms / 400ms cubic-bezier |

---

## ♿ Accessibility

- Skip-to-content link (`Tab` on page load)
- All interactive elements have `aria-label` or `aria-labelledby`
- Modal dialogs use `role="dialog"` and `aria-modal="true"`
- Toast messages use `role="alert"` and `aria-live="polite"`
- Keyboard shortcuts for all navigation (Alt+1-5)
- Focus rings on all focusable elements (`:focus-visible`)
- Reduced motion respect (`@media prefers-reduced-motion`)
- High contrast mode support (`@media prefers-contrast: high`)

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Alt + 1` | Go to Dashboard |
| `Alt + 2` | Go to Habits |
| `Alt + 3` | Go to Analytics |
| `Alt + 4` | Go to Calendar |
| `Alt + 5` | Go to Settings |
| `Alt + N` | Open Add Habit modal |
| `Escape` | Close any open modal |

---

## 📦 Phase Summary

| Phase | Status | Key Additions |
|---|---|---|
| **Phase 1** | ✅ Complete | Full UI — glassmorphism, all sections, responsive |
| **Phase 2** | ✅ Complete | CRUD, localStorage, search, filters, toast system |
| **Phase 3** | ✅ Complete | Streak logic, daily tracking, motivational messages, achievements |
| **Phase 4** | ✅ Complete | Chart.js (line/bar/pie/doughnut), analytics dashboard, PDF |
| **Phase 5** | ✅ Complete | Notifications, PDF export, keyboard nav, a11y, skeleton loaders |

---

## 🔮 Future Improvements (Phase 6+)

- [ ] PWA — offline support with Service Worker + Web App Manifest
- [ ] Cloud sync — Firebase / Supabase real-time backend
- [ ] Habit templates — one-click preset habit collections
- [ ] Social sharing — share streak screenshots
- [ ] Advanced recurrence — specific weekdays, every N days
- [ ] Habit journaling — notes per completion
- [ ] Widget support — home screen widget (Scriptable / iOS)
- [ ] Data import — restore from JSON backup
- [ ] Multi-user profiles — local profile switching
- [ ] Apple Watch / Wear OS integration

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

*HabitFlow © 2026 — Built with ❤️ in pure HTML, CSS & Vanilla JavaScript*
