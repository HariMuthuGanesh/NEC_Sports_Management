# NEC Sports Management System — CLI Database Operations & Data Seeding Guide

This guide contains all CLI commands, syntaxes, and utility scripts for populating, seeding, provisioning accounts, and managing the MySQL database (`nec_sports_db`).

---

## 1. Quick Reference Command Table

Run all `npm` commands inside the `backend/` folder:

| Task / Purpose | Package Script Command | Direct Node CLI Command |
| :--- | :--- | :--- |
| **Complete Dummy Data Seed** | `npm run seed` | `node src/data/seedDummyData.js` |
| **Interactive Account Creator** | `npm run create:account` | `node src/scripts/createAccounts.js --interactive` |
| **Preset Admin & Coordinator Setup** | `npm run provision:initial` | `node src/scripts/createAccounts.js --preset` |
| **Role Hierarchy V2 Provisioning** | `npm run seed:v2` | `node src/data/seedRoleHierarchyV2.js` |
| **Demo Accounts Provisioning** | `npm run provision:demo-accounts` | `node src/data/provisionDemoAccounts.js` |
| **Import Raw MySQL Schema** | *(N/A)* | `mysql -u root -p nec_sports_db < src/data/schema.sql` |

---

## 2. Full Dummy Data Seeding (`npm run seed`)

Populates the MySQL database with complete institutional data across all **7 system roles**, sports, tournaments, events, teams, matches, OD requests, announcements, and venues.

### Syntax
```bash
# Navigate to backend directory
cd backend

# Execute full seed
npm run seed
```

### Direct Execution Syntax
```bash
node src/data/seedDummyData.js
```

### Environment Overrides
You can customize the default password generated for seeded accounts by passing `SEED_STUDENT_PASSWORD` in your `.env` file or command environment:

```bash
# Custom seed password syntax (Linux/macOS)
SEED_STUDENT_PASSWORD="CustomPassword@2026" node src/data/seedDummyData.js

# Custom seed password syntax (Windows PowerShell)
$env:SEED_STUDENT_PASSWORD="CustomPassword@2026"; node src/data/seedDummyData.js
```

---

## 3. Interactive Terminal Account Creator (`npm run create:account`)

An interactive command-line wizard to create or update any user role on demand directly in the MySQL `users` and `departments` tables.

### Syntax
```bash
cd backend
npm run create:account
```

### Direct Execution Syntax
```bash
node src/scripts/createAccounts.js --interactive
# or short flag
node src/scripts/createAccounts.js -i
```

### Terminal Wizard Walkthrough
When launched, the CLI prompts for account details step-by-step:

```text
============================================================
 INTERACTIVE TERMINAL ACCOUNT CREATOR TOOL
============================================================

Select Account Role:
  1. System Administrator (Admin - Full Scope)
  2. College Team & Sports Administrator (Admin - College Team Only)
  3. Department Coordinator (Coordinator)
  4. Team Captain (Captain)
  5. Student Athlete (Player)

Enter choice (1-5): 3
Enter Username: coord_aids
Enter Email: coord.aids@nec.edu.in
Enter Password: Password@123
Enter Department Code (CSE / ECE / MECH / IT / CIVIL / EEE / AI-DS): AI-DS

[SUCCESS] Successfully provisioned Coordinator account for "coord_aids"!
```

---

## 4. Preset Admin & Coordinator Provisioning (`npm run provision:initial`)

Automatically seeds initial System Admin, Sports Admin, and Department Coordinators for all 7 departments (`CSE`, `ECE`, `MECH`, `IT`, `CIVIL`, `EEE`, `AI-DS`).

### Syntax
```bash
cd backend
npm run provision:initial
```

### Direct Execution Syntax
```bash
node src/scripts/createAccounts.js --preset
```

### Provisioned Default Accounts
- **System Admin**: `username = sys_admin` | Scope: `Full` | Pass: `Password@123`
- **Sports Admin**: `username = sports_admin` | Scope: `CollegeTeamOnly` | Pass: `Password@123`
- **Department Coordinators**: `coord_cse`, `coord_ece`, `coord_mech`, `coord_it`, `coord_civil`, `coord_eee`, `coord_aids` | Pass: `Password@123`

---

## 5. Raw MySQL CLI Management

### Import Fresh Database Schema (`schema.sql`)
To initialize or reset all tables from the baseline SQL schema file:

```bash
# Windows / Linux MySQL CLI import syntax
mysql -u root -p nec_sports_db < backend/src/data/schema.sql
```

### Database Dump / Export
To create a full SQL backup dump of schema and data:

```bash
# Export full database
mysqldump -u root -p nec_sports_db > backup_nec_sports_db.sql

# Export schema structure only (no data)
mysqldump -u root -p --no-data nec_sports_db > schema_only.sql
```

### Interactive MySQL Shell Queries
Connect directly to the MySQL shell:

```bash
mysql -u root -p nec_sports_db
```

Common diagnostic SQL queries inside MySQL shell:
```sql
-- List all registered accounts with roles
SELECT id, username, email, role, admin_scope, is_active FROM users ORDER BY id ASC;

-- List all sports with assigned captain
SELECT sport_id, name, category, captain_user_id FROM sports;

-- List ongoing matches with scores
SELECT match_id, round, status, scoring_method, score_a, score_b, detail_score FROM matches;

-- Check count of OD requests
SELECT approval_status, COUNT(*) FROM od_requests GROUP BY approval_status;
```
