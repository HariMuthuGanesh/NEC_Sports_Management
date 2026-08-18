/* NEC Sports Management System - Mock Database (Backend Independent Layer) */

export const INITIAL_DEPARTMENTS = [
  { id: "dept_cse", name: "Computer Science & Engineering", code: "CSE", color: "#3b82f6" },
  { id: "dept_ece", name: "Electronics & Communication Engg", code: "ECE", color: "#10b981" },
  { id: "dept_eee", name: "Electrical & Electronics Engg", code: "EEE", color: "#f59e0b" },
  { id: "dept_mech", name: "Mechanical Engineering", code: "MECH", color: "#ef4444" },
  { id: "dept_civil", name: "Civil Engineering", code: "CIVIL", color: "#8b5cf6" },
  { id: "dept_it", name: "Information Technology", code: "IT", color: "#06b6d4" },
  { id: "dept_aids", name: "Artificial Intelligence & Data Science", code: "AI-DS", color: "#ec4899" },
  { id: "dept_mba", name: "Management Studies", code: "MBA", color: "#64748b" }
];

export const INITIAL_SPORTS = [
  { id: "sp_football", name: "Football", type: "Team", minPlayers: 11, maxPlayers: 18, icon: "CircleDot" },
  { id: "sp_cricket", name: "Cricket", type: "Team", minPlayers: 11, maxPlayers: 16, icon: "Trophy" },
  { id: "sp_basketball", name: "Basketball", type: "Team", minPlayers: 5, maxPlayers: 12, icon: "Activity" },
  { id: "sp_volleyball", name: "Volleyball", type: "Team", minPlayers: 6, maxPlayers: 12, icon: "Zap" },
  { id: "sp_badminton", name: "Badminton", type: "Individual / Doubles", minPlayers: 1, maxPlayers: 4, icon: "Award" },
  { id: "sp_tt", name: "Table Tennis", type: "Individual / Doubles", minPlayers: 1, maxPlayers: 4, icon: "Target" },
  { id: "sp_athletics", name: "Athletics", type: "Individual", minPlayers: 1, maxPlayers: 10, icon: "Flame" },
  { id: "sp_chess", name: "Chess", type: "Individual", minPlayers: 1, maxPlayers: 5, icon: "Crown" }
];

export const INITIAL_VENUES = [
  { id: "v_main_ground", name: "NEC Main Stadium Ground", type: "Outdoor", capacity: 3000, status: "Available" },
  { id: "v_lasa_indoor", name: "LASA Indoor Sports Complex", type: "Indoor", capacity: 800, status: "Available" },
  { id: "v_cricket_oval", name: "NEC Cricket Turf Oval", type: "Outdoor", capacity: 1500, status: "Available" },
  { id: "v_badminton_court", name: "LASA Badminton Courts 1-4", type: "Indoor", capacity: 400, status: "Occupied" },
  { id: "v_bb_court", name: "Outdoor Basketball Arena", type: "Outdoor", capacity: 500, status: "Available" },
  { id: "v_chess_hall", name: "Student Activity Center Hall B", type: "Indoor", capacity: 150, status: "Available" }
];

export const INITIAL_TOURNAMENTS = [
  {
    id: "tn_2026_interdept",
    title: "Annual Inter-Department Sports Meet 2026",
    academicYear: "2025-2026",
    startDate: "2026-08-01",
    endDate: "2026-08-25",
    status: "Ongoing",
    description: "The premier multi-sport championship for National Engineering College departments.",
    organizer: "Physical Education Department & LASA",
    bannerImg: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "tn_lasa_trophy",
    title: "Lakshmi Ammal Memorial Sports Trophy",
    academicYear: "2025-2026",
    startDate: "2026-09-10",
    endDate: "2026-09-20",
    status: "Registration Open",
    description: "Inter-collegiate and departmental invitations for Basketball and Badminton.",
    organizer: "NEC Sports Council",
    bannerImg: "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "tn_monsoon_cricket",
    title: "NEC Monsoon Cricket League",
    academicYear: "2025-2026",
    startDate: "2026-08-05",
    endDate: "2026-08-18",
    status: "Ongoing",
    description: "T20 Knockout tournament across all engineering branches.",
    organizer: "NEC Sports Council",
    bannerImg: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=800&q=80"
  }
];

