# multi_tenant_rag_chatbots
# Project Setup Guide

## 0. Prerequisites

Install these before starting:
- **Node.js** (LTS version) — https://nodejs.org
- **Git** — https://git-scm.com
- **VS Code** (or any editor)

Confirm installs worked:
```powershell
node -v
npm -v
git --version
```

---

## 1. Get access to the project

### 1.1 Supabase (database)
You should receive an email invite to join the Supabase organization (**fatema0275's Org**). Accept it: you'll then see the `sitemind` project in your own Supabase dashboard at supabase.com/dashboard.

You do **not** need to create your own database. Everyone works against the same shared Supabase project.

### 1.2 GitHub (codebase)
You should be added as a collaborator on the GitHub repo. Clone it:
```powershell
git clone <repo-url>
cd sitemind
```

---

## 2. Backend setup

### 2.1 Install dependencies
```powershell
cd backend
npm install
```

### 2.2 Create your `.env` file
Inside `backend/`, create a new file named exactly `.env` (no filename before the dot). This file is **not** in the GitHub repo (it's gitignored on purpose, since it holds secrets) — you'll be sent the values directly (WhatsApp/DM), never commit this file.

Paste in these keys (values sent to you separately):
```
DATABASE_URL=
DIRECT_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### 2.3 Verify your `.env` is being read correctly
```powershell
node -e "require('dotenv').config(); console.log(process.env.DATABASE_URL)"
```
This should print your actual Supabase connection string. If it prints `undefined`, double check:
- The file is named exactly `.env` (not `.env.txt`)
- It's directly inside `backend/`, not the root `sitemind/` folder
- There are no quotes or spaces around the `=` sign in the file

### 2.4 Test the database connection
Run:
```powershell
node test-db.js
```
Expected output:
```
✅ Connected to Supabase successfully

## 3. Confirm the schema is in place

Since the database is shared, migrations only need to be run once (already done). To confirm you can see the tables:

1. Go to your Supabase dashboard → **Table Editor**
2. You should see these 12 tables: `users`, `websites`, `crawl_jobs`, `crawl_logs`, `document_chunks`, `manual_content`, `chatbot_configs`, `conversations`, `messages`, `query_logs`, `sync_logs`, `feedback`

If you see all of these, your local setup is fully synced with the live project database.

---

## 4. Project structure

```
sitemind/
├── backend/          → Node + Express + Sequelize (API, auth, RAG logic)
├── ml-service/        → Python microservice (embeddings + entailment check)
├── frontend/          → React + Vite dashboard
├── widget/             → Embeddable JS chatbot widget
└── docs/               → Diagrams, notes, reports
```

Each folder has its own dependencies — install separately as you start working in each one:
```powershell
cd frontend
npm install
```
```powershell
cd ml-service
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

---

## 5. Common issues

**"Unable to resolve sequelize package"**
→ You're running the command from the wrong folder. Make sure you're inside `backend/` before running any `sequelize-cli` command.

**"ERROR: Dialect needs to be explicitly supplied"**
→ `config/config.js` isn't reading `.env` correctly, or `config.json` still exists alongside it (delete `config.json` if present — only `config.js` should exist).

**"Unable to resolve mysql2 package"**
→ Means `config/config.js` still has the default MySQL dialect from `sequelize-cli init`. It needs to be replaced with the Postgres + `use_env_variable` version (ask before regenerating this file).

**Connection works in `node test-db.js` but not in `sequelize-cli`**
→ Known Windows quirk. `config/config.js` should load `.env` using an absolute path:
```js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
```
