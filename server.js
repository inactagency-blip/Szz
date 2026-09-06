// server.js — INACT AGENCY lead capture backend.
//
// Public endpoint:
//   POST /api/leads          — the website's intake form submits here
//
// Admin endpoints (require header  x-admin-token: <ADMIN_TOKEN>):
//   GET    /api/leads        — list all leads, newest first
//   GET    /api/leads/:id    — one lead
//   PATCH  /api/leads/:id    — update status  { "status": "Contacted" }
//   DELETE /api/leads/:id    — remove a lead
//
// Admin dashboard:
//   GET /admin               — static HTML page, asks for the admin token
//                               and lists/manages leads via the API above.

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { nanoid } = require('nanoid');
const db = require('./db');
const { notifyNewLead } = require('./mailer');

const app = express();
const PORT = process.env.PORT || 4000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

if (!ADMIN_TOKEN) {
  console.warn(
    '[warning] ADMIN_TOKEN is not set in .env — the admin dashboard and API are unprotected. ' +
    'Set ADMIN_TOKEN before deploying this anywhere public.'
  );
}

app.use(cors({ origin: ALLOWED_ORIGIN }));
app.use(express.json());
app.use('/admin', express.static(path.join(__dirname, 'public')));

function requireAdmin(req, res, next) {
  const token = req.header('x-admin-token');
  if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

const VALID_STATUSES = ['New', 'Contacted', 'Booked', 'Won', 'Lost'];

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'inact-agency-backend' });
});

// ---- public: create a lead from the website intake form ----
app.post('/api/leads', (req, res) => {
  const b = req.body || {};

  if (!b.businessName || !b.email) {
    return res.status(400).json({ error: 'businessName and email are required' });
  }

  const lead = {
    id: nanoid(10),
    createdAt: new Date().toISOString(),
    status: 'New',
    businessName: String(b.businessName || '').slice(0, 200),
    industry: String(b.industry || '').slice(0, 200),
    teamSize: String(b.teamSize || '').slice(0, 100),
    service: String(b.service || '').slice(0, 100),
    focus: String(b.focus || '').slice(0, 200),
    challenge: String(b.challenge || '').slice(0, 2000),
    fullName: String(b.fullName || '').slice(0, 200),
    email: String(b.email || '').slice(0, 200),
    phone: String(b.phone || '').slice(0, 100),
    channel: String(b.channel || '').slice(0, 50),
    callTime: String(b.callTime || '').slice(0, 100)
  };

  db.insertLead(lead);
  notifyNewLead(lead); // fire-and-forget — never blocks or fails the request
  res.status(201).json({ ok: true, id: lead.id });
});

// ---- admin: list / read / update / delete ----
app.get('/api/leads', requireAdmin, (req, res) => {
  res.json(db.listLeads());
});

app.get('/api/leads/:id', requireAdmin, (req, res) => {
  const lead = db.getLead(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Not found' });
  res.json(lead);
});

app.patch('/api/leads/:id', requireAdmin, (req, res) => {
  const { status } = req.body || {};
  if (!status || !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'status must be one of: ' + VALID_STATUSES.join(', ') });
  }
  const updated = db.updateLeadStatus(req.params.id, status);
  if (!updated) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

app.delete('/api/leads/:id', requireAdmin, (req, res) => {
  const deleted = db.deleteLead(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`INACT AGENCY backend running on http://localhost:${PORT}`);
  console.log(`Admin dashboard: http://localhost:${PORT}/admin`);
});