export const INITIAL_EVENTS = [
  { id: "ev_101", tournamentId: "tn_2026_interdept", sportId: "sp_football", category: "Men", title: "Men's Football Championship", maxTeams: 8, registeredTeams: 8, status: "Ongoing", regDeadline: "2026-07-28" },
  { id: "ev_102", tournamentId: "tn_2026_interdept", sportId: "sp_basketball", category: "Men", title: "Men's Basketball Cup", maxTeams: 8, registeredTeams: 6, status: "Ongoing", regDeadline: "2026-07-28" },
  { id: "ev_103", tournamentId: "tn_2026_interdept", sportId: "sp_badminton", category: "Women", title: "Women's Badminton Singles", maxTeams: 16, registeredTeams: 14, status: "Open", regDeadline: "2026-08-15" },
  { id: "ev_104", tournamentId: "tn_monsoon_cricket", sportId: "sp_cricket", category: "Men", title: "Monsoon T20 Cricket", maxTeams: 8, registeredTeams: 8, status: "Ongoing", regDeadline: "2026-08-02" },
  { id: "ev_105", tournamentId: "tn_2026_interdept", sportId: "sp_athletics", category: "Open", title: "100m Sprint Finals", maxTeams: 16, registeredTeams: 12, status: "Upcoming", regDeadline: "2026-08-18" },
  { id: "ev_106", tournamentId: "tn_2026_interdept", sportId: "sp_chess", category: "Open", title: "Inter-Dept Blitz Chess", maxTeams: 32, registeredTeams: 20, status: "Open", regDeadline: "2026-08-20" }
];

export const INITIAL_TEAMS = [
  { id: "tm_cse_fb", deptId: "dept_cse", deptCode: "CSE", sportId: "sp_football", name: "CSE Strikers", captainName: "Rahul Sharma", captainRoll: "2112045", memberCount: 16, status: "Approved" },
  { id: "tm_mech_fb", deptId: "dept_mech", deptCode: "MECH", sportId: "sp_football", name: "Mech Titans", captainName: "Priya Patel", captainRoll: "2114012", memberCount: 15, status: "Approved" },
  { id: "tm_ece_cricket", deptId: "dept_ece", deptCode: "ECE", sportId: "sp_cricket", name: "ECE Chargers", captainName: "Karthik Raja", captainRoll: "2113088", memberCount: 15, status: "Approved" },
  { id: "tm_eee_bb", deptId: "dept_eee", deptCode: "EEE", sportId: "sp_basketball", name: "Electrical Eagles", captainName: "Amit Kumar", captainRoll: "2115023", memberCount: 10, status: "Approved" },
  { id: "tm_civil_ath", deptId: "dept_civil", deptCode: "CIVIL", sportId: "sp_athletics", name: "Civil Crushers", captainName: "Sneha Reddy", captainRoll: "2111054", memberCount: 8, status: "Approved" },
  { id: "tm_it_badminton", deptId: "dept_it", deptCode: "IT", sportId: "sp_badminton", name: "IT Smashers", captainName: "Ananya V", captainRoll: "2117009", memberCount: 4, status: "Pending" }
];

/* External Student Registry Simulation (Integrated via Student Lookup Boundary) */
export const EXTERNAL_STUDENT_DATABASE = [
  { studentId: "2112045", name: "Rahul Sharma", dept: "CSE", year: "3rd Year", email: "rahul.21cse@nec.edu.in", phone: "9876543210" },
  { studentId: "2114012", name: "Priya Patel", dept: "MECH", year: "4th Year", email: "priya.21mech@nec.edu.in", phone: "9876543211" },
  { studentId: "2113088", name: "Karthik Raja", dept: "ECE", year: "3rd Year", email: "karthik.21ece@nec.edu.in", phone: "9876543212" },
  { studentId: "2115023", name: "Amit Kumar", dept: "EEE", year: "2nd Year", email: "amit.22eee@nec.edu.in", phone: "9876543213" },
  { studentId: "2111054", name: "Sneha Reddy", dept: "CIVIL", year: "3rd Year", email: "sneha.21civil@nec.edu.in", phone: "9876543214" },
  { studentId: "2117009", name: "Ananya V", dept: "IT", year: "2nd Year", email: "ananya.22it@nec.edu.in", phone: "9876543215" },
  { studentId: "2218041", name: "Muthu Ganesh", dept: "AI-DS", year: "2nd Year", email: "muthu.22aids@nec.edu.in", phone: "9876543216" },
  { studentId: "2319015", name: "Divya Lakshmi", dept: "CSE", year: "1st Year", email: "divya.23cse@nec.edu.in", phone: "9876543217" }
];

