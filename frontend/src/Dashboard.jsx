import { useState, useEffect, useRef, useCallback, useMemo, useReducer } from "react";
import { useSettings } from "./SettingsContext";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import "./Dashboard.css";

/* ── Initial Mock Data ────────────────────────────────────────────────────────────── */
const INITIAL_DEPARTMENTS = ["Computer Science", "Mechanical", "Electrical", "Civil", "Business", "Electronics"];
const INITIAL_SPORTS = ["Football", "Basketball", "Cricket", "Volleyball", "Badminton", "Table Tennis", "Athletics", "Chess"];

const INITIAL_ACTIVITIES = [
  { id: 101, title: "Annual Inter-Department Championship 2026", sport: "Multi-Sport", status: "Active", startDate: "2026-08-01", endDate: "2026-08-25", eventsCount: 8, dept: "All Departments" },
  { id: 102, title: "Monsoon Cricket League", sport: "Cricket", status: "Active", startDate: "2026-08-05", endDate: "2026-08-18", eventsCount: 4, dept: "All Departments" },
  { id: 103, title: "Indoor Games Grand Prix", sport: "Badminton", status: "Upcoming", startDate: "2026-08-20", endDate: "2026-08-28", eventsCount: 3, dept: "All Departments" },
  { id: 104, title: "Freshers Athletics Meet", sport: "Athletics", status: "Completed", startDate: "2026-07-15", endDate: "2026-07-20", eventsCount: 6, dept: "All Departments" }
];

const INITIAL_EVENTS = [
  { id: 201, activityId: 101, title: "100m Sprint Finals", sport: "Athletics", date: "2026-08-14", venue: "Main Track", maxParticipants: 16, registered: 14, status: "Upcoming" },
  { id: 202, activityId: 101, title: "Men's Football Knockout", sport: "Football", date: "2026-08-12", venue: "Main Ground", maxParticipants: 8, registered: 8, status: "Ongoing" },
  { id: 203, activityId: 102, title: "T20 Semifinal 1", sport: "Cricket", date: "2026-08-15", venue: "Cricket Ground", maxParticipants: 2, registered: 2, status: "Upcoming" },
  { id: 204, activityId: 103, title: "Singles Open Badminton", sport: "Badminton", date: "2026-08-22", venue: "Indoor Stadium", maxParticipants: 32, registered: 24, status: "Open" }
];

const INITIAL_REGISTRATIONS = [
  { id: 301, rollNo: "CS202401", studentName: "Rahul Sharma", dept: "Computer Science", sport: "Football", event: "Men's Football Knockout", status: "Pending", date: "2026-08-09" },
  { id: 302, rollNo: "ME202405", studentName: "Priya Patel", dept: "Mechanical", sport: "Badminton", event: "Singles Open Badminton", status: "Approved", date: "2026-08-08" },
  { id: 303, rollNo: "EE202412", studentName: "Amit Kumar", dept: "Electrical", sport: "Cricket", event: "T20 Semifinal 1", status: "Pending", date: "2026-08-09" },
  { id: 304, rollNo: "CV202409", studentName: "Sneha Reddy", dept: "Civil", sport: "Athletics", event: "100m Sprint Finals", status: "Approved", date: "2026-08-07" },
  { id: 305, rollNo: "BS202403", studentName: "Vikram Singh", dept: "Business", sport: "Chess", event: "Blitz Chess Masters", status: "Rejected", date: "2026-08-06" }
];

const INITIAL_PARTICIPANTS = [
  { id: 401, rollNo: "CS202401", name: "Rahul Sharma", dept: "Computer Science", sport: "Football", team: "CS Warriors", approvedBy: "Admin", status: "Verified" },
  { id: 402, rollNo: "ME202405", name: "Priya Patel", dept: "Mechanical", sport: "Badminton", team: "Mech Titans", approvedBy: "Admin", status: "Verified" },
  { id: 403, rollNo: "CV202409", name: "Sneha Reddy", dept: "Civil", sport: "Athletics", team: "Civil Crushers", approvedBy: "Admin", status: "Verified" },
  { id: 404, rollNo: "EC202411", name: "Karan Johar", dept: "Electronics", sport: "Table Tennis", team: "Electronics Sparks", approvedBy: "Admin", status: "Verified" }
];

const INITIAL_TEAMS = [
  { id: 501, name: "CS Warriors", dept: "Computer Science", sport: "Football", captain: "Rahul Sharma", members: 15, rank: 1 },
  { id: 502, name: "Mech Titans", dept: "Mechanical", sport: "Volleyball", captain: "Priya Patel", members: 12, rank: 3 },
  { id: 503, name: "Electrical Eagles", dept: "Electrical", sport: "Basketball", captain: "Amit Kumar", members: 10, rank: 5 },
  { id: 504, name: "Business Bulls", dept: "Business", sport: "Cricket", captain: "Vikram Singh", members: 16, rank: 2 }
];

