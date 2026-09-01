# Project Rules for NEC Sports Management

## ⚡ FIRST ACTION (Every Conversation)
Read `d:\Sports_Management\.agents\PROJECT_MEMORY.md` before doing anything else.
It contains the full architecture, role system, file map, data layer, security system, and git history.

---

## 🌿 Git Branch Rules — CRITICAL

| Branch | Purpose | What goes here |
|--------|---------|----------------|
| `Frontend` | **Active Frontend** | All `frontend/` files — React, JSX, CSS, Vite config |
| `Backend` | **Active Backend** | All `backend/` files — Express, MongoDB, middleware, routes |

### Rules
1. **Frontend changes** (`.jsx`, `.js` in `frontend/`, `.css`, `vite.config.js`) → push to `origin/Frontend`
2. **Backend changes** (`.js` in `backend/`, Express routes, models, middleware) → push to `origin/Backend`
3. **Shared/root changes** (`.github/`, `.agents/`, `.gitignore`) → push to **both** `Frontend` and `Backend`
4. **ALWAYS run** `npm run build` in `frontend/` before pushing any frontend changes

### Push Commands
```powershell
# Frontend push
git add frontend/ ; git commit -m "feat(frontend): DESCRIPTION" ; git push origin Frontend

# Backend push
git add backend/ ; git commit -m "feat(backend): DESCRIPTION" ; git push origin Backend

# Shared files (.github/, .agents/) — push to BOTH
git add .github/ .agents/ ; git commit -m "chore: DESCRIPTION"
git push origin Frontend ; git push origin Backend
```

### Commit Message Format
```
feat(frontend): add Settings page and missing admin routes
feat(backend): add JWT auth middleware
fix(frontend): resolve duplicate export in security.js
fix(backend): correct mongoose model schema
chore: add GitHub Actions CI workflow
docs: update PROJECT_MEMORY.md
```

---

## 📋 Core Rules

1. **Build check**: Run `npm run build` in `d:\Sports_Management\frontend` before every frontend push
2. **Notion update**: After every approved push → create a child page inside the Sports Management System Notion page (requires explicit user confirmation first)
3. **PowerShell**: Use `;` to chain commands, NOT `&&`
4. **CI**: GitHub Actions will auto-run on every push — check the Actions tab for errors
5. **Confirmation Rule (GitHub & Notion)**: ALWAYS ask for explicit user confirmation in chat before executing any `git push` command or creating/updating any Notion page.

---

## 🔧 Notion Integration

- **Page**: https://app.notion.com/p/Sports-Management-System-38f36f2b86b380eaa612e82c9f3fb706
- **Page ID**: `38f36f2b86b380eaa612e82c9f3fb706`
- **Token**: `[SECRET_NOTION_TOKEN_STORED_IN_ENV]`
- **API Version**: `2022-06-28`

### Notion Page Creation Pattern
Write the JSON body to a temp file, then POST it:
```powershell
$token = $env:NOTION_API_KEY # Load from environment variable, do not hardcode
$headers = @{ "Authorization" = "Bearer $token"; "Notion-Version" = "2022-06-28"; "Content-Type" = "application/json" }
$bodyRaw = Get-Content ".\notion_payload.json" -Raw -Encoding UTF8
Invoke-WebRequest -Uri "https://api.notion.com/v1/pages" -Method POST -Headers $headers -Body ([System.Text.Encoding]::UTF8.GetBytes($bodyRaw)) -ContentType "application/json; charset=utf-8"
```

---

## 🔄 Standard Workflow After Any Feature

```powershell
# 1. Build (frontend only)
cd d:\Sports_Management\frontend ; npm run build

# 2. Stage and commit the right files
cd d:\Sports_Management
git add frontend/    # or backend/
git commit -m "feat(frontend|backend): DESCRIPTION"

# 3. Push to the correct branch
git push origin Frontend   # for frontend
# git push origin Backend  # for backend

# 4. Create Notion version log (see template in PROJECT_MEMORY.md)
```

## 🛡️ Architectural Guardrails & Academic Scope

1. **Defend the Core Identity (AI & Sports):** 
   - Never drop or deprecate tables critical to the project's title. The database MUST always include tables supporting the AI module (e.g., `ai_chat_sessions`, `ai_messages`).
2. **Prevent Scope Creep (Keep it Academic):** 
   - Avoid building deep ERP, HR, or institutional accreditation features (e.g., complex multi-stage approval hierarchies, NAAC metric tracking) that distract from the core Sports and AI algorithms. Keep secondary features (like `od_requests`) to basic, single-status tracking tables.
3. **Strict SQL Normalization:** 
   - Do NOT use JSON arrays to store relationships or foreign keys (e.g., team rosters). Always use explicit junction tables (e.g., `team_members`) to maintain First Normal Form (1NF) and query efficiency.
4. **Authentication Flexibility:** 
   - Any `password` or `passwordHash` field must be `NULLABLE` to support planned OAuth integrations (like Google Login).
5. **Integration Boundaries:** 
   - Never assume direct database-to-database access for integration with external systems (like the college IMS). Design for API endpoints or CSV/Excel imports. 

---

## 📁 Key File Locations

| Purpose | File |
|---------|------|
| Project memory | `.agents/PROJECT_MEMORY.md` |
| Git rules | `.agents/AGENTS.md` ← this file |
| CI workflow | `.github/workflows/ci.yml` |
| Routing | `frontend/src/App.jsx` |
| Auth + session | `frontend/src/context/AuthContext.jsx` |
| Security utils | `frontend/src/utils/security.js` |
| Mock data | `frontend/src/data/mock/mockData.js` |
| API services | `frontend/src/services/api/apiServices.js` |
| Translations (static) | `frontend/src/utils/translations.js` |
| Translations (live) | `frontend/src/utils/liveTranslator.js` |
| Design tokens | `frontend/src/styles/tokens.css` |
| Backend entry | `backend/src/index.js` |
| Backend app | `backend/src/app.js` |
| DB config | `backend/src/config/db.js` |

---

## 🏗️ Project Structure

```
Sports_Management/
├── .agents/          ← Agent rules and memory (push to BOTH branches)
├── .github/
│   └── workflows/    ← CI/CD (push to BOTH branches)
├── frontend/         ← React 18 + Vite  → push to version1
└── backend/          ← Node + Express + MongoDB → push to version2
```