# INACT AGENCY — backend

Receives submissions from the website's intake form, stores each one as a
lead in a SQLite database, emails you the moment one comes in, and serves a
password-protected dashboard at `/admin` so you can see and manage the
whole pipeline.

## What's in here

- `server.js` — the API (Express)
- `db.js` — the database layer (SQLite via better-sqlite3 — one file,
  `leads.db`, created automatically the first time you run the server)
- `mailer.js` — sends a "new lead" email to your own inbox
- `public/admin.html` — the leads dashboard
- `.env.example` — settings you need to fill in

---

## 1. Run it on your own computer first

You'll need [Node.js](https://nodejs.org) installed (18 or newer).

```bash
cd backend
npm install
cp .env.example .env
```

Open `.env` and set `ADMIN_TOKEN` to a long random password — this protects
`/admin` and the leads API:

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

Paste the result in as `ADMIN_TOKEN=...`. Then start it:

```bash
npm start
```

```
INACT AGENCY backend running on http://localhost:4000
Admin dashboard: http://localhost:4000/admin
```

Open `http://localhost:4000/admin`, enter your token. Test it's receiving
leads:

```bash
curl -X POST http://localhost:4000/api/leads \
  -H "Content-Type: application/json" \
  -d '{"businessName":"Test Co","email":"test@example.com","service":"AI Automation"}'
```

Refresh `/admin` — the test lead should appear.

---

## 2. Get notified the moment someone books a call

This is what actually lets you "check in" without opening `/admin` — a
lead comes in, you get an email straight away.

1. Go to your Google Account → **Security** → turn on **2-Step
   Verification** if it isn't already on (required for the next step).
2. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).
3. Create an app password (name it something like "INACT website"). Google
   gives you a 16-character code — copy it.
4. In `.env`, set:
   ```
   GMAIL_USER=inactagency@gmail.com
   GMAIL_APP_PASSWORD=<the 16-character code, no spaces>
   NOTIFY_TO=inactagency@gmail.com
   ```
5. Restart the server (`npm start`). Re-run the `curl` test above — an
   email should land in the inbox within a few seconds, with the business
   name, service requested, contact details, and requested call time.

If you'd rather it go to a different inbox than the one it sends from
(e.g. send from a no-reply address but notify your personal Gmail), just
set `NOTIFY_TO` to that address.

*(WhatsApp notifications instead of email are possible too, but require
Meta's WhatsApp Business Cloud API — approval process, a Meta Business
account, and per-message cost after a free tier. Email via Gmail is the
zero-cost, five-minute version; ask if you want the WhatsApp route built
out later.)*

---

## 3. Put the backend online

The database is a single file, so pick a host that keeps a persistent disk
between deploys — a plain "serverless function" host wipes it. **Render**
is the easiest starting point:

1. Push this `backend/` folder to a GitHub repo (Render deploys from Git).
2. On [render.com](https://render.com) → **New → Web Service** → connect
   the repo, root directory `backend`.
3. Build command: `npm install` · Start command: `npm start`.
4. Under **Environment**, add every variable from `.env.example` with your
   real values (`ADMIN_TOKEN`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`,
   `NOTIFY_TO`, and `ALLOWED_ORIGIN` set to your site's real URL once step
   4 below is live).
5. Under **Disks**, add a persistent disk (1 GB is plenty) mounted at
   `/opt/render/project/src` so `leads.db` survives restarts — Render's
   free tier disk is wiped on redeploy, so add this once real leads start
   coming in (a couple of dollars a month).
6. Deploy. You'll get a URL like `https://inact-agency-backend.onrender.com`.

Railway.app and Fly.io work the same way (persistent volume + `npm start`)
if you'd rather compare pricing.

---

## 4. Put the website online

The website is one self-contained HTML file, so any static host works —
**Netlify** is the simplest:

1. Go to [app.netlify.com/drop](https://app.netlify.com/drop).
2. Drag `inact-agency-website.html` onto the page, rename it to
   `index.html` first (Netlify serves `index.html` as the homepage).
3. Netlify gives you a live URL immediately (e.g.
   `random-name-123.netlify.app`). Add your own domain under **Domain
   settings** if you have one (e.g. `inactagency.co.za`) — Netlify's free
   plan covers this.

Vercel and Cloudflare Pages work the same way if you'd rather use one of
those instead.

**Before publishing**, open the HTML file and set two things near the top
of the `<script>` block:

```js
var API_BASE_URL = "https://inact-agency-backend.onrender.com"; // your backend's real URL from step 3
```

And back in the backend's `.env` on Render, set:

```
ALLOWED_ORIGIN=https://inactagency.co.za
```

(your actual live site URL) so only your site is allowed to submit leads.

---

## Growing it later

- **WhatsApp notification instead of/alongside email** — see the note in
  step 2.
- **Swapping SQLite for hosted Postgres** once you're past a few hundred
  leads or running multiple server instances — replace `db.js` with a
  Postgres client (`pg`); `server.js` doesn't need to change, it only
  calls the functions `db.js` exports.
- **Merging this with Lead Hunter PRO** — since leads are already
  structured records in a real database, they can be pulled into the same
  pipeline instead of living separately. Ask when you're ready.
