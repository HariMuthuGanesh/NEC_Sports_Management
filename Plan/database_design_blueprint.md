# 🗄️ Comprehensive Relational Database Design Blueprint (Enterprise Edition)

This blueprint has been significantly expanded to match the exact field depth of your IMS schema. Every table now contains exhaustive, real-world attributes. Normalization has been strictly enforced (e.g., the `messages json` field from the original `students` table has been removed, as messages belong in the `ai_messages` or `announcements` tables).

---

### 1. `students` (Comprehensive Athlete / IMS Profile)
*Fully expanded to match the provided IMS schema, ensuring 100% data compatibility.*

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| `studentId` | int | NO | PRI | | auto_increment |
| `Userid` | int | NO | MUL | | FK to `users` |
| `studentName` | varchar(50) | NO | | | |
| `registerNumber` | varchar(50) | NO | UNI | | |
| `sixteen_digit_reg_no`| varchar(16) | YES | UNI | | |
| `departmentId` | int | NO | MUL | | FK to `departments` |
| `course` | varchar(50) | YES | | 'B.E' | |
| `batch` | int | YES | | | |
| `semester` | varchar(255) | YES | | | |
| `section` | varchar(255) | YES | | | |
| `date_of_joining` | datetime | YES | | | |
| `date_of_birth` | datetime | YES | | | |
| `gender` | enum('Male','Female','Transgender')| YES | | | |
| `blood_group` | enum('A+','A-','B+','B-','O+','O-','AB+','AB-')| YES| | | |
| `religion` | enum('Hindu','Muslim','Christian','Others')| YES | | | |
| `caste` | varchar(255) | YES | | | |
| `community` | varchar(255) | YES | | | |
| `mother_tongue` | varchar(255) | YES | | | |
| `nationality` | varchar(255) | YES | | | |
| `identification_mark`| varchar(255) | YES | | | |
| `aadhar_card_no` | varchar(12) | YES | UNI | | |
| `student_type` | enum('Day-Scholar','Hosteller')| YES | | | |
| `seat_type` | enum('Counselling','Management')| YES | | | |
| `admission_quota` | varchar(255) | YES | | | |
| `lateral_entry` | enum('Yes','No') | YES | | | |
| `first_graduate` | enum('Yes','No') | YES | | | |
| `personal_email` | varchar(255) | YES | | | |
| `personal_phone` | varchar(10) | YES | | | |
| `parents_phone` | varchar(15) | YES | | | |
| `door_no` | varchar(255) | YES | | | |
| `street` | varchar(255) | YES | | | |
| `city` | varchar(255) | YES | | | |
| `pincode` | varchar(6) | YES | | | |
| `districtID` | int | YES | MUL | | |
| `stateID` | int | YES | MUL | | |
| `countryID` | int | YES | MUL | | |
| `student_district` | varchar(255) | YES | | | |
| `student_state` | varchar(255) | YES | | | |
| `present_address` | text | YES | | | |
| `permanent_address`| text | YES | | | |
| `address` | text | YES | | | Legacy fallback |
| `staffId` | int | YES | MUL | | Tutor ID |
| `tutorEmail` | varchar(255) | YES | | | |
| `companyId` | int | YES | MUL | | Placement link |
| `extracurricularID`| int | YES | MUL | | |
| `umis_number` | varchar(255) | YES | | | |
| `skillrackProfile` | varchar(255) | YES | | | |
| `pending` | tinyint(1) | YES | | 1 | |
| `tutor_approval_status`| tinyint(1)| YES | | 0 | |
| `approved_at` | datetime | YES | | | |
| `Created_by` | int | YES | MUL | | |
| `Updated_by` | int | YES | MUL | | |
| `Approved_by` | int | YES | MUL | | |
| `createdAt` | datetime | NO | | CURRENT_TIMESTAMP | |
| `updatedAt` | datetime | NO | | CURRENT_TIMESTAMP ON UPDATE | |

---

### 2. `users` (Exhaustive Auth & RBAC)
| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| `id` | int | NO | PRI | | auto_increment |
| `username` | varchar(50) | NO | UNI | | |
| `password_hash` | varchar(255) | YES | | | NULL for Google OAuth |
| `auth_provider` | enum('LOCAL', 'GOOGLE') | NO | | 'LOCAL' | |
| `role` | enum('Director', 'Coordinator', 'Student', 'Guest')| NO | MUL | 'Student' | |
| `is_active` | tinyint(1) | YES | | 1 | |
| `login_attempts` | int | YES | | 0 | Security lockout |
| `last_login_at` | datetime | YES | | | |
| `createdAt` | datetime | NO | | CURRENT_TIMESTAMP | |
| `updatedAt` | datetime | NO | | CURRENT_TIMESTAMP ON UPDATE | |

