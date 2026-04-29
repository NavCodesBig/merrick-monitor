require('dotenv').config();
const express = require('express');
const cors = require('cors');
const reportsRouter = require('./routes/reports');
const adminRouter = require('./routes/admin');
const aiRouter = require('./routes/ai');

const app = express();
const PORT = process.env.PORT ?? 3001;

// ── Middleware ────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_ORIGIN ?? '*',
  credentials: true,
}));
app.use(express.json());

// ── Health check ──────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'merrick-monitor-api' });
});

// ── Routes ────────────────────────────────────────────────────
app.use('/api/reports', reportsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/ai', aiRouter);

// ── 404 ───────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Error handler ─────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message ?? 'Internal server error' });
});

module.exports = app;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Merrick Monitor API running on port ${PORT}`);
  });
}
