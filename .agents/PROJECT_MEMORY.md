# NEC Sports Management — Project Memory
<!-- 
  READ THIS FIRST at the start of every conversation.
  This file is the single source of truth for project state,
  architecture, conventions, and history.
  Updated: 17 Aug 2026 | Version: v1.2
-->

## 🏫 Project Identity

| Key | Value |
|-----|-------|
| **Name** | NEC Sports Management System |
| **College** | National Engineering College (NEC), Kovilpatti |
| **Sports Academy** | Lakshmi Ammal Sports Academy (LASA) |
| **Repo** | `HariMuthuGanesh/NEC_Sports_Management` |
| **Frontend Branch** | `Frontend` — all frontend code |
| **Backend Branch** | `Backend` — all backend code |
| **CI/CD** | `.github/workflows/ci.yml` — auto runs on push to Frontend & Backend |
| **Notion Memory** | https://app.notion.com/p/Sports-Management-System-38f36f2b86b380eaa612e82c9f3fb706 |
| **Notion Token** | Stored in `.agents/` — use PowerShell `Invoke-RestMethod` with saved payload files |
| **Tech Stack** | React 18 + Vite, Vanilla CSS, lucide-react icons |
| **Build Command** | `cd d:\Sports_Management\frontend && npm run build` |
| **Dev Server** | `cd d:\Sports_Management\frontend && npm run dev` |

---

## 🏗️ Architecture Overview

```
frontend/src/
├── App.jsx                        ← Main router (switch-case, no react-router)
├── context/
│   └── AuthContext.jsx            ← Central state: user, role, theme, language, t(), security timers
├── utils/
│   ├── security.js                ← XSS, rate limiting, JWT, SecurityLogger, CSRF
│   ├── translations.js            ← Static EN/TA/HI dictionary (single source of truth)
│   └── liveTranslator.js          ← Live API translation (MyMemory, 7-day cache)
├── services/api/
│   └── apiServices.js             ← Mock API layer (localStorage persistence)
├── data/mock/
│   └── mockData.js                ← All seed data (sports, teams, players, matches etc.)
├── components/
│   ├── common/                    ← Button, Card, Table, Badge, Modal, SkeletonLoader, EmptyState, ProtectedRoute
│   ├── layout/                    ← AppShell, Header, Sidebar
│   ├── security/                  ← SessionTimeoutBanner, TranslationLoadingBar
│   └── notifications/             ← NotificationDrawer
└── pages/
    ├── auth/    LoginPage.jsx
    ├── public/  PublicHome, PublicLiveScores, PublicFixtures, PublicLeaderboard, PublicGallery, PublicAnnouncements
    ├── admin/   AdminDashboard, SportsCatalog, TournamentsManager, EventsManager, RegistrationsManager,
    │            TeamsManager, MatchesManager, StudentManager, AnnouncementsManager, ReportsManager, AuditLog
    ├── coordinator/ CoordinatorDashboard, RosterManager, EventRegistration, ScoreEntry, AttendanceMarker
    └── player/  PlayerDashboard
```

---

## 👥 Roles & Access

| Role Constant | Display Name | Default Nav | Demo Login |
|---|---|---|---|
| `ROLES.PUBLIC` | Public Guest Portal | `public_home` | Guest (no login) |
| `ROLES.ADMIN` | Director of Physical Education | `admin_dash` | `ADM01` / `Admin@123` |
| `ROLES.COORDINATOR` | Department Sports Coordinator | `coord_dash` | `2112045` / `Coord@456` |
| `ROLES.PLAYER` | Student Athlete | `player_dash` | `2114012` / `Player@789` |

**Mock users (hardcoded in `LoginPage.jsx` MOCK_CREDENTIALS):**
- Admin: Dr. K. Arumugam, Sports Office dept, id: ADM01
- Coordinator: Rahul Sharma, CSE dept, id: 2112045
- Player: Priya Patel, MECH dept, id: 2114012

---

## 🗺️ Navigation Map (activeNav keys)

```
Public:      public_home | public_live | public_fixtures | public_leaderboard | public_gallery | public_announcements
Admin:       admin_dash | admin_sports | admin_tournaments | admin_events | admin_regs | admin_teams
             admin_depts | admin_students | admin_matches | admin_venues | admin_announcements | admin_reports | admin_audit
Coordinator: coord_dash | coord_players | coord_event_reg | coord_matches | coord_score_entry | coord_attendance | coord_media
Player:      player_dash | player_team | player_matches | player_notifs
```

---

## 🔒 Security System (Layer Summary)

