'use strict';
require('dotenv').config();

const path     = require('path');
const express  = require('express');
const cors     = require('cors');
const { testConnection } = require('./config/db');

const authRoutes      = require('./routes/authRoutes');
const habitRoutes     = require('./routes/habitRoutes');
const trackingRoutes  = require('./routes/trackingRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const exportRoutes    = require('./routes/exportRoutes');
const settingsRoutes = require('./routes/settingsRoutes');

const app  = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
  throw new Error('JWT_SECRET must be set to a random value of at least 32 characters in production.');
}

/* ── CORS ── */
const allowedOrigins = [
  ...(process.env.CLIENT_ORIGIN || '').split(',').map(origin => origin.trim()).filter(Boolean),
  'http://localhost:5500', 'http://127.0.0.1:5500',
  'http://localhost:3000', 'http://127.0.0.1:3000',
];
app.use(cors({
  origin: (origin, cb) => (!origin || allowedOrigins.includes(origin) || (!isProduction && origin === 'null'))
    ? cb(null, true) : cb(new Error(`CORS: ${origin} not allowed`)),
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true,
  optionsSuccessStatus: 200,
}));

/* ── Body parsers ── */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve the static frontend from the same origin as the API for a one-command deployment.
app.use(express.static(path.join(__dirname, '..', 'frontend')));

/* ── Dev logger ── */
if (process.env.NODE_ENV === 'development') {
  app.use((req, _res, next) => { console.log(`[${new Date().toISOString()}]  ${req.method}  ${req.originalUrl}`); next(); });
}

/* ── Health check ── */
app.get('/',         (_req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'login.html')));
app.get('/api/health',(_req, res) => res.json({ success: true, status: 'OK', uptime: `${Math.floor(process.uptime())}s` }));

/* ── Routes ── */
app.use('/api/auth',   authRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api',        trackingRoutes);   // → /api/habits/:id/complete, /api/habits/:id/streak, /api/dashboard/stats
app.use('/api',        analyticsRoutes);  // → /api/analytics/*, /api/calendar/:month/:year
app.use('/api',        exportRoutes);     // → /api/export/csv, /api/export/pdf
app.use('/api',        settingsRoutes);   // → /api/settings, /api/user/reset-data, /api/reminders

/* ── 404 handler ── */
app.use((_req, res) => res.status(404).json({ success: false, message: 'Route not found.' }));

/* ── Global error handler ── */
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  if (err.message && err.message.startsWith('CORS:')) return res.status(403).json({ success: false, message: err.message });
  if (err.type === 'entity.parse.failed')              return res.status(400).json({ success: false, message: 'Invalid JSON in request body.' });
  res.status(500).json({ success: false, message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error.' });
});

/* ── Start ── */
async function start() {
  await testConnection();
  app.listen(PORT, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════╗');
    console.log('║   🌱  HabitFlow API  —  Server Started   ║');
    console.log('╠══════════════════════════════════════════╣');
    console.log(`║  URL  :  http://localhost:${PORT}           ║`);
    console.log(`║  Mode :  ${(process.env.NODE_ENV||'development').padEnd(32)}║`);
    console.log(`║  DB   :  ${(process.env.DB_NAME||'habit_tracker_db').padEnd(32)}║`);
    console.log('╚══════════════════════════════════════════╝');
    console.log('');
    console.log('  POST   /api/auth/register');
    console.log('  POST   /api/auth/login');
    console.log('  GET    /api/auth/profile          [JWT]');
    console.log('  PUT    /api/auth/profile          [JWT]');
    console.log('  PUT    /api/auth/change-password  [JWT]');
    console.log('  PUT    /api/auth/settings         [JWT]');
    console.log('  POST   /api/auth/logout           [JWT]');
    console.log('  POST   /api/habits                [JWT]');
    console.log('  GET    /api/habits                [JWT]');
    console.log('  GET    /api/habits/:id            [JWT]');
    console.log('  PUT    /api/habits/:id            [JWT]');
    console.log('  DELETE /api/habits/:id            [JWT]');
    console.log('  POST   /api/habits/:id/complete   [JWT]');
    console.log('  DELETE /api/habits/:id/complete   [JWT]');
    console.log('  GET    /api/habits/:id/streak     [JWT]');
    console.log('  GET    /api/dashboard/stats       [JWT]');
    console.log('  GET    /api/analytics/weekly      [JWT]');
    console.log('  GET    /api/analytics/monthly     [JWT]');
    console.log('  GET    /api/analytics/category    [JWT]');
    console.log('  GET    /api/analytics/completion  [JWT]');
    console.log('  GET    /api/analytics/best-habit  [JWT]');
    console.log('  GET    /api/analytics/missed-habits [JWT]');
    console.log('  GET    /api/calendar/:month/:year [JWT]');
    console.log('  GET    /api/export/csv            [JWT]');
    console.log('  GET    /api/export/pdf            [JWT]');
    console.log('  PUT    /api/settings              [JWT]');
    console.log('  GET    /api/settings              [JWT]');
    console.log('  POST   /api/reminders             [JWT]');
    console.log('  GET    /api/reminders             [JWT]');
    console.log('  DELETE /api/user/reset-data       [JWT]');
    console.log('  GET    /api/health');
    console.log('');
  });
}

start();
