/**
 * National Engineering College (NEC) — Sports Management System
 * Core 8-State Finite State Machine (FSM) Engine & Domain Registries
 */

// ============================================================================
// 1. LIVE REAL-TIME MATCH & SCOREBOARD SYNC FSM (8 States)
// ============================================================================
export const LIVE_SCORE_SYNC_STATES = {
  IDLE: "IDLE",
  DISCOVERING: "DISCOVERING",
  CONNECTING: "CONNECTING",
  CONNECTED: "CONNECTED",
  STREAMING: "STREAMING",
  NETWORK_ERROR: "NETWORK_ERROR",
  AUTH_ERROR: "AUTH_ERROR",
  DISCONNECTED: "DISCONNECTED",
};

export const LIVE_SCORE_SYNC_META = {
  [LIVE_SCORE_SYNC_STATES.IDLE]: { id: 1, label: "Idle", message: "Ready to Connect", color: "#64748b", badge: "default" },
  [LIVE_SCORE_SYNC_STATES.DISCOVERING]: { id: 2, label: "Discovering", message: "Searching for Match Feed...", color: "#f59e0b", badge: "warning" },
  [LIVE_SCORE_SYNC_STATES.CONNECTING]: { id: 3, label: "Connecting", message: "Connecting to Live Gateway...", color: "#005691", badge: "info" },
  [LIVE_SCORE_SYNC_STATES.CONNECTED]: { id: 4, label: "Connected", message: "Connected — Channel Synchronized", color: "#10b981", badge: "success" },
  [LIVE_SCORE_SYNC_STATES.STREAMING]: { id: 5, label: "Streaming", message: "LIVE STREAMING • 60 FPS", color: "#ef4444", badge: "live" },
  [LIVE_SCORE_SYNC_STATES.NETWORK_ERROR]: { id: 6, label: "Network Error", message: "Network Error. Reconnecting in 3s...", color: "#dc2626", badge: "danger" },
  [LIVE_SCORE_SYNC_STATES.AUTH_ERROR]: { id: 7, label: "Auth Error", message: "Invalid Credentials / Unauthorized", color: "#b91c1c", badge: "danger" },
  [LIVE_SCORE_SYNC_STATES.DISCONNECTED]: { id: 8, label: "Disconnected", message: "Disconnected. Tap to Reconnect.", color: "#475569", badge: "neutral" },
};

// ============================================================================
// 2. MATCH LIFECYCLE & PROGRESSION FSM (8 States)
// ============================================================================
export const MATCH_LIFECYCLE_STATES = {
  SCHEDULED: "SCHEDULED",
  ROSTER_VERIFICATION: "ROSTER_VERIFICATION",
  WARMUP_TOSS: "WARMUP_TOSS",
  LIVE_IN_PLAY: "LIVE_IN_PLAY",
  INTERVAL_TIMEOUT: "INTERVAL_TIMEOUT",
  DISPUTE_REVIEW: "DISPUTE_REVIEW",
  MATCH_CONCLUDED: "MATCH_CONCLUDED",
  OFFICIAL_CERTIFIED: "OFFICIAL_CERTIFIED",
};

export const MATCH_LIFECYCLE_META = {
  [MATCH_LIFECYCLE_STATES.SCHEDULED]: { id: 1, label: "Scheduled", message: "Fixture Scheduled", color: "#3b82f6", badge: "info" },
  [MATCH_LIFECYCLE_STATES.ROSTER_VERIFICATION]: { id: 2, label: "Roster Verification", message: "Verifying Squads & Biometrics...", color: "#f59e0b", badge: "warning" },
  [MATCH_LIFECYCLE_STATES.WARMUP_TOSS]: { id: 3, label: "Warm-up & Toss", message: "Warm-up in Progress • Toss Won", color: "#c59b27", badge: "gold" },
  [MATCH_LIFECYCLE_STATES.LIVE_IN_PLAY]: { id: 4, label: "Live In-Play", message: "LIVE — Match In-Play", color: "#ef4444", badge: "live" },
  [MATCH_LIFECYCLE_STATES.INTERVAL_TIMEOUT]: { id: 5, label: "Interval / Timeout", message: "Half-Time Break / Strategic Timeout", color: "#f97316", badge: "warning" },
  [MATCH_LIFECYCLE_STATES.DISPUTE_REVIEW]: { id: 6, label: "Dispute / Review", message: "Under Official Referee Review", color: "#eab308", badge: "warning" },
  [MATCH_LIFECYCLE_STATES.MATCH_CONCLUDED]: { id: 7, label: "Match Concluded", message: "Final Whistle — Awaiting HOD Sign-off", color: "#8b5cf6", badge: "purple" },
  [MATCH_LIFECYCLE_STATES.OFFICIAL_CERTIFIED]: { id: 8, label: "Official Certified", message: "Certified & Points Archived", color: "#10b981", badge: "success" },
};

