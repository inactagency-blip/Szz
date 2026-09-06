// db.js — SQLite data layer for leads.
// Uses better-sqlite3: synchronous, zero-config, stores everything in leads.db
// (a single file next to this script). No external database server needed.

const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'leads.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id           TEXT PRIMARY KEY,
    createdAt    TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'New',
    businessName TEXT,
    industry     TEXT,
    teamSize     TEXT,
    service      TEXT,
    focus        TEXT,
    challenge    TEXT,
    fullName     TEXT,
    email        TEXT,
    phone        TEXT,
    channel      TEXT,
    callTime     TEXT
  )
`);

const insertStmt = db.prepare(`
  INSERT INTO leads
    (id, createdAt, status, businessName, industry, teamSize, service, focus, challenge, fullName, email, phone, channel, callTime)
  VALUES
    (@id, @createdAt, @status, @businessName, @industry, @teamSize, @service, @focus, @challenge, @fullName, @email, @phone, @channel, @callTime)
`);

const listStmt = db.prepare(`SELECT * FROM leads ORDER BY createdAt DESC`);
const getStmt = db.prepare(`SELECT * FROM leads WHERE id = ?`);
const updateStatusStmt = db.prepare(`UPDATE leads SET status = ? WHERE id = ?`);
const deleteStmt = db.prepare(`DELETE FROM leads WHERE id = ?`);

function insertLead(lead) {
  insertStmt.run(lead);
  return lead;
}

function listLeads() {
  return listStmt.all();
}

function getLead(id) {
  return getStmt.get(id);
}

function updateLeadStatus(id, status) {
  const result = updateStatusStmt.run(status, id);
  return result.changes > 0;
}

function deleteLead(id) {
  const result = deleteStmt.run(id);
  return result.changes > 0;
}

module.exports = { insertLead, listLeads, getLead, updateLeadStatus, deleteLead };