const INITIAL_MATCHES = [
  { id: 1, sport: "Football", teamA: "CS Warriors", teamB: "Mech Titans", dept: "Computer Science", venue: "Main Ground", date: "2026-08-01", time: "10:00 AM", status: "Completed", scoreA: 3, scoreB: 1, winner: "CS Warriors" },
  { id: 2, sport: "Basketball", teamA: "Electrical Eagles", teamB: "Civil Crushers", dept: "Electrical", venue: "Indoor Court", date: "2026-08-02", time: "11:00 AM", status: "Completed", scoreA: 68, scoreB: 54, winner: "Electrical Eagles" },
  { id: 3, sport: "Cricket", teamA: "Business Bulls", teamB: "CS Warriors", dept: "Business", venue: "Cricket Ground", date: "2026-08-03", time: "09:00 AM", status: "Completed", scoreA: 187, scoreB: 165, winner: "Business Bulls" },
  { id: 4, sport: "Volleyball", teamA: "Mech Titans", teamB: "Electronics Sparks", dept: "Mechanical", venue: "Volleyball Court", date: "2026-08-04", time: "03:00 PM", status: "Completed", scoreA: 3, scoreB: 2, winner: "Mech Titans" },
  { id: 5, sport: "Badminton", teamA: "CS Warriors", teamB: "Electrical Eagles", dept: "Computer Science", venue: "Sports Hall", date: "2026-08-05", time: "01:00 PM", status: "Completed", scoreA: 21, scoreB: 15, winner: "CS Warriors" },
  { id: 6, sport: "Chess", teamA: "Business Bulls", teamB: "Civil Crushers", dept: "Business", venue: "Chess Room", date: "2026-08-06", time: "02:00 PM", status: "Completed", scoreA: 6, scoreB: 4, winner: "Business Bulls" },
  { id: 7, sport: "Table Tennis", teamA: "Electronics Sparks", teamB: "Mech Titans", dept: "Electronics", venue: "TT Room", date: "2026-08-07", time: "04:00 PM", status: "Completed", scoreA: 11, scoreB: 8, winner: "Electronics Sparks" },
  { id: 8, sport: "Athletics", teamA: "Civil Crushers", teamB: "CS Warriors", dept: "Civil", venue: "Athletics Track", date: "2026-08-08", time: "07:00 AM", status: "Completed", scoreA: 5, scoreB: 3, winner: "Civil Crushers" },
  { id: 9, sport: "Football", teamA: "Business Bulls", teamB: "Electronics Sparks", dept: "Business", venue: "Main Ground", date: "2026-08-09", time: "05:00 PM", status: "Completed", scoreA: 2, scoreB: 2, winner: "Draw" },
  { id: 10, sport: "Basketball", teamA: "CS Warriors", teamB: "Civil Crushers", dept: "Computer Science", venue: "Indoor Court", date: "2026-08-10", time: "10:00 AM", status: "Live", scoreA: 45, scoreB: 38, winner: null },
  { id: 11, sport: "Cricket", teamA: "Mech Titans", teamB: "Electrical Eagles", dept: "Mechanical", venue: "Cricket Ground", date: "2026-08-10", time: "11:00 AM", status: "Live", scoreA: 134, scoreB: 110, winner: null },
  { id: 12, sport: "Badminton", teamA: "Electronics Sparks", teamB: "Business Bulls", dept: "Electronics", venue: "Sports Hall", date: "2026-08-11", time: "02:00 PM", status: "Scheduled", scoreA: null, scoreB: null, winner: null },
  { id: 13, sport: "Volleyball", teamA: "CS Warriors", teamB: "Civil Crushers", dept: "Computer Science", venue: "Volleyball Court", date: "2026-08-11", time: "03:00 PM", status: "Scheduled", scoreA: null, scoreB: null, winner: null },
  { id: 14, sport: "Chess", teamA: "Mech Titans", teamB: "CS Warriors", dept: "Mechanical", venue: "Chess Room", date: "2026-08-12", time: "10:00 AM", status: "Scheduled", scoreA: null, scoreB: null, winner: null }
];

const INITIAL_LEADERBOARD = [
  { dept: "Computer Science", gold: 3, silver: 1, bronze: 2, points: 120, rank: 1 },
  { dept: "Business", gold: 2, silver: 2, bronze: 1, points: 105, rank: 2 },
  { dept: "Mechanical", gold: 2, silver: 1, bronze: 2, points: 95, rank: 3 },
  { dept: "Electronics", gold: 1, silver: 2, bronze: 1, points: 75, rank: 4 },
  { dept: "Electrical", gold: 1, silver: 1, bronze: 2, points: 70, rank: 5 },
  { dept: "Civil", gold: 1, silver: 1, bronze: 1, points: 60, rank: 6 }
];

const INITIAL_ACHIEVEMENTS = [
  { id: 601, title: "Inter-Department Football Championship", recipient: "CS Warriors", dept: "Computer Science", awardType: "Gold Trophy", sport: "Football", date: "2026-08-01" },
  { id: 602, title: "Best Batsman of the Tournament", recipient: "Vikram Singh", dept: "Business", awardType: "Individual Award", sport: "Cricket", date: "2026-08-03" },
  { id: 603, title: "100m Sprint Gold Medalist", recipient: "Sneha Reddy", dept: "Civil", awardType: "Gold Medal", sport: "Athletics", date: "2026-08-08" },
  { id: 604, title: "Badminton Doubles Runners-Up", recipient: "Electrical Eagles", dept: "Electrical", awardType: "Silver Medal", sport: "Badminton", date: "2026-08-05" }
];

const INITIAL_ANNOUNCEMENTS = [
  { id: 1, title: "Sports Day Finals scheduled for Aug 20th — all students must register by Aug 15.", date: "Aug 9, 2026", tag: "Event" },
  { id: 2, title: "New volleyball court inaugurated. Bookings open from Monday.", date: "Aug 8, 2026", tag: "Facility" },
  { id: 3, title: "Cricket semifinal postponed to Aug 14 due to weather conditions.", date: "Aug 7, 2026", tag: "Update" },
  { id: 4, title: "Chess tournament entry forms available at Sports Office. Last date: Aug 12.", date: "Aug 6, 2026", tag: "Event" },
  { id: 5, title: "Congratulations to CS Warriors for winning the Football inter-dept championship!", date: "Aug 5, 2026", tag: "Result" }
];

const CHART_COLORS = ["#6366f1", "#3b82f6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

/* ── Inline SVG Icons ─────────────────────────────────────────────────── */
const Ico = ({ d, d2, poly, circle, circle2, rect, line, lines, path }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {path && <path d={path} />}
    {d && <path d={d} />}
    {d2 && <path d={d2} />}
    {poly && <polyline points={poly} />}
    {circle && <circle cx={circle[0]} cy={circle[1]} r={circle[2]} />}
    {circle2 && <circle cx={circle2[0]} cy={circle2[1]} r={circle2[2]} />}
    {rect && <rect x={rect[0]} y={rect[1]} width={rect[2]} height={rect[3]} rx={rect[4] || 0} />}
    {line && <line x1={line[0]} y1={line[1]} x2={line[2]} y2={line[3]} />}
    {lines && lines.map((l, i) => <line key={i} x1={l[0]} y1={l[1]} x2={l[2]} y2={l[3]} />)}
  </svg>
);

/* ── Status Badge ──────────────────────────────────────────────────────── */
function StatusBadge({ status }) {
  const norm = status ? status.toLowerCase() : "default";
  return (
    <span className={"badge badge--" + norm}>
      {status === "Live" && <span className="badge-dot" />}
      {status}
    </span>
  );
}

/* ── KPI Card ──────────────────────────────────────────────────────────── */
function KpiCard({ label, value, icon, color }) {
  return (
    <div className="kpi-card">
      <div className={"kpi-icon-wrap kpi-icon-wrap--" + color}>{icon}</div>
      <div className="kpi-body">
        <div className="kpi-value">{value}</div>
        <div className="kpi-label">{label}</div>
      </div>
    </div>
  );
}

/* ── Custom Chart Tooltip ─────────────────────────────────────────────── */
function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__label">{label}</div>
      <div className="chart-tooltip__value">{payload[0].value} match{payload[0].value !== 1 ? "es" : ""}</div>
    </div>
  );
}

