# Cloudways · Autonomous Team Dashboard

A full-stack support analytics dashboard for the Cloudways Autonomous team. Pulls live data from Intercom (chat volume, CSAT, response/resolution times, agent stats) and surfaces Fin's built-in conversation summaries for each conversation.

## Stack
- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS + Recharts
- **Backend**: Node.js + Express + TypeScript
- **Storage**: SQLite (better-sqlite3) for caching Intercom conversations, parts, and admin lookups
- **APIs**: Intercom REST API v2
- **Auth**: Express-session, hardcoded admin credentials (override via env)

## Prerequisites
- Node.js 18 or newer
- npm 9+
- An Intercom workspace with a personal access token

## Installation
```bash
git clone <this-repo>
cd cloudways-autonomous-dashboard
cp .env.example .env
# fill in INTERCOM_ACCESS_TOKEN, INTERCOM_TEAM_ID, SESSION_SECRET
npm install
```

## Getting an Intercom Access Token
1. Go to <https://app.intercom.com/a/apps/_/developer-hub> in your workspace.
2. Create a new app (or open an existing internal app).
3. In **Authentication**, copy the **Access Token**. This is your `INTERCOM_ACCESS_TOKEN`.
4. Reference: <https://developers.intercom.com/docs/build-an-integration/learn-more/authentication/>

## Finding the Autonomous Team ID
1. In Intercom, go to **Settings → Teammates → Teams**.
2. Open the **Autonomous** team. The numeric ID appears in the URL: `https://app.intercom.com/a/apps/<workspace>/admins/teams/<TEAM_ID>`.
3. Or call `GET https://api.intercom.io/teams` with your token and grab the `id` for the team named "Autonomous".

## Run in dev mode
```bash
npm run dev
```
- Frontend: <http://localhost:5173>
- Backend:  <http://localhost:3001>

Vite proxies `/api/*` to the backend so the client talks to one origin.

Default login: `admin@cloudways.com` / `changeme` (override via `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env`).

## Conversation summaries
The dashboard reads Fin's built-in `conversation_summary` parts from `GET /conversations/{id}` (where `part_type === "conversation_summary"`) — no separate LLM evaluation runs. Conversations, parts, and admin lookups are cached in `data/cache.db` (SQLite) so subsequent loads are free.

> The legacy `POST /api/evaluate` endpoint returns **410 Gone** — Claude-based evaluation was removed in favor of Fin's native summaries.

## Production build
```bash
npm run build
npm start
```
Serves the built client from the same Express process on `PORT`.
