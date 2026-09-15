import React, { useState, useEffect } from "react";
import {
  Shield,
  Users,
  Calendar,
  CheckCircle2,
  Plus,
  AlertCircle,
  Search,
  Clock,
  MapPin,
  UserPlus,
  Trophy,
  Layers,
  ArrowRight
} from "lucide-react";
import {
  teamsApi,
  tournamentsApi,
  sportsApi,
  playersApi,
  attendanceApi,
  matchesApi
} from "../../services/api/apiServices";
import { useAuth } from "../../context/AuthContext";
import { Card, StatCard } from "../../components/common/Card";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import { Modal } from "../../components/common/Modal";
import "./CaptainPortal.css";

export default function CaptainDashboard({ onNavigate }) {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("teams"); // 'teams' | 'register' | 'attendance' | 'fixtures'
  const [myTeams, setMyTeams] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [sports, setSports] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Add player modal state
  const [selectedTeamForPlayer, setSelectedTeamForPlayer] = useState(null);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchingStudents, setIsSearchingStudents] = useState(false);
  const [playerForm, setPlayerForm] = useState({ studentId: "", role: "Player", jerseyNo: "" });

  // Team registration state
  const [newTeam, setNewTeam] = useState({
    name: "",
    sportId: "",
    tournamentId: "",
    coachName: "",
    jerseyColor: ""
  });
  const [isSubmittingTeam, setIsSubmittingTeam] = useState(false);

  // Attendance state
  const [selectedTeamForAttendance, setSelectedTeamForAttendance] = useState(null);
  const [attendanceRoster, setAttendanceRoster] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);

  useEffect(() => {
    loadCaptainData();
  }, [currentUser]);

  const loadCaptainData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [teamsData, toursData, sportsData, matchesData] = await Promise.all([
        teamsApi.getCaptainTeams().catch(() => []),
        tournamentsApi.getTournaments().catch(() => []),
        sportsApi.getSports().catch(() => []),
        matchesApi.getMatches().catch(() => [])
      ]);

      const teams = teamsData || [];
      setMyTeams(teams);
      setTournaments(toursData || []);
      setSports(sportsData || []);

      if (sportsData && sportsData.length > 0) {
        setNewTeam((prev) => ({
          ...prev,
          sportId: prev.sportId || sportsData[0].sport_id || sportsData[0].id
        }));
      }
      if (toursData && toursData.length > 0) {
        setNewTeam((prev) => ({
          ...prev,
          tournamentId: prev.tournamentId || toursData[0].tournament_id || toursData[0].id
        }));
      }

      // Filter matches for captain's teams
      const captainTeamIds = new Set(teams.map((t) => t.id || t.team_id));
      const filteredMatches = (matchesData || []).filter(
        (m) =>
          captainTeamIds.has(m.team_a_id) ||
          captainTeamIds.has(m.team_b_id) ||
          captainTeamIds.has(m.teamAId) ||
          captainTeamIds.has(m.teamBId)
      );
      setMatches(filteredMatches.length > 0 ? filteredMatches : matchesData || []);

      if (teams.length > 0) {
        loadTeamRosterForAttendance(teams[0].id || teams[0].team_id);
      }
    } catch (err) {
      console.error("Failed to load captain workspace:", err);
      setError(err.message || "Could not load captain dashboard");
    } finally {
      setLoading(false);
    }
  };

  const loadTeamRosterForAttendance = async (teamId) => {
    try {
      setSelectedTeamForAttendance(teamId);
      const players = await playersApi.getPlayersByTeam(teamId);
      setAttendanceRoster(players || []);
      const initMap = {};
      (players || []).forEach((p) => {
        initMap[p.student_id || p.id] = true;
      });
      setAttendanceMap(initMap);
    } catch (err) {
      console.error("Failed to load squad for attendance:", err);
    }
  };

  const handleSearchStudents = async (query) => {
    setStudentSearchQuery(query);
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      setIsSearchingStudents(true);
      const res = await playersApi.getAllPlayers(query);
      setSearchResults(res.data || res || []);
    } catch (err) {
      console.error("Student search failed:", err);
    } finally {
      setIsSearchingStudents(false);
    }
  };

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    if (!selectedTeamForPlayer || !playerForm.studentId) return;

    try {
      await playersApi.addPlayerToTeam(selectedTeamForPlayer, {
        studentId: playerForm.studentId,
        position: playerForm.role,
        jerseyNo: playerForm.jerseyNo ? Number(playerForm.jerseyNo) : null
      });

      setSuccessMsg("Athlete added successfully to squad roster!");
      setTimeout(() => setSuccessMsg(null), 4000);
      setSelectedTeamForPlayer(null);
      setPlayerForm({ studentId: "", role: "Player", jerseyNo: "" });
      setStudentSearchQuery("");
      setSearchResults([]);
      loadCaptainData();
    } catch (err) {
      setError(err.message || "Failed to add athlete to team");
      setTimeout(() => setError(null), 4000);
    }
  };

  const handleRegisterTeam = async (e) => {
    e.preventDefault();
    if (!newTeam.name) {
      setError("Please enter a team name");
      return;
    }

    try {
      setIsSubmittingTeam(true);
      await teamsApi.registerTeam({
        name: newTeam.name,
        sport_id: Number(newTeam.sportId),
        tournament_id: Number(newTeam.tournamentId),
        coach_name: newTeam.coachName,
        jersey_color: newTeam.jerseyColor,
        status: "Pending"
      });

      setSuccessMsg("Team registered successfully! Forwarded to Director of Physical Education for clearance.");
      setTimeout(() => setSuccessMsg(null), 5000);
      setNewTeam({
        name: "",
        sportId: sports[0]?.sport_id || "",
        tournamentId: tournaments[0]?.tournament_id || "",
        coachName: "",
        jerseyColor: ""
      });
      setActiveTab("teams");
      loadCaptainData();
    } catch (err) {
      setError(err.message || "Failed to register team");
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsSubmittingTeam(false);
    }
  };

  const handleSaveAttendance = async () => {
    if (!selectedTeamForAttendance) return;
    try {
      setIsSavingAttendance(true);
      await attendanceApi.saveSquadAttendance(selectedTeamForAttendance, attendanceMap);
      setSuccessMsg("Matchday squad attendance recorded and synced across academic departments!");
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      setError(err.message || "Failed to save attendance");
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsSavingAttendance(false);
    }
  };

  const captainName = currentUser?.name || currentUser?.username || "Captain";

  return (
    <div className="nec-captain-portal">
      {/* Captain Welcome Hero */}
      <div className="nec-captain-hero">
        <div className="nec-captain-hero-badge">
          <Trophy size={14} />
          <span>Sports Captain Workspace</span>
        </div>
        <h1 className="nec-captain-hero-title">
          Welcome, {captainName}
        </h1>
        <p className="nec-captain-hero-sub">
          Lead your sports squads, coordinate multi-department athlete rosters, submit event entries for clearance, and record verified matchday attendance.
        </p>
      </div>

      {/* KPI Stats Grid */}
      <div className="nec-stats-grid">
        <StatCard
          title="My Squads"
          value={myTeams.length}
          subtext="Active Managed Teams"
          icon={Shield}
          color="navy"
          onClick={() => setActiveTab("teams")}
        />
        <StatCard
          title="Assigned Fixtures"
          value={matches.length}
          subtext="Scheduled Matches"
          icon={Calendar}
          color="gold"
          onClick={() => setActiveTab("fixtures")}
        />
        <StatCard
          title="Tournaments"
          value={tournaments.length}
          subtext="Eligible Competitions"
          icon={Trophy}
          onClick={() => setActiveTab("register")}
        />
      </div>

      {/* Status Banners */}
      {successMsg && (
        <div className="nec-alert-box success">
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}
      {error && (
        <div className="nec-alert-box error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="nec-tab-nav">
        <button
          type="button"
          onClick={() => setActiveTab("teams")}
          className={`nec-tab-btn ${activeTab === "teams" ? "active" : ""}`}
        >
          <Shield size={16} />
          <span>My Teams & Squad Roster</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("register")}
          className={`nec-tab-btn ${activeTab === "register" ? "active" : ""}`}
        >
          <Plus size={16} />
          <span>Register Team for Event</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("attendance")}
          className={`nec-tab-btn ${activeTab === "attendance" ? "active" : ""}`}
        >
          <CheckCircle2 size={16} />
          <span>Squad Attendance Marker</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("fixtures")}
          className={`nec-tab-btn ${activeTab === "fixtures" ? "active" : ""}`}
        >
          <Calendar size={16} />
          <span>Match Schedule</span>
        </button>
      </div>

      {/* Tab 1: Teams & Roster Management */}
      {activeTab === "teams" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.25rem", fontFamily: "var(--nec-font-display)", fontWeight: 700 }}>
                My Managed Teams
              </h2>
              <p style={{ margin: "2px 0 0 0", fontSize: "0.825rem", color: "var(--nec-text-muted)" }}>
                Inspect team profile, review cross-department athlete breakdown, or add players.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => setActiveTab("register")}
            >
              Create New Squad
            </Button>
          </div>

          <div className="nec-captain-teams-grid">
            {myTeams.map((team) => (
              <div key={team.id || team.team_id} className="nec-team-card">
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div className="nec-team-card-header">
                    <span className="nec-team-sport-pill">
                      {team.sportName || "Sports Squad"}
                    </span>
                    <Badge status={team.status === "Approved" ? "success" : "warning"}>
                      {team.status || "Pending"}
                    </Badge>
                  </div>

                  <h3 className="nec-team-card-title">{team.name}</h3>

                  <p className="nec-team-card-tournament">
                    Tournament: <strong>{team.tournamentName || "Inter-Collegiate Tournament"}</strong>
                  </p>

                  <div className="nec-team-card-meta">
                    <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Users size={14} />
                      <span>{team.memberCount || 0} Athletes</span>
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Layers size={14} />
                      <span>{team.deptCode || "Multi-Dept"}</span>
                    </span>
                  </div>
                </div>

                <div className="nec-team-card-actions">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigate && onNavigate(`team_profile_${team.id || team.team_id}`)}
                  >
                    View Roster
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={UserPlus}
                    onClick={() => setSelectedTeamForPlayer(team.id || team.team_id)}
                  >
                    Add Player
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {myTeams.length === 0 && !loading && (
            <Card style={{ textAlign: "center", padding: "48px 24px" }}>
              <Shield size={48} style={{ opacity: 0.3, margin: "0 auto 12px auto", color: "var(--nec-navy)" }} />
              <h3 style={{ margin: "0 0 6px 0", fontSize: "1.1rem" }}>No Registered Teams Found</h3>
              <p style={{ margin: "0 0 16px 0", color: "var(--nec-text-muted)", fontSize: "0.85rem" }}>
                You have not registered any sports squads yet. Submit a team registration for open tournaments to get started.
              </p>
              <Button variant="primary" icon={Plus} onClick={() => setActiveTab("register")}>
                Register Team Now
              </Button>
            </Card>
          )}
        </div>
      )}

      {/* Tab 2: Team Registration Form */}
      {activeTab === "register" && (
        <div className="nec-form-card">
          <div className="nec-form-header">
            <h2 className="nec-form-title">Register Squad for Tournament</h2>
            <p className="nec-form-sub">
              Submit team information. The registration will be marked as <strong>Pending</strong> and routed to the Physical Education Director for official approval.
            </p>
          </div>

          <form onSubmit={handleRegisterTeam} className="nec-form-body">
            <div className="nec-form-group">
              <label className="nec-form-label">Team Name *</label>
              <input
                type="text"
                required
                placeholder="e.g., NEC Volleyball Warriors"
                value={newTeam.name}
                onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                className="nec-form-input"
              />
            </div>

            <div className="nec-form-row">
              <div className="nec-form-group">
                <label className="nec-form-label">Sport Discipline *</label>
                <select
                  value={newTeam.sportId}
                  onChange={(e) => setNewTeam({ ...newTeam, sportId: e.target.value })}
                  className="nec-form-select"
                >
                  {sports.map((s) => (
                    <option key={s.sport_id || s.id} value={s.sport_id || s.id}>
                      {s.name} ({s.category || "Outdoor"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="nec-form-group">
                <label className="nec-form-label">Tournament Event *</label>
                <select
                  value={newTeam.tournamentId}
                  onChange={(e) => setNewTeam({ ...newTeam, tournamentId: e.target.value })}
                  className="nec-form-select"
                >
                  {tournaments.map((t) => (
                    <option key={t.tournament_id || t.id} value={t.tournament_id || t.id}>
                      {t.name || t.title} ({t.academic_year || t.academicYear || "2025-2026"})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="nec-form-row">
              <div className="nec-form-group">
                <label className="nec-form-label">Head Coach / Staff Advisor</label>
                <input
                  type="text"
                  placeholder="e.g., Coach Ramesh"
                  value={newTeam.coachName}
                  onChange={(e) => setNewTeam({ ...newTeam, coachName: e.target.value })}
                  className="nec-form-input"
                />
              </div>

              <div className="nec-form-group">
                <label className="nec-form-label">Jersey Color Theme</label>
                <input
                  type="text"
                  placeholder="e.g., Navy Blue / Gold"
                  value={newTeam.jerseyColor}
                  onChange={(e) => setNewTeam({ ...newTeam, jerseyColor: e.target.value })}
                  className="nec-form-input"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isSubmittingTeam}
              style={{ marginTop: "12px", width: "100%" }}
            >
              Submit Team Registration
            </Button>
          </form>
        </div>
      )}

      {/* Tab 3: Squad Attendance Marker */}
      {activeTab === "attendance" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="nec-attendance-toolbar">
            <div>
              <h2 style={{ margin: 0, fontSize: "1.25rem", fontFamily: "var(--nec-font-display)", fontWeight: 700 }}>
                Matchday Squad Attendance
              </h2>
              <p style={{ margin: "2px 0 0 0", fontSize: "0.825rem", color: "var(--nec-text-muted)" }}>
                Verified attendance entries route instantly to each player's respective academic department.
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <select
                value={selectedTeamForAttendance || ""}
                onChange={(e) => loadTeamRosterForAttendance(Number(e.target.value))}
                className="nec-attendance-team-select"
              >
                {myTeams.map((t) => (
                  <option key={t.id || t.team_id} value={t.id || t.team_id}>
                    {t.name} ({t.sportName})
                  </option>
                ))}
              </select>

              <Button
                variant="primary"
                size="sm"
                icon={CheckCircle2}
                loading={isSavingAttendance}
                disabled={isSavingAttendance || attendanceRoster.length === 0}
                onClick={handleSaveAttendance}
              >
                Save Attendance
              </Button>
            </div>
          </div>

          <div className="nec-attendance-table-wrap">
            <table className="nec-attendance-table">
              <thead>
                <tr>
                  <th style={{ width: "50px", textAlign: "center" }}>Present</th>
                  <th style={{ width: "80px" }}>Jersey</th>
                  <th>Athlete Name</th>
                  <th>Register Number</th>
                  <th>Department</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRoster.length > 0 ? (
                  attendanceRoster.map((p) => {
                    const isChecked = attendanceMap[p.student_id || p.id] ?? true;
                    return (
                      <tr key={p.student_id || p.id}>
                        <td style={{ textAlign: "center" }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) =>
                              setAttendanceMap({
                                ...attendanceMap,
                                [p.student_id || p.id]: e.target.checked
                              })
                            }
                            style={{ cursor: "pointer", width: "16px", height: "16px", accentColor: "var(--nec-blue)" }}
                          />
                        </td>
                        <td>
                          <span className="nec-jersey-badge">
                            {p.jerseyNo ? `#${p.jerseyNo}` : "-"}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{p.name}</td>
                        <td style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "var(--nec-text-muted)" }}>
                          {p.rollNo || p.studentId}
                        </td>
                        <td>
                          <Badge status="neutral">{p.dept_code || p.dept}</Badge>
                        </td>
                        <td style={{ color: "var(--nec-text-muted)" }}>
                          {p.role || p.position || "Player"}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" style={{ padding: "36px", textAlign: "center", color: "var(--nec-text-muted)" }}>
                      No athletes found in this squad roster. Select a squad with registered athletes.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Match Fixtures */}
      {activeTab === "fixtures" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.25rem", fontFamily: "var(--nec-font-display)", fontWeight: 700 }}>
              Upcoming & Completed Fixtures
            </h2>
            <p style={{ margin: "2px 0 0 0", fontSize: "0.825rem", color: "var(--nec-text-muted)" }}>
              Matches scheduled for your sports squad across collegiate grounds.
            </p>
          </div>

          <div className="nec-fixtures-grid">
            {matches.map((m) => (
              <div key={m.id || m.match_id} className="nec-fixture-card">
                <div className="nec-fixture-header">
                  <span className="nec-fixture-pool-tag">
                    {m.pool || "Pool A"} • {m.round}
                  </span>
                  <span>{new Date(m.date || m.scheduled_time).toLocaleString()}</span>
                </div>

                <div className="nec-fixture-teams-row">
                  <span style={{ maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {m.teamA || m.team_a_name}
                  </span>
                  <div className="nec-fixture-score-box">
                    {m.scoreA ?? 0} : {m.scoreB ?? 0}
                  </div>
                  <span style={{ maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {m.teamB || m.team_b_name}
                  </span>
                </div>

                <div className="nec-fixture-footer">
                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <MapPin size={14} />
                    <span>{m.ground || m.venue || "NEC Sports Complex"}</span>
                  </span>
                  <Badge status={m.status === "Completed" ? "success" : m.status === "Ongoing" ? "live" : "warning"}>
                    {m.status}
                  </Badge>
                </div>
              </div>
            ))}

            {matches.length === 0 && (
              <Card style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px 20px" }}>
                <Calendar size={40} style={{ opacity: 0.3, margin: "0 auto 10px auto" }} />
                <p style={{ margin: 0, color: "var(--nec-text-muted)" }}>No fixtures scheduled for your squad at this time.</p>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Modal: Enroll Athlete to Squad */}
      <Modal
        isOpen={Boolean(selectedTeamForPlayer)}
        onClose={() => setSelectedTeamForPlayer(null)}
        title="Add Athlete to Squad Roster"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Live Student Search */}
          <div className="nec-form-group">
            <label className="nec-form-label">Search Student (Name or Roll Number)</label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Type name or roll number (e.g., 2212001)..."
                value={studentSearchQuery}
                onChange={(e) => handleSearchStudents(e.target.value)}
                className="nec-form-input"
              />
            </div>

            {searchResults.length > 0 && (
              <div className="nec-student-results-dropdown">
                {searchResults.map((s) => (
                  <button
                    key={s.student_id || s.id}
                    type="button"
                    onClick={() => {
                      setPlayerForm({
                        ...playerForm,
                        studentId: s.register_number || s.studentId || s.id
                      });
                      setStudentSearchQuery(
                        `${s.student_name || s.name} (${s.register_number || s.studentId})`
                      );
                      setSearchResults([]);
                    }}
                    className="nec-student-result-item"
                  >
                    <span className="nec-student-result-name">{s.student_name || s.name}</span>
                    <span className="nec-student-result-meta">
                      {s.register_number || s.studentId} • {s.department_code || s.deptCode}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={handleAddPlayer} className="nec-form-body">
            <div className="nec-form-group">
              <label className="nec-form-label">Selected Student Identifier / Roll No *</label>
              <input
                type="text"
                required
                placeholder="Enter or select student roll number"
                value={playerForm.studentId}
                onChange={(e) => setPlayerForm({ ...playerForm, studentId: e.target.value })}
                className="nec-form-input"
              />
            </div>

            <div className="nec-form-row">
              <div className="nec-form-group">
                <label className="nec-form-label">Squad Role</label>
                <select
                  value={playerForm.role}
                  onChange={(e) => setPlayerForm({ ...playerForm, role: e.target.value })}
                  className="nec-form-select"
                >
                  <option value="Player">Player</option>
                  <option value="Vice Captain">Vice Captain</option>
                  <option value="Goalkeeper">Goalkeeper</option>
                  <option value="Reserve">Reserve</option>
                </select>
              </div>

              <div className="nec-form-group">
                <label className="nec-form-label">Jersey Number</label>
                <input
                  type="number"
                  placeholder="e.g. 10"
                  value={playerForm.jerseyNo}
                  onChange={(e) => setPlayerForm({ ...playerForm, jerseyNo: e.target.value })}
                  className="nec-form-input"
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
              <Button
                type="button"
                variant="outline"
                style={{ flex: 1 }}
                onClick={() => setSelectedTeamForPlayer(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                style={{ flex: 1 }}
              >
                Enroll Athlete
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