| Layer | File | Feature |
|---|---|---|
| 1 | `utils/security.js` | XSS sanitizer, regex validators, JWT buildSessionToken (30-min exp), isTokenExpired, rate limiter (5 attempts → 15-min lockout), SecurityLogger (7 events), CSRF nonce |
| 2 | `context/AuthContext.jsx` | 30-min idle auto-logout, 2-min warning (`idleWarning` state), token expiry poll 60s, stayLoggedIn(), audit hooks |
| 3 | `pages/auth/LoginPage.jsx` | Lockout countdown UI, password strength bar (0–4), show/hide toggle, MOCK_CREDENTIALS validation |
| 4 | `components/security/SessionTimeoutBanner.jsx` | Floating banner with MM:SS countdown |
| 5 | `pages/admin/AuditLog.jsx` | Admin-only audit viewer, summary cards, event filter tabs |
| 6 | `components/common/ProtectedRoute.jsx` | Logs 403s, session-expired vs forbidden states |
| 7 | `App.jsx` + `Sidebar.jsx` | Global banner, admin_audit route, Security Audit Log nav |

**SecurityLogger events:** `LOGIN_SUCCESS | LOGOUT | ROLE_SWITCH | LOGIN_FAILED | UNAUTHORIZED_ACCESS | SESSION_EXPIRED | IDLE_TIMEOUT`  
**Storage key:** `nec_security_audit_log` (localStorage, max 200 entries)

---

## 🌐 Translation System

### Static (translations.js)
- English `en` — master dictionary (~150 keys)
- Tamil `ta` — manually translated
- Hindi `hi` — manually translated
- Used via: `const { t } = useAuth()` → `t.keyName`

### Live (liveTranslator.js)  
- API: **MyMemory** (free, no key, 1000 words/day; add email for 10k/day)
- Endpoint: `https://api.mymemory.translated.net/get?q=TEXT&langpair=en|ta-IN`
- Cache: localStorage key `nec_live_trans_ta`, TTL 7 days
- Trigger: `setLanguage("ta")` in AuthContext → auto-fetches & caches
- Progress: `transProgress` state → `<TranslationLoadingBar />`
- Adding new language: just add to `LANG_CODES` in `liveTranslator.js`

---

## 💾 Data Layer

### localStorage Keys
```
nec_sports_auth_user       ← logged-in user object
nec_sports_jwt_token       ← session JWT (has exp claim)
nec_sports_theme           ← "light" | "dark"
nec_sports_lang            ← "en" | "ta" | "hi"
nec_security_audit_log     ← SecurityLogger entries (JSON array)
nec_security_rate_limit    ← login attempt counter + lockedUntil
nec_live_trans_ta          ← cached Tamil translations (7-day TTL)
nec_live_trans_hi          ← cached Hindi translations (7-day TTL)
nec_sports_sports          ← sports catalog (overrides mockData)
nec_sports_departments     ← departments data
nec_sports_teams           ← teams registry
nec_sports_players         ← player roster
nec_sports_matches         ← match schedule
nec_sports_tournaments     ← tournaments list
nec_sports_announcements   ← announcements/circulars
nec_csrf_nonce             ← sessionStorage: CSRF token
```

### Mock API Services (`apiServices.js`)
```js
sportsApi      → getDepartments, getSports, getVenues, addSport, deleteSport
tournamentsApi → getTournaments, createTournament, toggleTournamentStatus
eventsApi      → getEvents, createEvent, toggleEventStatus
teamsApi       → getTeams, registerTeam, approveTeam, rejectTeam
playersApi     → getAllPlayers, getPlayersByTeam, saveSquadAttendance
matchesApi     → getMatches, updateMatchScore, deleteMatch
leaderboardApi → getLeaderboard
notificationsApi → getNotifications
announcementsApi → getAnnouncements, createAnnouncement, deleteAnnouncement
```

All functions: `await delay(150ms)` → return `getStored(key, INITIAL_DATA)` fallback.

---

## 🎨 Design System

- **CSS Variables** in `styles/tokens.css`: `--nec-navy`, `--nec-gold`, `--nec-bg`, etc.
- **Theme toggle**: `data-theme="dark"` on `<html>` root
- **Class conventions**: `nec-` prefix on all custom classes
- **Key layout classes**: `nec-portal-page`, `nec-page-header`, `nec-stats-grid`, `nec-admin-main-grid`
- **Common components**: `<Button variant="primary|ghost|danger">`, `<Badge status="live|success|warning|info|danger|neutral">`, `<Card title subtitle action>`, `<Table columns data searchable>`

---

## 📋 Git Commit History (v1 branch)