// Valid Transitions Guard for Matches
export const MATCH_VALID_TRANSITIONS = {
  [MATCH_LIFECYCLE_STATES.SCHEDULED]: [MATCH_LIFECYCLE_STATES.ROSTER_VERIFICATION, MATCH_LIFECYCLE_STATES.DISPUTE_REVIEW],
  [MATCH_LIFECYCLE_STATES.ROSTER_VERIFICATION]: [MATCH_LIFECYCLE_STATES.WARMUP_TOSS, MATCH_LIFECYCLE_STATES.DISPUTE_REVIEW],
  [MATCH_LIFECYCLE_STATES.WARMUP_TOSS]: [MATCH_LIFECYCLE_STATES.LIVE_IN_PLAY],
  [MATCH_LIFECYCLE_STATES.LIVE_IN_PLAY]: [MATCH_LIFECYCLE_STATES.INTERVAL_TIMEOUT, MATCH_LIFECYCLE_STATES.DISPUTE_REVIEW, MATCH_LIFECYCLE_STATES.MATCH_CONCLUDED],
  [MATCH_LIFECYCLE_STATES.INTERVAL_TIMEOUT]: [MATCH_LIFECYCLE_STATES.LIVE_IN_PLAY, MATCH_LIFECYCLE_STATES.MATCH_CONCLUDED],
  [MATCH_LIFECYCLE_STATES.DISPUTE_REVIEW]: [MATCH_LIFECYCLE_STATES.LIVE_IN_PLAY, MATCH_LIFECYCLE_STATES.MATCH_CONCLUDED, MATCH_LIFECYCLE_STATES.SCHEDULED],
  [MATCH_LIFECYCLE_STATES.MATCH_CONCLUDED]: [MATCH_LIFECYCLE_STATES.OFFICIAL_CERTIFIED, MATCH_LIFECYCLE_STATES.DISPUTE_REVIEW],
  [MATCH_LIFECYCLE_STATES.OFFICIAL_CERTIFIED]: [], // Terminal State
};

// ============================================================================
// 3. NEC IMS STUDENT ELIGIBILITY FSM (8 States)
// ============================================================================
export const IMS_STUDENT_STATES = {
  IDLE: "IDLE",
  IMS_QUERYING: "IMS_QUERYING",
  VERIFIED_ELIGIBLE: "VERIFIED_ELIGIBLE",
  ROSTER_ASSIGNED: "ROSTER_ASSIGNED",
  VENUE_CHECKED_IN: "VENUE_CHECKED_IN",
  IMS_DEGRADED: "IMS_DEGRADED",
  INELIGIBLE_HOLD: "INELIGIBLE_HOLD",
  ROSTER_LOCKED: "ROSTER_LOCKED",
};

export const IMS_STUDENT_META = {
  [IMS_STUDENT_STATES.IDLE]: { id: 1, label: "Idle", message: "Enter 7-Digit Roll Number", color: "#64748b", badge: "default" },
  [IMS_STUDENT_STATES.IMS_QUERYING]: { id: 2, label: "IMS Querying", message: "Querying NEC Academic ERP...", color: "#005691", badge: "info" },
  [IMS_STUDENT_STATES.VERIFIED_ELIGIBLE]: { id: 3, label: "Verified & Eligible", message: "Student Verified • Eligible", color: "#10b981", badge: "success" },
  [IMS_STUDENT_STATES.ROSTER_ASSIGNED]: { id: 4, label: "Roster Assigned", message: "Assigned to Tournament Squad", color: "#002b49", badge: "navy" },
  [IMS_STUDENT_STATES.VENUE_CHECKED_IN]: { id: 5, label: "Venue Checked-in", message: "Checked-in at Court / Ground", color: "#0d9488", badge: "teal" },
  [IMS_STUDENT_STATES.IMS_DEGRADED]: { id: 6, label: "IMS Degraded", message: "IMS Degraded — Using Local Cache", color: "#f59e0b", badge: "warning" },
  [IMS_STUDENT_STATES.INELIGIBLE_HOLD]: { id: 7, label: "Ineligible / Hold", message: "Ineligible: Academic or Disciplinary Hold", color: "#dc2626", badge: "danger" },
  [IMS_STUDENT_STATES.ROSTER_LOCKED]: { id: 8, label: "Roster Locked", message: "Roster Certified & Locked", color: "#334155", badge: "locked" },
};

