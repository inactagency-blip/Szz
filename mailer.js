// mailer.js — sends an email to the agency's own inbox the moment a new
// lead is saved, using Gmail's SMTP with an "app password" (not the normal
// Gmail login password — see backend/README.md for how to generate one).
//
// If GMAIL_USER / GMAIL_APP_PASSWORD aren't set, notifications are just
// skipped — everything else (saving the lead, the admin dashboard) still
// works fine without them.

const nodemailer = require('nodemailer');

const GMAIL_USER = process.env.GMAIL_USER || '';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || '';
const NOTIFY_TO = process.env.NOTIFY_TO || GMAIL_USER;

let transporter = null;
if (GMAIL_USER && GMAIL_APP_PASSWORD) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD }
  });
} else {
  console.warn(
    '[warning] GMAIL_USER / GMAIL_APP_PASSWORD not set — new-lead email notifications are OFF. ' +
    'See backend/README.md → "Get notified the moment someone books a call".'
  );
}

function formatLeadEmail(lead) {
  const lines = [
    ['Business', lead.businessName],
    ['Industry', lead.industry],
    ['Team size', lead.teamSize],
    ['Service requested', lead.service],
    ['Focus', lead.focus],
    ['Challenge', lead.challenge],
    ['Contact name', lead.fullName],
    ['Email', lead.email],
    ['Phone', lead.phone],
    ['Preferred channel', lead.channel],
    ['Requested call time', lead.callTime || 'Not specified']
  ];
  const text = lines.map(function (l) { return l[0] + ': ' + (l[1] || '—'); }).join('\n');
  const html =
    '<div style="font-family:monospace;font-size:14px;line-height:1.7;">' +
    lines.map(function (l) {
      return '<div><b>' + l[0] + ':</b> ' + escapeHtml(l[1] || '—') + '</div>';
    }).join('') +
    '</div>';
  return { text, html };
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

async function notifyNewLead(lead) {
  if (!transporter) return; // notifications not configured — silently skip
  const { text, html } = formatLeadEmail(lead);
  try {
    await transporter.sendMail({
      from: 'INACT AGENCY Website <' + GMAIL_USER + '>',
      to: NOTIFY_TO,
      subject: 'New lead — ' + (lead.businessName || 'Unnamed business') + ' (' + (lead.service || 'no service chosen') + ')',
      text,
      html
    });
  } catch (err) {
    // Never let a failed notification break lead saving.
    console.error('[mailer] failed to send new-lead notification:', err.message);
  }
}

module.exports = { notifyNewLead };