---

### 3. `departments` (Academic Units)
| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| `departmentId` | int | NO | PRI | | auto_increment |
| `name` | varchar(100) | NO | UNI | | |
| `code` | varchar(10) | NO | UNI | | |
| `hod_name` | varchar(100) | YES | | | |
| `hod_email` | varchar(100) | YES | | | |
| `hod_phone` | varchar(15) | YES | | | |
| `coordinator_user_id`| int | YES | MUL | | FK to `users` |
| `color_code` | varchar(7) | YES | | '#000000'| |
| `established_year` | int | YES | | | |
| `createdAt` | datetime | NO | | CURRENT_TIMESTAMP | |

---

### 4. `sports` (Sport Definitions)
| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| `sportId` | int | NO | PRI | | auto_increment |
| `name` | varchar(100) | NO | UNI | | |
| `category` | enum('Indoor', 'Outdoor', 'Track', 'Field') | NO | | | |
| `min_players` | int | NO | | | |
| `max_players` | int | NO | | | |
| `points_rule` | varchar(255) | YES | | | e.g., 'Sets of 21' |
| `equipment_required`| varchar(255) | YES | | | |
| `match_duration_min`| int | YES | | | |
| `createdAt` | datetime | NO | | CURRENT_TIMESTAMP | |

---

### 5. `venues` (Locations)
| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| `venueId` | int | NO | PRI | | auto_increment |
| `name` | varchar(100) | NO | UNI | | |
| `location` | varchar(255) | YES | | | |
| `capacity` | int | YES | | | |
| `surface_type` | enum('Grass', 'Synthetic', 'Wooden', 'Clay', 'Concrete')| YES | | | |
| `has_floodlights` | tinyint(1) | YES | | 0 | |
| `status` | enum('Available', 'Maintenance', 'Booked') | NO | | 'Available' | |
| `incharge_user_id`| int | YES | MUL | | FK to `users` |
| `createdAt` | datetime | NO | | CURRENT_TIMESTAMP | |

---

### 6. `tournaments` (Events)
| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| `tournamentId` | int | NO | PRI | | auto_increment |
| `name` | varchar(255) | NO | | | |
| `academic_year` | varchar(9) | NO | | | |
| `tier` | enum('Intramural', 'District', 'Zonal', 'State', 'National') | NO | | 'Intramural' | |
| `organizing_body` | varchar(255) | YES | | | |
| `host_institution` | varchar(255) | YES | | | |
| `location_city` | varchar(255) | YES | | | |
| `start_date` | date | NO | | | |
| `end_date` | date | YES | | | |
| `status` | enum('Upcoming', 'Ongoing', 'Completed', 'Cancelled')| NO | | 'Upcoming' | |
| `chief_guest` | varchar(255) | YES | | | |
| `sponsor_name` | varchar(255) | YES | | | |
| `budget_allocated` | decimal(10,2)| YES | | 0.00 | |
| `createdAt` | datetime | NO | | CURRENT_TIMESTAMP | |

---

### 7. `teams` (Participating Units)
| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| `teamId` | int | NO | PRI | | auto_increment |
| `name` | varchar(100) | NO | | | |
| `departmentId` | int | NO | MUL | | FK to `departments` |
| `sportId` | int | NO | MUL | | FK to `sports` |
| `tournamentId` | int | NO | MUL | | FK to `tournaments` |
| `captain_studentId`| int | YES | MUL | | FK to `students` |
| `coach_name` | varchar(100) | YES | | | |
| `jersey_color` | varchar(50) | YES | | | |
| `status` | enum('Pending', 'Approved', 'Disqualified')| YES| | 'Pending' | |
| `createdAt` | datetime | NO | | CURRENT_TIMESTAMP | |

---

### 8. `team_members` (Strict Normalization Junction Table)
| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| `memberId` | int | NO | PRI | | auto_increment |
| `teamId` | int | NO | MUL | | FK to `teams` |
| `studentId` | int | NO | MUL | | FK to `students` |
| `role` | enum('Captain', 'Vice Captain', 'Player', 'Reserve', 'Goalkeeper')| YES | | 'Player' | |
| `jersey_number` | int | YES | | | |
| `medical_clearance`| tinyint(1) | YES | | 1 | |
| `join_date` | datetime | NO | | CURRENT_TIMESTAMP | |