/* ── Main Dashboard Component ─────────────────────────────────────────── */
function Dashboard({ onLogout }) {
  const { theme, setTheme, t } = useSettings();
  const dark = theme === "dark";

  // Navigation modules list matching image & staff requirements
  const MODULES = [
    { id: "overview", label: t.overview, desc: "View operational summary" },
    { id: "activities", label: t.activities, desc: "Create and manage activities" },
    { id: "events", label: t.events, desc: "Add events inside an activity" },
    { id: "registrations", label: t.registrations, desc: "Manage student registrations" },
    { id: "participants", label: t.participants, desc: "View and approve participants" },
    { id: "teams", label: t.teams, desc: "Create and manage teams" },
    { id: "schedules", label: t.schedules, desc: "Create fixtures and schedules" },
    { id: "results", label: t.results, desc: "Record scores and positions" },
    { id: "achievements", label: t.achievements, desc: "Add awards" },
    { id: "announcements", label: t.announcements, desc: "Publish notices" },
    { id: "reports", label: t.reports, desc: "Generate operational reports" },
    { id: "aiAssistant", label: t.aiAssistant, desc: "Analyze and summarize activity data" },
  ];

  // Core state arrays for staff functions
  const [activities, setActivities] = useState(INITIAL_ACTIVITIES);
  const [events, setEvents] = useState(INITIAL_EVENTS);
  const [registrations, setRegistrations] = useState(INITIAL_REGISTRATIONS);
  const [participants, setParticipants] = useState(INITIAL_PARTICIPANTS);
  const [teams, setTeams] = useState(INITIAL_TEAMS);
  const [matches, setMatches] = useState(INITIAL_MATCHES);
  const [achievements, setAchievements] = useState(INITIAL_ACHIEVEMENTS);
  const [announcements, setAnnouncements] = useState(INITIAL_ANNOUNCEMENTS);
  const [leaderboard, setLeaderboard] = useState(INITIAL_LEADERBOARD);

  // Filters state
  const [matchSportFilter, setMatchSportFilter] = useState("All");
  const [matchStatusFilter, setMatchStatusFilter] = useState("All");
  const [regStatusFilter, setRegStatusFilter] = useState("All");

  // Nav & UI flags
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeNav, setActiveNav] = useState("overview");
  const [clock, setClock] = useState(() =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  );

  // Modal forms states
  const [activeModal, setActiveModal] = useState(null); // 'activity' | 'event' | 'team' | 'fixture' | 'score' | 'award' | 'notice'
  const [selectedMatchForScore, setSelectedMatchForScore] = useState(null);

  // Form Inputs
  const [newActivity, setNewActivity] = useState({ title: "", sport: "Football", dept: "All Departments", startDate: "", endDate: "" });
  const [newEvent, setNewEvent] = useState({ title: "", activityId: 101, sport: "Football", date: "", venue: "", maxParticipants: 16 });
  const [newTeam, setNewTeam] = useState({ name: "", dept: "Computer Science", sport: "Football", captain: "", members: 10 });
  const [newFixture, setNewFixture] = useState({ sport: "Football", teamA: "", teamB: "", venue: "Main Ground", date: "", time: "10:00 AM" });
  const [scoreForm, setScoreForm] = useState({ scoreA: "", scoreB: "", status: "Completed" });
  const [newAward, setNewAward] = useState({ title: "", recipient: "", dept: "Computer Science", awardType: "Gold Medal", sport: "Football", date: "" });
  const [newNotice, setNewNotice] = useState({ title: "", tag: "Event" });

  // AI Assistant Chat State
  const [aiChat, setAiChat] = useState([
    { sender: "assistant", text: "Hello Staff Admin! I am your Sports Management AI Assistant. Ask me to analyze tournaments, summarize participation data, or generate match stats." }
  ]);
  const [aiPrompt, setAiPrompt] = useState("");

  // Clock tick
  useEffect(() => {
    const id = setInterval(() => setClock(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })), 1000);
    return () => clearInterval(id);
  }, []);

  // Section refs for scroll spy
  const secRefs = useRef({});
  const setRef = useCallback((id) => (el) => { secRefs.current[id] = el; }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) setActiveNav(e.target.dataset.section); }),
      { threshold: 0.2 }
    );
    Object.values(secRefs.current).forEach(el => el && obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const scrollTo = useCallback((id) => {
    setActiveNav(id);
    secRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (window.innerWidth < 768) setSidebarOpen(false);
  }, []);

  // Derived Calculations
  const filteredMatches = useMemo(() =>
    matches.filter(m =>
      (matchSportFilter === "All" || m.sport === matchSportFilter) &&
      (matchStatusFilter === "All" || m.status === matchStatusFilter)
    ), [matches, matchSportFilter, matchStatusFilter]);

  const filteredRegistrations = useMemo(() =>
    registrations.filter(r => regStatusFilter === "All" || r.status === regStatusFilter),
    [registrations, regStatusFilter]);

  const chartData = useMemo(() => {
    const counts = {};
    INITIAL_SPORTS.forEach(s => { counts[s] = 0; });
    matches.forEach(m => { counts[m.sport] = (counts[m.sport] || 0) + 1; });
    return Object.entries(counts).map(([sport, count]) => ({ sport, count }));
  }, [matches]);

  const kpi = useMemo(() => {
    const uniqueTeams = [...new Set([...matches.map(m => m.teamA), ...matches.map(m => m.teamB)])];
    return {
      totalMatches: matches.length,
      liveMatches: matches.filter(m => m.status === "Live").length,
      registeredTeams: teams.length || uniqueTeams.length,
      totalPlayers: participants.length * 5 + 40,
      departments: INITIAL_DEPARTMENTS.length,
      pendingRegs: registrations.filter(r => r.status === "Pending").length,
      activeActivities: activities.filter(a => a.status === "Active").length
    };
  }, [matches, teams, participants, registrations, activities]);

  // Handlers for Staff Actions
  const handleApproveRegistration = (reg) => {
    setRegistrations(prev => prev.map(r => r.id === reg.id ? { ...r, status: "Approved" } : r));
    setParticipants(prev => [
      ...prev,
      { id: Date.now(), rollNo: reg.rollNo, name: reg.studentName, dept: reg.dept, sport: reg.sport, team: reg.dept + " Team", approvedBy: "Admin", status: "Verified" }
    ]);
  };

  const handleRejectRegistration = (id) => {
    setRegistrations(prev => prev.map(r => r.id === id ? { ...r, status: "Rejected" } : r));
  };

  const handleCreateActivitySubmit = (e) => {
    e.preventDefault();
    if (!newActivity.title.trim()) return;
    setActivities(prev => [
      { id: Date.now(), title: newActivity.title, sport: newActivity.sport, status: "Active", startDate: newActivity.startDate || "2026-08-15", endDate: newActivity.endDate || "2026-08-30", eventsCount: 0, dept: newActivity.dept },
      ...prev
    ]);
    setNewActivity({ title: "", sport: "Football", dept: "All Departments", startDate: "", endDate: "" });
    setActiveModal(null);
  };

  const handleCreateEventSubmit = (e) => {
    e.preventDefault();
    if (!newEvent.title.trim()) return;
    setEvents(prev => [
      { id: Date.now(), activityId: Number(newEvent.activityId), title: newEvent.title, sport: newEvent.sport, date: newEvent.date || "2026-08-18", venue: newEvent.venue || "Main Field", maxParticipants: Number(newEvent.maxParticipants), registered: 0, status: "Open" },
      ...prev
    ]);
    setNewEvent({ title: "", activityId: 101, sport: "Football", date: "", venue: "", maxParticipants: 16 });
    setActiveModal(null);
  };

  const handleCreateTeamSubmit = (e) => {
    e.preventDefault();
    if (!newTeam.name.trim()) return;
    setTeams(prev => [
      { id: Date.now(), name: newTeam.name, dept: newTeam.dept, sport: newTeam.sport, captain: newTeam.captain || "TBD", members: Number(newTeam.members), rank: prev.length + 1 },
      ...prev
    ]);
    setNewTeam({ name: "", dept: "Computer Science", sport: "Football", captain: "", members: 10 });
    setActiveModal(null);
  };

  const handleCreateFixtureSubmit = (e) => {
    e.preventDefault();
    if (!newFixture.teamA || !newFixture.teamB) return;
    setMatches(prev => [
      { id: Date.now(), sport: newFixture.sport, teamA: newFixture.teamA, teamB: newFixture.teamB, dept: "Inter-Dept", venue: newFixture.venue, date: newFixture.date || "2026-08-16", time: newFixture.time, status: "Scheduled", scoreA: null, scoreB: null, winner: null },
      ...prev
    ]);
    setNewFixture({ sport: "Football", teamA: "", teamB: "", venue: "Main Ground", date: "", time: "10:00 AM" });
    setActiveModal(null);
  };

  const handleRecordScoreSubmit = (e) => {
    e.preventDefault();
    if (!selectedMatchForScore) return;
    const sA = Number(scoreForm.scoreA);
    const sB = Number(scoreForm.scoreB);
    let win = "Draw";
    if (sA > sB) win = selectedMatchForScore.teamA;
    if (sB > sA) win = selectedMatchForScore.teamB;

    setMatches(prev => prev.map(m => m.id === selectedMatchForScore.id ? {
      ...m,
      scoreA: sA,
      scoreB: sB,
      status: scoreForm.status,
      winner: win
    } : m));

    setSelectedMatchForScore(null);
    setActiveModal(null);
  };

  const handleAddAwardSubmit = (e) => {
    e.preventDefault();
    if (!newAward.title || !newAward.recipient) return;
    setAchievements(prev => [
      { id: Date.now(), title: newAward.title, recipient: newAward.recipient, dept: newAward.dept, awardType: newAward.awardType, sport: newAward.sport, date: newAward.date || "2026-08-10" },
      ...prev
    ]);
    setNewAward({ title: "", recipient: "", dept: "Computer Science", awardType: "Gold Medal", sport: "Football", date: "" });
    setActiveModal(null);
  };

  const handlePublishNoticeSubmit = (e) => {
    e.preventDefault();
    if (!newNotice.title.trim()) return;
    setAnnouncements(prev => [
      { id: Date.now(), title: newNotice.title, tag: newNotice.tag, date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) },
      ...prev
    ]);
    setNewNotice({ title: "", tag: "Event" });
    setActiveModal(null);
  };

  const handleAiAsk = (promptText) => {
    const textToProcess = promptText || aiPrompt;
    if (!textToProcess.trim()) return;

    const userMsg = { sender: "user", text: textToProcess };
    setAiChat(prev => [...prev, userMsg]);
    if (!promptText) setAiPrompt("");

    setTimeout(() => {
      let reply = "Here is the operational data breakdown based on your request:";
      const queryLower = textToProcess.toLowerCase();

      if (queryLower.includes("summary") || queryLower.includes("overview")) {
        reply = `📊 Operational Summary:\n• Active Tournaments: ${kpi.activeActivities}\n• Total Matches: ${kpi.totalMatches} (${kpi.liveMatches} Live right now)\n• Student Registrations: ${registrations.length} (${kpi.pendingRegs} Pending)\n• Leading Dept: Computer Science (120 Points)`;
      } else if (queryLower.includes("department") || queryLower.includes("leaderboard")) {
        reply = `🏆 Leaderboard Highlights:\n1st: Computer Science (3 Gold, 120 Pts)\n2nd: Business (2 Gold, 105 Pts)\n3rd: Mechanical (2 Gold, 95 Pts)`;
      } else if (queryLower.includes("match") || queryLower.includes("live")) {
        const liveList = matches.filter(m => m.status === "Live").map(m => `${m.sport}: ${m.teamA} (${m.scoreA}) vs ${m.teamB} (${m.scoreB})`).join("\n");
        reply = `⚡ Live Matches Status:\n${liveList || "No matches currently live."}`;
      } else {
        reply = `🤖 Activity Analysis:\nTotal verified participants: ${participants.length}. Total events organized across sports: ${events.length}. All schedules & registration flows are operating normally!`;
      }

      setAiChat(prev => [...prev, { sender: "assistant", text: reply }]);
    }, 500);
  };

  return (
    <div className={"db-root" + (dark ? " theme-dark" : " theme-light") + (sidebarOpen ? " sb-open" : " sb-closed")}>

      {/* Mobile overlay */}
      <div
        className={"sb-overlay" + (sidebarOpen ? " sb-overlay--visible" : "")}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* ───── SIDEBAR ───── */}
      <aside className="db-sidebar" aria-label="Navigation">
        <div className="db-sidebar__inner">
          <div className="sidebar-brand">
            <div className="sidebar-brand__icon">
              <Ico path="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </div>
            <div>
              <span className="sidebar-brand__name">SportsPulse</span>
              <span className="sidebar-brand__sub">Admin Control</span>
            </div>
          </div>

          <nav className="db-nav" aria-label="Staff Modules">
            <p className="nav-group-label">Staff Functions</p>
            {MODULES.map(({ id, label }) => (
              <button
                key={id}
                className={"db-nav__item" + (activeNav === id ? " db-nav__item--active" : "")}
                onClick={() => scrollTo(id)}
              >
                <span className="nav-icon">
                  {id === "overview" && <Ico lines={[["18", "20", "18", "10"], ["12", "20", "12", "4"], ["6", "20", "6", "14"]]} />}
                  {id === "activities" && <Ico d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />}
                  {id === "events" && <Ico rect={["3", "4", "18", "18", "2"]} lines={[["16", "2", "16", "6"], ["8", "2", "8", "6"], ["3", "10", "21", "10"]]} />}
                  {id === "registrations" && <Ico d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" poly="14 2 14 8 20 8" lines={[["16", "13", "8", "13"], ["16", "17", "8", "17"]]} />}
                  {id === "participants" && <Ico d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" circle={["9", "7", "4"]} d2="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />}
                  {id === "teams" && <Ico d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" circle={["9", "7", "4"]} circle2={["19", "11", "3"]} />}
                  {id === "schedules" && <Ico circle={["12", "12", "10"]} poly="12 6 12 12 16 14" />}
                  {id === "results" && <Ico poly="8 17 12 21 16 17" d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29" d2="M12 12v9" />}
                  {id === "achievements" && <Ico d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18" path="M4 22h16M12 15A6 6 0 0 0 18 9V3H6v6a6 6 0 0 0 6 6z" />}
                  {id === "announcements" && <Ico d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" d2="M13.73 21a2 2 0 0 1-3.46 0" />}
                  {id === "reports" && <Ico d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" lines={[["12", "18", "12", "12"], ["9", "15", "9", "18"], ["15", "9", "15", "18"]]} />}
                  {id === "aiAssistant" && <Ico circle={["12", "12", "9"]} d="M12 8v4M12 16h.01" />}
                </span>
                <span className="nav-label">{label}</span>
                {activeNav === id && <span className="nav-pip" />}
              </button>
            ))}
          </nav>

          <div className="sidebar-user">
            <div className="sidebar-user__avatar">A</div>
            <div>
              <span className="sidebar-user__name">{t.admin}</span>
              <span className="sidebar-user__role">{t.sportsOffice}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ───── HEADER ───── */}
      <header className="db-header">
        <div className="db-header__left">
          <button className="icon-btn" onClick={() => setSidebarOpen(p => !p)} aria-label="Toggle sidebar">
            <Ico lines={sidebarOpen
              ? [["18", "6", "6", "18"], ["6", "6", "18", "18"]]
              : [["3", "6", "21", "6"], ["3", "12", "21", "12"], ["3", "18", "21", "18"]]} />
          </button>
          <div className="db-breadcrumb">
            <span className="breadcrumb-home">Admin Dashboard</span>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-current">{MODULES.find(n => n.id === activeNav)?.label}</span>
          </div>
        </div>
        <div className="db-header__right">
          <div className="clock-chip">
            <span className="clock-icon"><Ico circle={["12", "12", "10"]} poly="12 6 12 12 16 14" /></span>
            {clock}
          </div>
          <button className="icon-btn" onClick={() => setTheme(dark ? "light" : "dark")} aria-label="Toggle theme">
            {dark
              ? <Ico circle={["12", "12", "5"]} lines={[["12", "1", "12", "3"], ["12", "21", "12", "23"], ["4.22", "4.22", "5.64", "5.64"], ["18.36", "18.36", "19.78", "19.78"], ["1", "12", "3", "12"], ["21", "12", "23", "12"], ["4.22", "19.78", "5.64", "18.36"], ["18.36", "5.64", "19.78", "4.22"]]} />
              : <Ico path="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            }
          </button>
          <button className="logout-btn" onClick={onLogout}>
            <Ico d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" poly="16 17 21 12 16 7" line={["21", "12", "9", "12"]} />
            <span>{t.logout}</span>
          </button>
        </div>
      </header>

      {/* ───── MAIN CONTENT AREA ───── */}
      <main className="db-main">

        {/* 1. DASHBOARD / OVERVIEW */}
        <section className="db-section" ref={setRef("overview")} data-section="overview">
          <div className="section-hd">
            <div>
              <h2 className="section-title">Operational Summary</h2>
              <p className="section-sub">Overview of active sports season, key indicators, and staff summary</p>
            </div>
          </div>
          <div className="kpi-grid">
            <KpiCard label={t.totalMatches} value={kpi.totalMatches} color="blue" icon={<Ico poly="8 17 12 21 16 17" d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29" d2="M12 12v9" />} />
            <KpiCard label={t.liveRightNow} value={kpi.liveMatches} color="red" icon={<Ico circle={["12", "12", "10"]} circle2={["12", "12", "3"]} />} />
            <KpiCard label="Pending Registrations" value={kpi.pendingRegs} color="amber" icon={<Ico d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" lines={[["16", "13", "8", "13"], ["16", "17", "8", "17"]]} />} />
            <KpiCard label="Active Activities" value={kpi.activeActivities} color="green" icon={<Ico d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />} />
            <KpiCard label={t.teamsRegistered} value={kpi.registeredTeams} color="violet" icon={<Ico d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" circle={["9", "7", "4"]} />} />
          </div>
        </section>

        {/* 2. ACTIVITIES */}
        <section className="db-section" ref={setRef("activities")} data-section="activities">
          <div className="section-hd">
            <div>
              <h2 className="section-title">{t.activities}</h2>
              <p className="section-sub">{t.activitiesSub}</p>
            </div>
            <button className="primary-action-btn" onClick={() => setActiveModal("activity")}>
              + {t.createActivity}
            </button>
          </div>
          <div className="cards-grid">
            {activities.map(act => (
              <div key={act.id} className="module-card">
                <div className="module-card__header">
                  <span className="sport-tag">{act.sport}</span>
                  <StatusBadge status={act.status} />
                </div>
                <h3 className="module-card__title">{act.title}</h3>
                <p className="module-card__meta">🏢 {act.dept} • 🗓️ {act.startDate} to {act.endDate}</p>
                <div className="module-card__footer">
                  <span>🏆 {act.eventsCount} Events Included</span>
                  <button className="text-btn" onClick={() => scrollTo("events")}>Manage Events ›</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3. EVENTS */}
        <section className="db-section" ref={setRef("events")} data-section="events">
          <div className="section-hd">
            <div>
              <h2 className="section-title">{t.events}</h2>
              <p className="section-sub">{t.eventsSub}</p>
            </div>
            <button className="primary-action-btn" onClick={() => setActiveModal("event")}>
              + {t.addEvent}
            </button>
          </div>
          <div className="table-wrap">
            <table className="lb-table">
              <thead>
                <tr>
                  <th>Event Title</th>
                  <th>Sport</th>
                  <th>Date</th>
                  <th>Venue</th>
                  <th>Capacity</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {events.map(ev => (
                  <tr key={ev.id}>
                    <td><strong>{ev.title}</strong></td>
                    <td>{ev.sport}</td>
                    <td>{ev.date}</td>
                    <td>{ev.venue}</td>
                    <td>{ev.registered} / {ev.maxParticipants} Registered</td>
                    <td><StatusBadge status={ev.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 4. REGISTRATIONS */}
        <section className="db-section" ref={setRef("registrations")} data-section="registrations">
          <div className="section-hd">
            <div>
              <h2 className="section-title">{t.registrations}</h2>
              <p className="section-sub">{t.registrationsSub}</p>
            </div>
            <div className="filter-bar">
              <div className="select-wrap">
                <select className="filter-select" value={regStatusFilter} onChange={e => setRegStatusFilter(e.target.value)}>
                  <option value="All">All Applications</option>
                  <option value="Pending">Pending Approval</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>
          </div>
          <div className="table-wrap">
            <table className="lb-table">
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Student Name</th>
                  <th>Department</th>
                  <th>Sport / Event</th>
                  <th>Applied Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRegistrations.map(reg => (
                  <tr key={reg.id}>
                    <td><code>{reg.rollNo}</code></td>
                    <td><strong>{reg.studentName}</strong></td>
                    <td>{reg.dept}</td>
                    <td>{reg.sport} — <small>{reg.event}</small></td>
                    <td>{reg.date}</td>
                    <td><StatusBadge status={reg.status} /></td>
                    <td>
                      {reg.status === "Pending" ? (
                        <div className="action-btn-group">
                          <button className="approve-btn" onClick={() => handleApproveRegistration(reg)}>✓ Approve</button>
                          <button className="reject-btn" onClick={() => handleRejectRegistration(reg.id)}>✕ Reject</button>
                        </div>
                      ) : <span className="text-muted">Completed</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 5. PARTICIPANTS */}
        <section className="db-section" ref={setRef("participants")} data-section="participants">
          <div className="section-hd">
            <div>
              <h2 className="section-title">{t.participants}</h2>
              <p className="section-sub">{t.participantsSub}</p>
            </div>
          </div>
          <div className="table-wrap">
            <table className="lb-table">
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Athlete Name</th>
                  <th>Department</th>
                  <th>Sport</th>
                  <th>Assigned Team</th>
                  <th>Verification</th>
                </tr>
              </thead>
              <tbody>
                {participants.map(p => (
                  <tr key={p.id}>
                    <td><code>{p.rollNo}</code></td>
                    <td><strong>{p.name}</strong></td>
                    <td>{p.dept}</td>
                    <td>{p.sport}</td>
                    <td>{p.team}</td>
                    <td><span className="badge badge--completed">✓ {p.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 6. TEAMS */}
        <section className="db-section" ref={setRef("teams")} data-section="teams">
          <div className="section-hd">
            <div>
              <h2 className="section-title">{t.teams}</h2>
              <p className="section-sub">{t.teamsSub}</p>
            </div>
            <button className="primary-action-btn" onClick={() => setActiveModal("team")}>
              + {t.createTeam}
            </button>
          </div>
          <div className="cards-grid">
            {teams.map(tm => (
              <div key={tm.id} className="module-card">
                <div className="module-card__header">
                  <span className="sport-tag">{tm.sport}</span>
                  <span className="dept-tag">{tm.dept}</span>
                </div>
                <h3 className="module-card__title">{tm.name}</h3>
                <p className="module-card__meta">👑 Captain: {tm.captain}</p>
                <div className="module-card__footer">
                  <span>👥 {tm.members} Members Squad</span>
                  <span className="rank-txt">Dept Rank #{tm.rank}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 7. SCHEDULES & FIXTURES */}
        <section className="db-section" ref={setRef("schedules")} data-section="schedules">
          <div className="section-hd">
            <div>
              <h2 className="section-title">{t.schedules}</h2>
              <p className="section-sub">{t.schedulesSub}</p>
            </div>
            <button className="primary-action-btn" onClick={() => setActiveModal("fixture")}>
              + {t.addFixture}
            </button>
          </div>

          <div className="filter-bar mb-4">
            <div className="select-wrap">
              <select className="filter-select" value={matchSportFilter} onChange={e => setMatchSportFilter(e.target.value)}>
                <option value="All">{t.allSports}</option>
                {INITIAL_SPORTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="select-wrap">
              <select className="filter-select" value={matchStatusFilter} onChange={e => setMatchStatusFilter(e.target.value)}>
                <option value="All">{t.allStatus}</option>
                <option value="Live">{t.live}</option>
                <option value="Scheduled">{t.scheduled}</option>
                <option value="Completed">{t.completed}</option>
              </select>
            </div>
          </div>

          <div className="matches-grid">
            {filteredMatches.map(m => (
              <div key={m.id} className={"match-card match-card--" + m.status.toLowerCase()}>
                <div className="match-card__top">
                  <span className="match-sport-tag">{m.sport}</span>
                  <StatusBadge status={m.status} />
                </div>
                <div className="match-teams">
                  <div className="team">
                    <div className="team-avatar">{m.teamA.charAt(0)}</div>
                    <span className="team-name">{m.teamA}</span>
                  </div>
                  <div className="match-score-block">
                    {m.status !== "Scheduled" && m.scoreA !== null ? (
                      <><span className="score">{m.scoreA}</span>
                        <span className="score-sep">—</span>
                        <span className="score">{m.scoreB ?? "?"}</span></>
                    ) : <span className="vs-text">VS</span>}
                  </div>
                  <div className="team team--right">
                    <span className="team-name">{m.teamB}</span>
                    <div className="team-avatar">{m.teamB.charAt(0)}</div>
                  </div>
                </div>
                <div className="match-card__footer">
                  <span className="match-meta">📍 {m.venue}</span>
                  <span className="match-meta">🗓️ {m.date} · {m.time}</span>
                </div>
                {m.winner && (
                  <div className="match-winner">
                    🏆 {m.winner === "Draw" ? "Match Drawn" : m.winner + " Won"}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 8. RESULTS */}
        <section className="db-section" ref={setRef("results")} data-section="results">
          <div className="section-hd">
            <div>
              <h2 className="section-title">{t.results}</h2>
              <p className="section-sub">{t.resultsSub}</p>
            </div>
          </div>
          <div className="table-wrap">
            <table className="lb-table">
              <thead>
                <tr>
                  <th>Sport</th>
                  <th>Teams</th>
                  <th>Scorecard</th>
                  <th>Status</th>
                  <th>Winner / Result</th>
                  <th>Scorekeeper Action</th>
                </tr>
              </thead>
              <tbody>
                {matches.map(m => (
                  <tr key={m.id}>
                    <td><strong>{m.sport}</strong></td>
                    <td>{m.teamA} vs {m.teamB}</td>
                    <td>{m.scoreA !== null ? `${m.scoreA} - ${m.scoreB}` : "Not Played"}</td>
                    <td><StatusBadge status={m.status} /></td>
                    <td><strong>{m.winner || "—"}</strong></td>
                    <td>
                      <button className="table-action-btn" onClick={() => {
                        setSelectedMatchForScore(m);
                        setScoreForm({ scoreA: m.scoreA ?? 0, scoreB: m.scoreB ?? 0, status: "Completed" });
                        setActiveModal("score");
                      }}>
                        📝 {m.status === "Completed" ? "Edit Score" : "Record Score"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 9. ACHIEVEMENTS */}
        <section className="db-section" ref={setRef("achievements")} data-section="achievements">
          <div className="section-hd">
            <div>
              <h2 className="section-title">{t.achievements}</h2>
              <p className="section-sub">{t.achievementsSub}</p>
            </div>
            <button className="primary-action-btn" onClick={() => setActiveModal("award")}>
              + {t.addAward}
            </button>
          </div>
          <div className="cards-grid">
            {achievements.map(ach => (
              <div key={ach.id} className="module-card award-card">
                <div className="award-icon">🏅</div>
                <div className="award-content">
                  <span className="award-badge">{ach.awardType}</span>
                  <h4 className="award-title">{ach.title}</h4>
                  <p className="award-recipient">Awarded to: <strong>{ach.recipient}</strong> ({ach.dept})</p>
                  <small className="award-date">Date: {ach.date} • {ach.sport}</small>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* LEADERBOARD & ANALYTICS SECTION */}
        <section className="db-section">
          <div className="section-hd">
            <div>
              <h2 className="section-title">{t.leaderboardTitle}</h2>
              <p className="section-sub">{t.leaderboardSub}</p>
            </div>
          </div>
          <div className="table-wrap">
            <table className="lb-table">
              <thead>
                <tr>
                  <th>{t.rank}</th><th>{t.department}</th>
                  <th className="medal-col">{t.gold}</th>
                  <th className="medal-col">{t.silver}</th>
                  <th className="medal-col">{t.bronze}</th>
                  <th>{t.points}</th><th>{t.progress}</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map(row => {
                  const pct = Math.round((row.points / leaderboard[0].points) * 100);
                  return (
                    <tr key={row.dept} className="lb-row">
                      <td className="rank-cell">
                        {row.rank <= 3
                          ? <span className={"rank-badge rank-badge--" + row.rank}>{["1st", "2nd", "3rd"][row.rank - 1]}</span>
                          : <span className="rank-num">#{row.rank}</span>}
                      </td>
                      <td className="dept-cell">{row.dept}</td>
                      <td className="medal-cell"><span className="gold-txt">{row.gold}</span></td>
                      <td className="medal-cell"><span className="silver-txt">{row.silver}</span></td>
                      <td className="medal-cell"><span className="bronze-txt">{row.bronze}</span></td>
                      <td className="points-cell"><strong>{row.points}</strong></td>
                      <td className="progress-cell">
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: pct + "%" }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="section-hd mt-6">
            <div>
              <h2 className="section-title">{t.analyticsTitle}</h2>
              <p className="section-sub">{t.analyticsSub}</p>
            </div>
          </div>
          <div className="chart-area">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 8 }}>
                <defs>
                  {chartData.map((_, i) => (
                    <linearGradient key={i} id={"bg" + i} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.9} />
                      <stop offset="100%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.5} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="sport" tick={{ fill: "var(--muted)", fontSize: 11, fontFamily: "inherit" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--muted)", fontSize: 11, fontFamily: "inherit" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTip />} cursor={{ fill: "var(--accent-light)", rx: 4 }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={52}>
                  {chartData.map((_, i) => <Cell key={i} fill={"url(#bg" + i + ")"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* 10. ANNOUNCEMENTS */}
        <section className="db-section" ref={setRef("announcements")} data-section="announcements">
          <div className="section-hd">
            <div>
              <h2 className="section-title">{t.announcementsTitle}</h2>
              <p className="section-sub">{t.announcementsSub}</p>
            </div>
            <button className="primary-action-btn" onClick={() => setActiveModal("notice")}>
              + {t.publishNotice}
            </button>
          </div>
          <div className="announce-list">
            {announcements.map((a, i) => (
              <div key={a.id} className="announce-item" style={{ animationDelay: i * 0.05 + "s" }}>
                <div className={"announce-tag announce-tag--" + a.tag.toLowerCase()}>{a.tag}</div>
                <div className="announce-body">
                  <p className="announce-title">{a.title}</p>
                  <span className="announce-date">📅 {a.date}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 11. REPORTS */}
        <section className="db-section" ref={setRef("reports")} data-section="reports">
          <div className="section-hd">
            <div>
              <h2 className="section-title">{t.reports}</h2>
              <p className="section-sub">{t.reportsSub}</p>
            </div>
            <button className="primary-action-btn" onClick={() => alert("Operational sports summary report generated and downloaded!")}>
              📥 {t.generateReport}
            </button>
          </div>
          <div className="reports-grid">
            <div className="report-card">
              <h3>📊 Participation Overview Report</h3>
              <p>Total Registered Athletes: <strong>{participants.length}</strong></p>
              <p>Applications Processed: <strong>{registrations.length}</strong></p>
              <p>Department Leader: <strong>Computer Science</strong></p>
            </div>
            <div className="report-card">
              <h3>⚽ Fixtures & Results Summary</h3>
              <p>Total Fixtures Created: <strong>{matches.length}</strong></p>
              <p>Matches Completed: <strong>{matches.filter(m => m.status === "Completed").length}</strong></p>
              <p>Completion Rate: <strong>{Math.round((matches.filter(m => m.status === "Completed").length / matches.length) * 100)}%</strong></p>
            </div>
          </div>
        </section>

        {/* 12. AI ASSISTANT */}
        <section className="db-section" ref={setRef("aiAssistant")} data-section="aiAssistant">
          <div className="section-hd">
            <div>
              <h2 className="section-title">🤖 AI Assistant</h2>
              <p className="section-sub">{t.aiAssistantSub}</p>
            </div>
          </div>
          <div className="ai-chat-box">
            <div className="ai-prompts-row">
              <button className="prompt-chip" onClick={() => handleAiAsk("Give me an operational summary of all sports activities")}>
                💡 Summarize Activities
              </button>
              <button className="prompt-chip" onClick={() => handleAiAsk("Which department is leading the leaderboard?")}>
                🏆 Leaderboard Stats
              </button>
              <button className="prompt-chip" onClick={() => handleAiAsk("Show live match status")}>
                ⚡ Live Matches
              </button>
            </div>
            <div className="ai-messages">
              {aiChat.map((msg, idx) => (
                <div key={idx} className={`ai-msg ai-msg--${msg.sender}`}>
                  <div className="ai-msg__bubble">
                    <pre style={{ fontFamily: "inherit", whiteSpace: "pre-wrap", margin: 0 }}>{msg.text}</pre>
                  </div>
                </div>
              ))}
            </div>
            <div className="ai-input-row">
              <input
                type="text"
                className="ai-input"
                placeholder="Ask AI Assistant about sports data, schedules, or department performance..."
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAiAsk()}
              />
              <button className="primary-action-btn" onClick={() => handleAiAsk()}>
                {t.askAi}
              </button>
            </div>
          </div>
        </section>

      </main>

      {/* ───── MODALS FOR STAFF ACTIONS ───── */}
      {activeModal && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setActiveModal(null)}>✕</button>

            {/* Create Activity Modal */}
            {activeModal === "activity" && (
              <form onSubmit={handleCreateActivitySubmit}>
                <h3>Create New Sports Activity</h3>
                <div className="form-group">
                  <label>Activity Title</label>
                  <input type="text" required placeholder="e.g. Inter-Department Football Cup" value={newActivity.title} onChange={e => setNewActivity({ ...newActivity, title: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Sport</label>
                  <select value={newActivity.sport} onChange={e => setNewActivity({ ...newActivity, sport: e.target.value })}>
                    {INITIAL_SPORTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Department Target</label>
                  <select value={newActivity.dept} onChange={e => setNewActivity({ ...newActivity, dept: e.target.value })}>
                    <option value="All Departments">All Departments</option>
                    {INITIAL_DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="modal-actions">
                  <button type="submit" className="primary-action-btn">Create Activity</button>
                </div>
              </form>
            )}

            {/* Add Event Modal */}
            {activeModal === "event" && (
              <form onSubmit={handleCreateEventSubmit}>
                <h3>Add Event to Activity</h3>
                <div className="form-group">
                  <label>Event Name</label>
                  <input type="text" required placeholder="e.g. 200m Women Sprint" value={newEvent.title} onChange={e => setNewEvent({ ...newEvent, title: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Sport</label>
                  <select value={newEvent.sport} onChange={e => setNewEvent({ ...newEvent, sport: e.target.value })}>
                    {INITIAL_SPORTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Venue</label>
                  <input type="text" placeholder="e.g. Indoor Court B" value={newEvent.venue} onChange={e => setNewEvent({ ...newEvent, venue: e.target.value })} />
                </div>
                <div className="modal-actions">
                  <button type="submit" className="primary-action-btn">Add Event</button>
                </div>
              </form>
            )}

            {/* Create Team Modal */}
            {activeModal === "team" && (
              <form onSubmit={handleCreateTeamSubmit}>
                <h3>Create Department Team</h3>
                <div className="form-group">
                  <label>Team Name</label>
                  <input type="text" required placeholder="e.g. CS Strikers" value={newTeam.name} onChange={e => setNewTeam({ ...newTeam, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Department</label>
                  <select value={newTeam.dept} onChange={e => setNewTeam({ ...newTeam, dept: e.target.value })}>
                    {INITIAL_DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Captain Name</label>
                  <input type="text" placeholder="e.g. Rahul Sharma" value={newTeam.captain} onChange={e => setNewTeam({ ...newTeam, captain: e.target.value })} />
                </div>
                <div className="modal-actions">
                  <button type="submit" className="primary-action-btn">Create Team</button>
                </div>
              </form>
            )}

            {/* Add Fixture Modal */}
            {activeModal === "fixture" && (
              <form onSubmit={handleCreateFixtureSubmit}>
                <h3>Create Fixture Schedule</h3>
                <div className="form-group">
                  <label>Sport</label>
                  <select value={newFixture.sport} onChange={e => setNewFixture({ ...newFixture, sport: e.target.value })}>
                    {INITIAL_SPORTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Team A</label>
                  <input type="text" required placeholder="Team A Name" value={newFixture.teamA} onChange={e => setNewFixture({ ...newFixture, teamA: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Team B</label>
                  <input type="text" required placeholder="Team B Name" value={newFixture.teamB} onChange={e => setNewFixture({ ...newFixture, teamB: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Venue</label>
                  <input type="text" value={newFixture.venue} onChange={e => setNewFixture({ ...newFixture, venue: e.target.value })} />
                </div>
                <div className="modal-actions">
                  <button type="submit" className="primary-action-btn">Schedule Fixture</button>
                </div>
              </form>
            )}

            {/* Record Score Modal */}
            {activeModal === "score" && selectedMatchForScore && (
              <form onSubmit={handleRecordScoreSubmit}>
                <h3>Record Score for {selectedMatchForScore.sport}</h3>
                <p className="text-muted">{selectedMatchForScore.teamA} vs {selectedMatchForScore.teamB}</p>
                <div className="form-group-row">
                  <div className="form-group">
                    <label>{selectedMatchForScore.teamA} Score</label>
                    <input type="number" value={scoreForm.scoreA} onChange={e => setScoreForm({ ...scoreForm, scoreA: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>{selectedMatchForScore.teamB} Score</label>
                    <input type="number" value={scoreForm.scoreB} onChange={e => setScoreForm({ ...scoreForm, scoreB: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Match Status</label>
                  <select value={scoreForm.status} onChange={e => setScoreForm({ ...scoreForm, status: e.target.value })}>
                    <option value="Completed">Completed</option>
                    <option value="Live">Live</option>
                    <option value="Scheduled">Scheduled</option>
                  </select>
                </div>
                <div className="modal-actions">
                  <button type="submit" className="primary-action-btn">Save Scorecard</button>
                </div>
              </form>
            )}

            {/* Add Award Modal */}
            {activeModal === "award" && (
              <form onSubmit={handleAddAwardSubmit}>
                <h3>Add Award / Achievement</h3>
                <div className="form-group">
                  <label>Award Title</label>
                  <input type="text" required placeholder="e.g. Man of the Match" value={newAward.title} onChange={e => setNewAward({ ...newAward, title: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Recipient Student / Team</label>
                  <input type="text" required placeholder="Recipient name" value={newAward.recipient} onChange={e => setNewAward({ ...newAward, recipient: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Award Category</label>
                  <select value={newAward.awardType} onChange={e => setNewAward({ ...newAward, awardType: e.target.value })}>
                    <option value="Gold Medal">Gold Medal</option>
                    <option value="Silver Medal">Silver Medal</option>
                    <option value="Bronze Medal">Bronze Medal</option>
                    <option value="Gold Trophy">Gold Trophy</option>
                    <option value="Individual Award">Individual Award</option>
                  </select>
                </div>
                <div className="modal-actions">
                  <button type="submit" className="primary-action-btn">Save Award</button>
                </div>
              </form>
            )}

            {/* Publish Notice Modal */}
            {activeModal === "notice" && (
              <form onSubmit={handlePublishNoticeSubmit}>
                <h3>Publish Official Notice</h3>
                <div className="form-group">
                  <label>Notice Content</label>
                  <input type="text" required placeholder="Enter announcement title or message" value={newNotice.title} onChange={e => setNewNotice({ ...newNotice, title: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Category Tag</label>
                  <select value={newNotice.tag} onChange={e => setNewNotice({ ...newNotice, tag: e.target.value })}>
                    <option value="Event">Event</option>
                    <option value="Facility">Facility</option>
                    <option value="Update">Update</option>
                    <option value="Result">Result</option>
                  </select>
                </div>
                <div className="modal-actions">
                  <button type="submit" className="primary-action-btn">Publish Notice</button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}

export default Dashboard;