| Commit | Date | Summary |
|--------|------|---------|
| `76ebf71` | 17 Aug 2026 | 7-layer security features |
| `2ad461b` | 17 Aug 2026 | Role switching navigation fix |
| `335c010` | 17 Aug 2026 | Multi-language translation fix all pages |
| `73f8ef7` | 17 Aug 2026 | Full role-based features (Admin/Coord/Player) |
| `36b28f5` | 17 Aug 2026 | Central translations EN/TA/HI |
| `9d1f515` | 17 Aug 2026 | Admin Dashboard Stitch UI polish |
| `4dc4c7d` | 17 Aug 2026 | Team Roster & Student Directory UI |
| `cd5594d` | 17 Aug 2026 | OWASP security, JWT, RBAC route guards |
| `9dffaeb` | 17 Aug 2026 | Full NEC Sports Management System UI v1 |

---

## ⚙️ PowerShell Rules (Windows)
- **NEVER use `&&`** to chain commands — use `;` instead
- Example: `git add . ; git commit -m "msg" ; git push origin version1`
- Notion API: write JSON body to a temp file, use `-InFile` or inline raw string

---

## 🔧 Notion Integration

- **Page ID:** `38f36f2b86b380eaa612e82c9f3fb706`
- **Token:** `[SECRET_NOTION_TOKEN_STORED_IN_ENV]`
- **Integration name:** Antigravity
- **API Version:** `2022-06-28`
- **Pattern for writing pages:**
```powershell
$token = $env:NOTION_API_KEY
$headers = @{ "Authorization" = "Bearer $token"; "Notion-Version" = "2022-06-28"; "Content-Type" = "application/json" }
$body = Get-Content "payload.json" -Raw
Invoke-RestMethod -Uri "https://api.notion.com/v1/pages" -Method POST -Headers $headers -Body $body
```

## 🗄️ MySQL Database Standards (`feature/mysql-backend`)
- **Query Engine**: `mysql2/promise` raw queries with parameterized statement bounds (`?`). Zero ORMs.
- **Connection Pool**: Connection pool exported from `backend/src/config/db.js`.
- **Schema DDL**: Single migration file at `backend/src/data/schema.sql` (14 relational tables).
- **Authentication**: Single `users` table (`role`: `'Admin'`, `'Coordinator'`, `'Player'`); manual signup first, with optional Google sign-in setting `google_linked = 1`.

---

## 📌 Key Rules (from AGENTS.md)

1. **Always push to `origin/version1`** — never `main`
2. **After every push → create/update Notion page** with version + date
3. **PowerShell syntax**: use `;` not `&&`
4. **Build before push**: `npm run build` must pass with 0 errors

---

## 🗄️ Complete 12-Table Database Architecture

The platform operates on a normalized 12-table relational schema supporting Intra-College, District, Zonal (Anna University), State (CM Trophy), and National (AIU / Khelo India) competitions:

| # | Table Name | Domain Scope & Purpose | Key References |
|---|---|---|---|
| **1** | `departments` | 8 NEC Academic Departments & HOD registry | `id` (PK), `code`, `name`, `hodName` |
| **2** | `students` | NEC Academic ERP / IMS student registry | `rollNo` (PK 7-digit), `deptId` (FK) |
| **3** | `users` | Authentication & RBAC (Admin, Coordinator, Player, Public) | `id` (PK UUID), `username`, `studentRollNo` (FK) |
| **4** | `sports` | Sports catalog, roster limits (min/max), rules | `id` (PK), `category`, `pointsRule` |
| **5** | `venues` | LASA Sports Complex & campus ground capacities | `id` (PK), `location`, `capacity`, `status` |
| **6** | `tournaments` | Multi-tier competitions (Intra-College, District, Zonal, State, National, International) | `id` (PK), `tier`, `organizingBody`, `hostInstitution` |
| **7** | `teams` | Department tournament squad rosters & captains | `id` (PK), `deptId` (FK), `sportId` (FK), `tournamentId` (FK) |
| **8** | `matches` | Fixtures, live timers, scoreboards & results | `id` (PK), `venueId` (FK), `teamAId` (FK), `teamBId` (FK) |
| **9** | `announcements` | Targeted campus sports bulletins & flash alerts | `id` (PK), `targetDept` (FK), `authorId` (FK) |
| **10**| `audit_logs` | Immutable security & regulatory compliance trail | `id` (PK), `userId` (FK), `event`, `clientIp` |
| **11**| `student_achievements` | External medals, cash prizes & **NAAC Metric 5.3.1** points | `id` (PK), `studentRollNo` (FK), `eventId` (FK) |
| **12**| `od_requests` | On-Duty attendance approval & college ERP credit sync | `id` (PK), `studentRollNo` (FK), `eventId` (FK) |