// ============================================================================
// 4. TOURNAMENT PROGRESSION FSM (8 States)
// ============================================================================
export const TOURNAMENT_STATES = {
  DRAFT: "DRAFT",
  REGISTRATION_OPEN: "REGISTRATION_OPEN",
  REGISTRATION_CLOSED: "REGISTRATION_CLOSED",
  FIXTURES_PUBLISHED: "FIXTURES_PUBLISHED",
  IN_PROGRESS: "IN_PROGRESS",
  WEATHER_HOLD: "WEATHER_HOLD",
  CHAMPIONSHIP_STAGE: "CHAMPIONSHIP_STAGE",
  CONCLUDED_AWARDED: "CONCLUDED_AWARDED",
};

export const TOURNAMENT_META = {
  [TOURNAMENT_STATES.DRAFT]: { id: 1, label: "Draft", message: "Drafting Rules & Regulations", color: "#64748b", badge: "default" },
  [TOURNAMENT_STATES.REGISTRATION_OPEN]: { id: 2, label: "Registration Open", message: "Accepting Department Entries", color: "#10b981", badge: "success" },
  [TOURNAMENT_STATES.REGISTRATION_CLOSED]: { id: 3, label: "Registration Closed", message: "Registrations Closed — Seeding Teams", color: "#f59e0b", badge: "warning" },
  [TOURNAMENT_STATES.FIXTURES_PUBLISHED]: { id: 4, label: "Fixtures Published", message: "Fixtures & Venues Live", color: "#005691", badge: "info" },
  [TOURNAMENT_STATES.IN_PROGRESS]: { id: 5, label: "In Progress", message: "Tournament Ongoing", color: "#ef4444", badge: "live" },
  [TOURNAMENT_STATES.WEATHER_HOLD]: { id: 6, label: "Weather Hold", message: "Weather Hold — Rescheduling", color: "#ea580c", badge: "warning" },
  [TOURNAMENT_STATES.CHAMPIONSHIP_STAGE]: { id: 7, label: "Championship Stage", message: "Grand Finals Day • Championship", color: "#c59b27", badge: "gold" },
  [TOURNAMENT_STATES.CONCLUDED_AWARDED]: { id: 8, label: "Concluded & Awarded", message: "Tournament Concluded & Points Awarded", color: "#059669", badge: "success" },
};

// ============================================================================
// 5. VENUE BOOKING & CLASH PREVENTION FSM (8 States)
// ============================================================================
export const VENUE_BOOKING_STATES = {
  AVAILABLE: "AVAILABLE",
  CLASH_DETECTION: "CLASH_DETECTION",
  PENDING_APPROVAL: "PENDING_APPROVAL",
  CONFIRMED_LOCKED: "CONFIRMED_LOCKED",
  IN_ACTIVE_USE: "IN_ACTIVE_USE",
  CLASH_CONFLICT: "CLASH_CONFLICT",
  MAINTENANCE_HOLD: "MAINTENANCE_HOLD",
  ARCHIVED_LOGGED: "ARCHIVED_LOGGED",
};