export const INITIAL_PLAYERS = [
  { id: "pl_1", teamId: "tm_cse_fb", studentId: "2112045", name: "Rahul Sharma", dept: "CSE", year: "3rd Year", position: "Forward", jerseyNo: "10", attendancePct: 95 },
  { id: "pl_2", teamId: "tm_cse_fb", studentId: "2319015", name: "Divya Lakshmi", dept: "CSE", year: "1st Year", position: "Midfielder", jerseyNo: "7", attendancePct: 88 },
  { id: "pl_3", teamId: "tm_mech_fb", studentId: "2114012", name: "Priya Patel", dept: "MECH", year: "4th Year", position: "Defender", jerseyNo: "4", attendancePct: 100 },
  { id: "pl_4", teamId: "tm_ece_cricket", studentId: "2113088", name: "Karthik Raja", dept: "ECE", year: "3rd Year", position: "All-Rounder", jerseyNo: "18", attendancePct: 92 },
  { id: "pl_5", teamId: "tm_eee_bb", studentId: "2115023", name: "Amit Kumar", dept: "EEE", year: "2nd Year", position: "Point Guard", jerseyNo: "11", attendancePct: 90 },
  { id: "pl_6", teamId: "tm_civil_ath", studentId: "2111054", name: "Sneha Reddy", dept: "CIVIL", year: "3rd Year", position: "Sprinter", jerseyNo: "1", attendancePct: 96 }
];

export const INITIAL_MATCHES = [
  {
    id: "m_1001",
    tournamentId: "tn_2026_interdept",
    eventId: "ev_101",
    sport: "Football",
    teamA: "CSE Strikers",
    teamB: "Mech Titans",
    deptA: "CSE",
    deptB: "MECH",
    venue: "NEC Main Stadium Ground",
    date: "2026-08-13",
    time: "04:30 PM",
    round: "Quarter Final",
    status: "Live",
    scoreA: 2,
    scoreB: 1,
    detailScore: "CSE: Rahul (14', 52') | MECH: Priya (38')",
    winner: null
  },
  {
    id: "m_1002",
    tournamentId: "tn_monsoon_cricket",
    eventId: "ev_104",
    sport: "Cricket",
    teamA: "ECE Chargers",
    teamB: "Electrical Eagles",
    deptA: "ECE",
    deptB: "EEE",
    venue: "NEC Cricket Turf Oval",
    date: "2026-08-13",
    time: "03:00 PM",
    round: "Semi Final 1",
    status: "Live",
    scoreA: 142,
    scoreB: 118,
    detailScore: "ECE: 142/6 (18.2 Overs) | EEE: 118/9 (16.0 Overs)",
    winner: null
  },
  {
    id: "m_1003",
    tournamentId: "tn_2026_interdept",
    eventId: "ev_102",
    sport: "Basketball",
    teamA: "Electrical Eagles",
    teamB: "Civil Crushers",
    deptA: "EEE",
    deptB: "CIVIL",
    venue: "Outdoor Basketball Arena",
    date: "2026-08-14",
    time: "09:30 AM",
    round: "Group Stage",
    status: "Scheduled",
    scoreA: null,
    scoreB: null,
    winner: null
  },
  {
    id: "m_1004",
    tournamentId: "tn_2026_interdept",
    eventId: "ev_103",
    sport: "Badminton",
    teamA: "IT Smashers",
    teamB: "CSE Strikers",
    deptA: "IT",
    deptB: "CSE",
    venue: "LASA Badminton Courts 1-4",
    date: "2026-08-15",
    time: "10:00 AM",
    round: "Round of 16",
    status: "Scheduled",
    scoreA: null,
    scoreB: null,
    winner: null
  },
  {
    id: "m_1005",
    tournamentId: "tn_2026_interdept",
    eventId: "ev_101",
    sport: "Football",
    teamA: "ECE Chargers",
    teamB: "Civil Crushers",
    deptA: "ECE",
    deptB: "CIVIL",
    venue: "NEC Main Stadium Ground",
    date: "2026-08-10",
    time: "04:00 PM",
    round: "Quarter Final",
    status: "Completed",
    scoreA: 3,
    scoreB: 0,
    detailScore: "ECE won by 3 goals (Clean Sheet)",
    winner: "ECE Chargers"
  }
];