---

### 9. `matches` (Games & Scoring)
| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| `matchId` | int | NO | PRI | | auto_increment |
| `tournamentId` | int | NO | MUL | | FK to `tournaments` |
| `sportId` | int | NO | MUL | | FK to `sports` |
| `team_a_id` | int | NO | MUL | | FK to `teams` |
| `team_b_id` | int | NO | MUL | | FK to `teams` |
| `venueId` | int | YES | MUL | | FK to `venues` |
| `scheduled_time`| datetime | NO | | | |
| `round` | enum('League', 'Quarter-Final', 'Semi-Final', 'Final')| YES| | | |
| `score_a` | int | YES | | 0 | |
| `score_b` | int | YES | | 0 | |
| `winner_teamId` | int | YES | MUL | | FK to `teams` |
| `man_of_match_studentId`| int | YES | MUL | | FK to `students` |
| `umpire_name` | varchar(100) | YES | | | |
| `status` | enum('Scheduled','Ongoing','Completed','Postponed')| NO | | 'Scheduled' | |
| `detail_score` | text | YES | | | e.g. "21-15, 18-21, 21-19" |
| `updated_by` | int | YES | MUL | | FK to `users` |
| `updatedAt` | datetime | NO | | CURRENT_TIMESTAMP ON UPDATE | |

---

### 10. `announcements` (News & Bulletins)
| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| `announcementId`| int | NO | PRI | | auto_increment |
| `title` | varchar(255) | NO | | | |
| `content` | text | NO | | | |
| `priority` | enum('Low', 'Medium', 'High', 'Urgent') | NO | | 'Low' | |
| `target_departmentId`| int | YES | MUL | | Null for All |
| `attachment_url`| varchar(255) | YES | | | |
| `author_userId` | int | NO | MUL | | FK to `users` |
| `expiry_date` | datetime | YES | | | |
| `createdAt` | datetime | NO | | CURRENT_TIMESTAMP | |

---

### 11. `od_requests` (Trimmed Leaves)
| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| `requestId` | int | NO | PRI | | auto_increment |
| `studentId` | int | NO | MUL | | FK to `students` |
| `tournamentId` | int | NO | MUL | | FK to `tournaments` |
| `from_date` | date | NO | | | |
| `to_date` | date | NO | | | |
| `total_days` | int | NO | | | |
| `reason` | text | YES | | | |
| `travel_allowance`| decimal(10,2)| YES | | 0.00 | |
| `approval_status`| enum('Pending','Approved','Rejected')| NO | | 'Pending' | |
| `approved_by` | int | YES | MUL | | FK to `users` |
| `createdAt` | datetime | NO | | CURRENT_TIMESTAMP | |

---

### 12. `audit_logs` (Security & Integrity)
| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| `logId` | int | NO | PRI | | auto_increment |
| `user_id` | int | YES | MUL | | FK to `users` |
| `action` | varchar(255) | NO | | | e.g. 'UPDATE_SCORE' |
| `table_affected`| varchar(50) | NO | | | |
| `record_id` | int | NO | | | |
| `old_value` | json | YES | | | Before change state |
| `new_value` | json | YES | | | After change state |
| `ip_address` | varchar(45) | YES | | | |
| `timestamp` | datetime | NO | | CURRENT_TIMESTAMP | |

---

### 13. `ai_chat_sessions` (Core AI Identity)
| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| `sessionId` | int | NO | PRI | | auto_increment |
| `user_id` | int | NO | MUL | | FK to `users` |
| `title` | varchar(255) | YES | | 'New Chat' | |
| `context_tags` | json | YES | | | e.g., ["football", "schedule"] |
| `status` | enum('Active','Archived') | NO | | 'Active' | |
| `createdAt` | datetime | NO | | CURRENT_TIMESTAMP | |

---

### 14. `ai_messages` (Core AI Identity)
| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| `messageId` | int | NO | PRI | | auto_increment |
| `sessionId` | int | NO | MUL | | FK to `ai_chat_sessions`|
| `sender` | enum('USER', 'AI', 'SYSTEM') | NO | | | |
| `content` | text | NO | | | |
| `tokens_used` | int | YES | | | |
| `createdAt` | datetime | NO | | CURRENT_TIMESTAMP | |