export const VENUE_BOOKING_META = {
  [VENUE_BOOKING_STATES.AVAILABLE]: { id: 1, label: "Available", message: "Venue Open & Available", color: "#10b981", badge: "success" },
  [VENUE_BOOKING_STATES.CLASH_DETECTION]: { id: 2, label: "Clash Detection", message: "Analyzing Multi-court Overlaps...", color: "#005691", badge: "info" },
  [VENUE_BOOKING_STATES.PENDING_APPROVAL]: { id: 3, label: "Pending Approval", message: "Provisional Hold — Awaiting Sign-off", color: "#f59e0b", badge: "warning" },
  [VENUE_BOOKING_STATES.CONFIRMED_LOCKED]: { id: 4, label: "Confirmed & Locked", message: "Confirmed & Reserved", color: "#002b49", badge: "navy" },
  [VENUE_BOOKING_STATES.IN_ACTIVE_USE]: { id: 5, label: "In Active Use", message: "Court In Active Match Play", color: "#ef4444", badge: "live" },
  [VENUE_BOOKING_STATES.CLASH_CONFLICT]: { id: 6, label: "Clash Conflict", message: "Schedule Conflict Detected", color: "#dc2626", badge: "danger" },
  [VENUE_BOOKING_STATES.MAINTENANCE_HOLD]: { id: 7, label: "Maintenance Hold", message: "Closed for Maintenance / Rain", color: "#d97706", badge: "warning" },
  [VENUE_BOOKING_STATES.ARCHIVED_LOGGED]: { id: 8, label: "Archived & Logged", message: "Session Concluded & Audited", color: "#475569", badge: "neutral" },
};

// ============================================================================
// 6. ON-DUTY (OD) & CERTIFICATE FSM (8 States)
// ============================================================================
export const OD_CERTIFICATE_STATES = {
  DRAFT: "DRAFT",
  ADVISOR_REVIEW: "ADVISOR_REVIEW",
  DIRECTOR_APPROVAL: "DIRECTOR_APPROVAL",
  PRINCIPAL_CLEARANCE: "PRINCIPAL_CLEARANCE",
  CERTIFICATE_ISSUED: "CERTIFICATE_ISSUED",
  ATTENDANCE_DISCREPANCY: "ATTENDANCE_DISCREPANCY",
  REJECTED_REVOKED: "REJECTED_REVOKED",
  ARCHIVED_ERP: "ARCHIVED_ERP",
};

export const OD_CERTIFICATE_META = {
  [OD_CERTIFICATE_STATES.DRAFT]: { id: 1, label: "Draft", message: "OD Request Draft Created", color: "#64748b", badge: "default" },
  [OD_CERTIFICATE_STATES.ADVISOR_REVIEW]: { id: 2, label: "Advisor Review", message: "Pending Faculty Advisor Review", color: "#f59e0b", badge: "warning" },
  [OD_CERTIFICATE_STATES.DIRECTOR_APPROVAL]: { id: 3, label: "Director Approval", message: "Pending Physical Director Approval", color: "#005691", badge: "info" },
  [OD_CERTIFICATE_STATES.PRINCIPAL_CLEARANCE]: { id: 4, label: "Principal Clearance", message: "Principal Institutional Clearance Approved", color: "#002b49", badge: "navy" },
  [OD_CERTIFICATE_STATES.CERTIFICATE_ISSUED]: { id: 5, label: "Certificate Issued", message: "Cryptographic Certificate Issued", color: "#10b981", badge: "success" },
  [OD_CERTIFICATE_STATES.ATTENDANCE_DISCREPANCY]: { id: 6, label: "Discrepancy", message: "Unverified Venue Check-in", color: "#ea580c", badge: "warning" },
  [OD_CERTIFICATE_STATES.REJECTED_REVOKED]: { id: 7, label: "Rejected / Revoked", message: "OD Request Rejected / Revoked", color: "#dc2626", badge: "danger" },
  [OD_CERTIFICATE_STATES.ARCHIVED_ERP]: { id: 8, label: "Archived in ERP", message: "Attendance Credited to NEC ERP Record", color: "#c59b27", badge: "gold" },
};

// ============================================================================
// 7. CAMPUS SPORTS BULLETIN & BROADCAST FSM (8 States)
// ============================================================================
export const BROADCAST_STATES = {
  DRAFT: "DRAFT",
  TARGET_SEGMENTATION: "TARGET_SEGMENTATION",
  DELIVERING: "DELIVERING",
  ACTIVE_BROADCAST: "ACTIVE_BROADCAST",
  URGENT_FLASH_ALERT: "URGENT_FLASH_ALERT",
  DELIVERY_THROTTLED: "DELIVERY_THROTTLED",
  BROADCAST_REVOKED: "BROADCAST_REVOKED",
  ARCHIVED_AUDITED: "ARCHIVED_AUDITED",
};