---

## 🏛️ 8-State Universal Domain FSM Architecture

All stateful lifecycle components across the NEC Sports Management System follow the deterministic **8-State Finite State Machine (FSM)** standard defined in `frontend/src/utils/stateMachines.js` and `Plan/8_state_implementation.md`:

| Domain | 8 State Lifecycle Progression |
|---|---|
| **1. Live Score Sync** | `IDLE` ➔ `DISCOVERING` ➔ `CONNECTING` ➔ `CONNECTED` ➔ `STREAMING` ➔ `NETWORK_ERROR` ➔ `AUTH_ERROR` ➔ `DISCONNECTED` |
| **2. Match Progression** | `SCHEDULED` ➔ `ROSTER_VERIFICATION` ➔ `WARMUP_TOSS` ➔ `LIVE_IN_PLAY` ➔ `INTERVAL_TIMEOUT` ➔ `DISPUTE_REVIEW` ➔ `MATCH_CONCLUDED` ➔ `OFFICIAL_CERTIFIED` |
| **3. IMS Student Eligibility** | `IDLE` ➔ `IMS_QUERYING` ➔ `VERIFIED_ELIGIBLE` ➔ `ROSTER_ASSIGNED` ➔ `VENUE_CHECKED_IN` ➔ `IMS_DEGRADED` ➔ `INELIGIBLE_HOLD` ➔ `ROSTER_LOCKED` |
| **4. Tournament Brackets** | `DRAFT` ➔ `REGISTRATION_OPEN` ➔ `REGISTRATION_CLOSED` ➔ `FIXTURES_PUBLISHED` ➔ `IN_PROGRESS` ➔ `WEATHER_HOLD` ➔ `CHAMPIONSHIP_STAGE` ➔ `CONCLUDED_AWARDED` |
| **5. Venue Clash Prevention**| `AVAILABLE` ➔ `CLASH_DETECTION` ➔ `PENDING_APPROVAL` ➔ `CONFIRMED_LOCKED` ➔ `IN_ACTIVE_USE` ➔ `CLASH_CONFLICT` ➔ `MAINTENANCE_HOLD` ➔ `ARCHIVED_LOGGED` |
| **6. OD & Certificates** | `DRAFT` ➔ `ADVISOR_REVIEW` ➔ `DIRECTOR_APPROVAL` ➔ `PRINCIPAL_CLEARANCE` ➔ `CERTIFICATE_ISSUED` ➔ `ATTENDANCE_DISCREPANCY` ➔ `REJECTED_REVOKED` ➔ `ARCHIVED_ERP` |
| **7. Campus Broadcasts** | `DRAFT` ➔ `TARGET_SEGMENTATION` ➔ `DELIVERING` ➔ `ACTIVE_BROADCAST` ➔ `URGENT_FLASH_ALERT` ➔ `DELIVERY_THROTTLED` ➔ `BROADCAST_REVOKED` ➔ `ARCHIVED_AUDITED` |
| **8. Security Sessions** | `UNAUTHENTICATED` ➔ `CREDENTIAL_VERIFYING` ➔ `TOKEN_ISSUED` ➔ `ACTIVE_SESSION` ➔ `TOKEN_EXPIRED` ➔ `AUTH_FAILURE` ➔ `RATE_LIMITED_LOCKED` ➔ `TOKEN_BLACKLISTED` |

---

## 🔧 Notion Publication Rule
- Always render database schemas as **native visual Notion `table` / `table_row` blocks** (`Attribute | Data Type | Constraints | Description`) in addition to SQL DDL reference blocks.

---

## 🚧 Known Issues / Future Work

- [ ] Google OAuth 2.0 (`Plan/outh2.0.md`) — **ON HOLD** pending confirmation & Google Cloud credentials from NEC IT.
- [ ] NEC IMS (ERP) Integration — Planned: Direct REST API / SQL View connection to ingest real student & athlete rosters.
- [ ] Backend live database sync — MongoDB integration for caching IMS student records and match schedules.
- [ ] Live translator: add email to MyMemory for higher quota (10k words/day)
- [ ] `TranslationLoadingBar` needs to be wired into `App.jsx` render
- [ ] Add more languages by extending `LANG_CODES` in `liveTranslator.js`
- [ ] Student registration form (`StudentForm.jsx`) is legacy — needs migration to new portal
- [ ] `Dashboard.jsx` (62kb) is legacy monolith — pages now separated in `pages/`