export const INITIAL_LEADERBOARD = [
  { rank: 1, deptCode: "CSE", deptName: "Computer Science & Engineering", gold: 5, silver: 3, bronze: 2, points: 145 },
  { rank: 2, deptCode: "ECE", deptName: "Electronics & Communication Engg", gold: 4, silver: 4, bronze: 1, points: 130 },
  { rank: 3, deptCode: "MECH", deptName: "Mechanical Engineering", gold: 3, silver: 2, bronze: 4, points: 110 },
  { rank: 4, deptCode: "EEE", deptName: "Electrical & Electronics Engg", gold: 2, silver: 3, bronze: 2, points: 90 },
  { rank: 5, deptCode: "CIVIL", deptName: "Civil Engineering", gold: 2, silver: 1, bronze: 3, points: 75 },
  { rank: 6, deptCode: "IT", deptName: "Information Technology", gold: 1, silver: 2, bronze: 2, points: 60 },
  { rank: 7, deptCode: "AI-DS", deptName: "AI & Data Science", gold: 1, silver: 1, bronze: 1, points: 45 },
  { rank: 8, deptCode: "MBA", deptName: "Management Studies", gold: 0, silver: 2, bronze: 1, points: 25 }
];

export const INITIAL_ANNOUNCEMENTS = [
  {
    id: "ann_1",
    title: "Annual Sports Day 2026 Registration Notice",
    content: "All department sports coordinators are requested to submit final verified student team rosters before August 18, 2026.",
    category: "Important",
    date: "2026-08-12",
    author: "Physical Education Director (PT Sir)"
  },
  {
    id: "ann_2",
    title: "LASA Indoor Badminton Court Maintenance",
    content: "Court 3 & 4 will remain closed on Aug 14 morning for resurfacing. Scheduled matches have been shifted to Court 1 & 2.",
    category: "Facility",
    date: "2026-08-11",
    author: "LASA Administrator"
  },
  {
    id: "ann_3",
    title: "Monsoon Cricket League Semifinal Schedule",
    content: "ECE Chargers vs Electrical Eagles T20 Semifinal is set for Aug 13, 3:00 PM at NEC Cricket Oval.",
    category: "Schedule",
    date: "2026-08-10",
    author: "Sports Council"
  }
];

export const INITIAL_NOTIFICATIONS = [
  { id: "notif_1", title: "Match Live Now", message: "CSE Strikers vs Mech Titans Quarter Final has started at Main Stadium.", timestamp: "10 mins ago", read: false, type: "match" },
  { id: "notif_2", title: "Registration Approved", message: "IT Smashers Badminton team registration approved by Admin.", timestamp: "2 hours ago", read: false, type: "approval" },
  { id: "notif_3", title: "Score Updated", message: "ECE Chargers won Football QF against Civil Crushers (3 - 0).", timestamp: "Yesterday", read: true, type: "score" }
];

export const INITIAL_GALLERY = [
  { id: "g_1", title: "Inter-Dept Football Kickoff", sport: "Football", url: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=600&q=80", date: "2026-08-10" },
  { id: "g_2", title: "LASA Indoor Badminton Finals", sport: "Badminton", url: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=600&q=80", date: "2026-08-08" },
  { id: "g_3", title: "Monsoon Cricket T20 Action", sport: "Cricket", url: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=600&q=80", date: "2026-08-05" },
  { id: "g_4", title: "Athletics 100m Heats", sport: "Athletics", url: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=600&q=80", date: "2026-08-02" }
];