export const BROADCAST_META = {
  [BROADCAST_STATES.DRAFT]: { id: 1, label: "Draft", message: "Draft Bulletin", color: "#64748b", badge: "default" },
  [BROADCAST_STATES.TARGET_SEGMENTATION]: { id: 2, label: "Target Segmentation", message: "Targeting Campus Recipients...", color: "#005691", badge: "info" },
  [BROADCAST_STATES.DELIVERING]: { id: 3, label: "Delivering", message: "Broadcasting to Campus Channels...", color: "#f59e0b", badge: "warning" },
  [BROADCAST_STATES.ACTIVE_BROADCAST]: { id: 4, label: "Active Broadcast", message: "Live Campus Announcement", color: "#10b981", badge: "success" },
  [BROADCAST_STATES.URGENT_FLASH_ALERT]: { id: 5, label: "Urgent Flash Alert", message: "URGENT VENUE ALERT", color: "#ef4444", badge: "live" },
  [BROADCAST_STATES.DELIVERY_THROTTLED]: { id: 6, label: "Throttled", message: "Delivery Throttled — Queued", color: "#ea580c", badge: "warning" },
  [BROADCAST_STATES.BROADCAST_REVOKED]: { id: 7, label: "Revoked", message: "Broadcast Revoked by Admin", color: "#991b1b", badge: "danger" },
  [BROADCAST_STATES.ARCHIVED_AUDITED]: { id: 8, label: "Archived & Audited", message: "Archived in Official Log", color: "#334155", badge: "neutral" },
};

// ============================================================================
// 8. SECURITY, AUTHENTICATION & RATE LIMITER FSM (8 States)
// ============================================================================
export const SECURITY_SESSION_STATES = {
  UNAUTHENTICATED: "UNAUTHENTICATED",
  CREDENTIAL_VERIFYING: "CREDENTIAL_VERIFYING",
  TOKEN_ISSUED: "TOKEN_ISSUED",
  ACTIVE_SESSION: "ACTIVE_SESSION",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  AUTH_FAILURE: "AUTH_FAILURE",
  RATE_LIMITED_LOCKED: "RATE_LIMITED_LOCKED",
  TOKEN_BLACKLISTED: "TOKEN_BLACKLISTED",
};

export const SECURITY_SESSION_META = {
  [SECURITY_SESSION_STATES.UNAUTHENTICATED]: { id: 1, label: "Unauthenticated", message: "Session Inactive — Please Sign In", color: "#64748b", badge: "default" },
  [SECURITY_SESSION_STATES.CREDENTIAL_VERIFYING]: { id: 2, label: "Verifying", message: "Verifying Cryptographic Credentials...", color: "#005691", badge: "info" },
  [SECURITY_SESSION_STATES.TOKEN_ISSUED]: { id: 3, label: "Token Issued", message: "Authenticated Successfully", color: "#10b981", badge: "success" },
  [SECURITY_SESSION_STATES.ACTIVE_SESSION]: { id: 4, label: "Active Session", message: "Role Authorization Active", color: "#002b49", badge: "navy" },
  [SECURITY_SESSION_STATES.TOKEN_EXPIRED]: { id: 5, label: "Token Expired", message: "Session Expired — Re-authenticating...", color: "#f59e0b", badge: "warning" },
  [SECURITY_SESSION_STATES.AUTH_FAILURE]: { id: 6, label: "Auth Failure", message: "Invalid Credentials (Attempt Recorded)", color: "#f97316", badge: "warning" },
  [SECURITY_SESSION_STATES.RATE_LIMITED_LOCKED]: { id: 7, label: "Rate Limited", message: "IP Temporarily Locked (Cooldown 15m)", color: "#dc2626", badge: "danger" },
  [SECURITY_SESSION_STATES.TOKEN_BLACKLISTED]: { id: 8, label: "Blacklisted", message: "Session Securely Terminated & Revoked", color: "#334155", badge: "neutral" },
};

/**
 * Universal FSM Transition Validator Helper
 */
export function validateStateTransition(transitionTable, currentState, nextState) {
  const allowed = transitionTable[currentState];
  if (!allowed) return false;
  return allowed.includes(nextState);
}
