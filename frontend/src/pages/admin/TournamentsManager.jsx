import React, { useEffect, useState } from "react";
import { 
  tournamentsApi, 
  teamsApi, 
  sportsApi, 
  matchesApi 
} from "../../services/api/apiServices";
import { useAuth } from "../../context/AuthContext";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import Table from "../../components/common/Table";
import ErrorState from "../../components/common/ErrorState";
import { 
  Plus, 
  Calendar, 
  Trophy, 
  Shield, 
  Users, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  ArrowLeft,
  Edit,
  Check,
  Award
} from "lucide-react";
import "./AdminPortal.css";
import "./TournamentsManager.css";

export default function TournamentsManager() {
  const { t } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [activeTab, setActiveTab] = useState("teams"); // 'teams' | 'fixtures'
  
  // Data for selected tournament
  const [registeredTeams, setRegisteredTeams] = useState([]);
  const [tournamentMatches, setTournamentMatches] = useState([]);
  const [venues, setVenues] = useState([]);
  const [sports, setSports] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAddMatchModalOpen, setIsAddMatchModalOpen] = useState(false);

  // Helper for human-readable date display
  const formatDate = (dateStr) => {
    if (!dateStr) return "TBD";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "TBD";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-US", { 
        month: "short", 
        day: "numeric", 
        hour: "2-digit", 
        minute: "2-digit" 
      });
    } catch {
      return dateStr;
    }
  };

  // New Tournament Form
  const [newTournament, setNewTournament] = useState({
    title: "",
    academicYear: "2025-2026",
    tier: "Intramural",
    description: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "2026-09-30"
  });

  // New Match Fixture Form
  const [newMatch, setNewMatch] = useState({
    sportId: "",
    teamAId: "",
    teamBId: "",
    venueId: "",
    pool: "Pool A",
    round: "League",
    date: new Date().toISOString().split("T")[0],
    time: "09:00 AM",
    scheduledTime: new Date().toISOString().slice(0, 16)
  });

  useEffect(() => {
    loadTournaments();
    loadVenuesAndSports();
  }, []);

  useEffect(() => {
    if (selectedTournament) {
      loadTournamentWorkspace(selectedTournament.id || selectedTournament.tournament_id);
    }
  }, [selectedTournament]);

  const loadTournaments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await tournamentsApi.getTournaments();
      setTournaments(data || []);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError(err.message);
      setLoading(false);
    }
  };

  const loadVenuesAndSports = async () => {
    try {
      const [vData, sData] = await Promise.all([
        sportsApi.getVenues().catch(() => []),
        sportsApi.getSports().catch(() => [])
      ]);
      setVenues(vData || []);
      setSports(sData || []);
      if (sData[0]) setNewMatch(prev => ({ ...prev, sportId: sData[0].sport_id || sData[0].id }));
      if (vData[0]) setNewMatch(prev => ({ ...prev, venueId: vData[0].venue_id || vData[0].id }));
    } catch (err) {
      console.error(err);
    }
  };

  const loadTournamentWorkspace = async (tournamentId) => {
    try {
      setLoading(true);
      const [teamsData, matchesData] = await Promise.all([
        tournamentsApi.getTournamentTeams(tournamentId).catch(() => []),
        tournamentsApi.getTournamentMatches(tournamentId).catch(() => [])
      ]);
      setRegisteredTeams(teamsData || []);
      setTournamentMatches(matchesData || []);

      if (teamsData.length >= 2) {
        setNewMatch(prev => ({
          ...prev,
          teamAId: teamsData[0].id || teamsData[0].team_id,
          teamBId: teamsData[1].id || teamsData[1].team_id
        }));
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError(err.message);
      setLoading(false);
    }
  };

  const handleCreateTournament = async (e) => {
    e.preventDefault();
    if (!newTournament.title.trim()) return;

    try {
      await tournamentsApi.createTournament({
        title: newTournament.title,
        academicYear: newTournament.academicYear,
        tier: newTournament.tier,
        description: newTournament.description,
        startDate: newTournament.startDate,
        endDate: newTournament.endDate,
        organizer: "Physical Education Department & Sports Directorate"
      });

      setIsCreateModalOpen(false);
      setNewTournament({
        title: "",
        academicYear: "2025-2026",
        tier: "Intramural",
        description: "",
        startDate: new Date().toISOString().split("T")[0],
        endDate: "2026-09-30"
      });
      setSuccessMsg("Tournament created successfully!");
      setTimeout(() => setSuccessMsg(null), 4000);
      loadTournaments();
    } catch (err) {
      setError(err.message || "Failed to create tournament");
      setTimeout(() => setError(null), 4000);
    }
  };

  const handleUpdateTeamStatus = async (teamId, status) => {
    try {
      await teamsApi.updateTeamStatus(teamId, status);
      setSuccessMsg(`Team marked as ${status} successfully.`);
      setTimeout(() => setSuccessMsg(null), 4000);
      if (selectedTournament) {
        loadTournamentWorkspace(selectedTournament.id || selectedTournament.tournament_id);
      }
    } catch (err) {
      setError(err.message || "Failed to update team clearance status");
      setTimeout(() => setError(null), 4000);
    }
  };

  const handleCreateFixtureMatch = async (e) => {
    e.preventDefault();
    if (!selectedTournament || !newMatch.teamAId || !newMatch.teamBId) {
      setError("Please select both participating teams");
      return;
    }

    try {
      const tourId = selectedTournament.id || selectedTournament.tournament_id;
      await tournamentsApi.createTournamentMatch(tourId, {
        tournament_id: tourId,
        sport_id: Number(newMatch.sportId),
        team_a_id: Number(newMatch.teamAId),
        team_b_id: Number(newMatch.teamBId),
        venue_id: Number(newMatch.venueId),
        pool: newMatch.pool,
        round: newMatch.round,
        scheduled_time: newMatch.scheduledTime || `${newMatch.date} 09:00:00`,
        status: "Scheduled"
      });

      setIsAddMatchModalOpen(false);
      setSuccessMsg("Match fixture added to tournament pool successfully!");
      setTimeout(() => setSuccessMsg(null), 4000);
      loadTournamentWorkspace(tourId);
    } catch (err) {
      setError(err.message || "Failed to create match fixture");
      setTimeout(() => setError(null), 4000);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 1. Unified Tournament Detail Workspace View
  // ─────────────────────────────────────────────────────────────
  if (selectedTournament) {
    const teamsColumns = [
      { 
        key: "name", 
        label: "Team Name", 
        render: (val, row) => <strong>{val || row.name}</strong> 
      },
      { 
        key: "sportName", 
        label: "Sport", 
        render: (val) => val || "General" 
      },
      { 
        key: "deptCode", 
        label: "Department", 
        render: (val, row) => (
          <span className="nec-tournament-year-badge">
            {val || row.deptName || "NEC"}
          </span>
        ) 
      },
      { 
        key: "captainName", 
        label: "Team Captain", 
        render: (val, row) => val ? (
          <div>
            <div style={{ fontWeight: 600 }}>{val}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--nec-text-muted)" }}>{row.captainRoll}</div>
          </div>
        ) : <span style={{ color: "var(--nec-text-muted)", fontStyle: "italic" }}>Not Assigned</span>
      },
      { 
        key: "memberCount", 
        label: "Roster Size", 
        render: (val) => <span>{val || 0} Athletes</span> 
      },
      { 
        key: "status", 
        label: "Clearance Status", 
        render: (val) => (
          <Badge status={val === "Approved" ? "success" : val === "Pending" ? "warning" : "danger"}>
            {val || "Pending"}
          </Badge>
        ) 
      },
      {
        key: "actions",
        label: "Actions",
        sortable: false,
        render: (_, row) => (
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            {row.status !== "Approved" && (
              <Button 
                size="sm" 
                variant="primary" 
                icon={Check} 
                onClick={() => handleUpdateTeamStatus(row.id || row.team_id, "Approved")}
              >
                Approve
              </Button>
            )}
          </div>
        )
      }
    ];

    const fixturesColumns = [
      { 
        key: "sno", 
        label: "S.No", 
        width: "60px",
        render: (_, __, idx) => <span>{idx + 1}</span> 
      },
      { 
        key: "scheduled_time", 
        label: "Date & Time", 
        render: (val) => (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Calendar size={14} color="var(--nec-text-muted)" />
            <span>{formatDateTime(val)}</span>
          </div>
        )
      },
      { 
        key: "round", 
        label: "Pool / Stage", 
        render: (val, row) => (
          <span className="nec-tournament-year-badge">
            {row.pool || val || "League"}
          </span>
        ) 
      },
      { 
        key: "venue_name", 
        label: "Ground / Venue", 
        render: (val, row) => (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <MapPin size={14} color="var(--nec-blue)" />
            <span>{val || row.venueName || "Main Sports Ground"}</span>
          </div>
        ) 
      },
      { 
        key: "teams", 
        label: "Match Fixture", 
        render: (_, row) => (
          <div style={{ fontWeight: 700 }}>
            {row.team_a_name || row.teamAName || "Team A"} <span style={{ color: "var(--nec-text-muted)", fontWeight: 400 }}>vs</span> {row.team_b_name || row.teamBName || "Team B"}
          </div>
        ) 
      },
      { 
        key: "score", 
        label: "Score", 
        render: (_, row) => (
          <div style={{ fontWeight: 700, color: "var(--nec-blue)" }}>
            {row.score_a ?? 0} - {row.score_b ?? 0}
          </div>
        ) 
      },
      { 
        key: "status", 
        label: "Status", 
        render: (val) => (
          <Badge status={val === "Ongoing" ? "live" : val === "Completed" ? "neutral" : "info"}>
            {val || "Scheduled"}
          </Badge>
        ) 
      }
    ];

    return (
      <div className="nec-portal-page nec-tournaments-container">
        {/* Back Button */}
        <div>
          <button onClick={() => setSelectedTournament(null)} className="nec-back-btn">
            <ArrowLeft size={16} />
            <span>Back to All Tournaments</span>
          </button>
        </div>

        {/* Tournament Header Banner */}
        <div className="nec-workspace-header-card">
          <div className="nec-workspace-header-content">
            <div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
                <span className="nec-tournament-year-badge">
                  {selectedTournament.academicYear || selectedTournament.academic_year || "2025-2026"}
                </span>
                <Badge status="info">
                  {selectedTournament.eventCategory || selectedTournament.tier || "Intramural"}
                </Badge>
                <Badge status={selectedTournament.status === "Ongoing" ? "live" : "success"}>
                  {selectedTournament.status || "Active Tournament"}
                </Badge>
              </div>

              <h1 className="nec-workspace-title">
                <Trophy size={28} color="var(--nec-blue)" />
                <span>{selectedTournament.title || selectedTournament.name}</span>
              </h1>

              <p className="nec-workspace-subtitle">
                Organized by <strong>{selectedTournament.organizer || "Physical Education Department & Sports Directorate"}</strong> • Dates: {formatDate(selectedTournament.startDate || selectedTournament.start_date)} to {formatDate(selectedTournament.endDate || selectedTournament.end_date)}
              </p>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <Button 
                variant="primary" 
                icon={Plus} 
                onClick={() => setIsAddMatchModalOpen(true)}
              >
                Schedule Match Fixture
              </Button>
            </div>
          </div>
        </div>

        {/* Feedback Messages */}
        {successMsg && (
          <div style={{ padding: "12px 16px", borderRadius: "8px", background: "var(--nec-success-bg)", color: "var(--nec-success-text)", display: "flex", alignItems: "center", gap: "8px" }}>
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </div>
        )}
        {error && (
          <div style={{ padding: "12px 16px", borderRadius: "8px", background: "var(--nec-danger-bg)", color: "var(--nec-danger-text)", display: "flex", alignItems: "center", gap: "8px" }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Workspace Navigation Tabs */}
        <div className="nec-workspace-tabs">
          <button
            onClick={() => setActiveTab("teams")}
            className={`nec-workspace-tab-btn ${activeTab === "teams" ? "active" : ""}`}
          >
            <Shield size={16} />
            <span>Registered Teams ({registeredTeams.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("fixtures")}
            className={`nec-workspace-tab-btn ${activeTab === "fixtures" ? "active" : ""}`}
          >
            <Calendar size={16} />
            <span>Pool Fixtures & Grounds ({tournamentMatches.length})</span>
          </button>
        </div>

        {/* TAB 1: Registered Teams */}
        {activeTab === "teams" && (
          <div>
            <div className="nec-workspace-section-header">
              <div>
                <h3 className="nec-workspace-section-title">Registered Sports Squads</h3>
                <p className="nec-workspace-section-desc">
                  Inspect team rosters, captain contacts, and approve clearance status for official tournament entry.
                </p>
              </div>
            </div>

            <Table 
              columns={teamsColumns} 
              data={registeredTeams} 
              emptyMessage="No squads registered for this tournament yet."
            />
          </div>
        )}

        {/* TAB 2: Pool Fixtures */}
        {activeTab === "fixtures" && (
          <div>
            <div className="nec-workspace-section-header">
              <div>
                <h3 className="nec-workspace-section-title">Collegiate Match Fixture Sheet</h3>
                <p className="nec-workspace-section-desc">
                  Official stage scheduling across home grounds and external university sports grounds.
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                icon={Plus} 
                onClick={() => setIsAddMatchModalOpen(true)}
              >
                Add Fixture
              </Button>
            </div>

            <Table 
              columns={fixturesColumns} 
              data={tournamentMatches} 
              emptyMessage="No match fixtures scheduled for this tournament yet."
            />
          </div>
        )}

        {/* Modal: Add Match Fixture */}
        <Modal
          isOpen={isAddMatchModalOpen}
          onClose={() => setIsAddMatchModalOpen(false)}
          title="Schedule Tournament Match Fixture"
        >
          <form onSubmit={handleCreateFixtureMatch} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div className="nec-form-grid-2">
              <div className="nec-form-group">
                <label className="nec-form-label">Sport *</label>
                <select
                  value={newMatch.sportId}
                  onChange={e => setNewMatch({ ...newMatch, sportId: e.target.value })}
                  className="nec-form-select"
                >
                  {sports.map(s => (
                    <option key={s.sport_id || s.id} value={s.sport_id || s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="nec-form-group">
                <label className="nec-form-label">Pool / Stage *</label>
                <select
                  value={newMatch.pool}
                  onChange={e => setNewMatch({ ...newMatch, pool: e.target.value })}
                  className="nec-form-select"
                >
                  <option value="Pool A">Pool A</option>
                  <option value="Pool B">Pool B</option>
                  <option value="Pool C">Pool C</option>
                  <option value="Pool D">Pool D</option>
                  <option value="Quarter-Final">Quarter-Final</option>
                  <option value="Semi-Final">Semi-Final</option>
                  <option value="Final">Final</option>
                </select>
              </div>
            </div>

            <div className="nec-form-grid-2">
              <div className="nec-form-group">
                <label className="nec-form-label">Team A *</label>
                <select
                  value={newMatch.teamAId}
                  onChange={e => setNewMatch({ ...newMatch, teamAId: e.target.value })}
                  className="nec-form-select"
                >
                  {registeredTeams.map(t => (
                    <option key={t.id || t.team_id} value={t.id || t.team_id}>
                      {t.name} ({t.deptCode || t.deptName || "NEC"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="nec-form-group">
                <label className="nec-form-label">Team B *</label>
                <select
                  value={newMatch.teamBId}
                  onChange={e => setNewMatch({ ...newMatch, teamBId: e.target.value })}
                  className="nec-form-select"
                >
                  {registeredTeams.map(t => (
                    <option key={t.id || t.team_id} value={t.id || t.team_id}>
                      {t.name} ({t.deptCode || t.deptName || "NEC"})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="nec-form-group">
              <label className="nec-form-label">Ground / College Venue *</label>
              <select
                value={newMatch.venueId}
                onChange={e => setNewMatch({ ...newMatch, venueId: e.target.value })}
                className="nec-form-select"
              >
                {venues.map(v => (
                  <option key={v.venue_id || v.id} value={v.venue_id || v.id}>
                    {v.name} {v.college_name ? `(${v.college_name})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="nec-form-group">
              <label className="nec-form-label">Scheduled Date & Time *</label>
              <input
                type="datetime-local"
                value={newMatch.scheduledTime}
                onChange={e => setNewMatch({ ...newMatch, scheduledTime: e.target.value })}
                className="nec-form-input"
              />
            </div>

            <div className="nec-form-actions">
              <Button variant="outline" onClick={() => setIsAddMatchModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Add Fixture Match</Button>
            </div>
          </form>
        </Modal>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. Primary Tournaments Catalog Grid View
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="nec-portal-page nec-tournaments-container">
      <div className="nec-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 className="nec-page-title">{t.tournamentsManagement || "Tournaments Management"}</h2>
          <p className="nec-page-desc">
            Manage tournament series, configure collegiate pool fixtures across grounds, and approve squad clearances.
          </p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setIsCreateModalOpen(true)}>
          {t.createTournament || "Create Tournament"}
        </Button>
      </div>

      {successMsg && (
        <div style={{ padding: "12px 16px", borderRadius: "8px", background: "var(--nec-success-bg)", color: "var(--nec-success-text)", display: "flex", alignItems: "center", gap: "8px" }}>
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {error ? (
        <div style={{ padding: "40px" }}>
          <ErrorState onRetry={loadTournaments} />
        </div>
      ) : tournaments.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", background: "var(--nec-surface)", borderRadius: "12px", border: "1px dashed var(--nec-border)" }}>
          <Trophy size={48} color="var(--nec-blue)" style={{ margin: "0 auto 16px" }} />
          <h3 style={{ margin: "0 0 8px" }}>No Tournaments Configured</h3>
          <p style={{ color: "var(--nec-text-muted)", margin: "0 0 20px" }}>Get started by creating your first official tournament series.</p>
          <Button variant="primary" icon={Plus} onClick={() => setIsCreateModalOpen(true)}>Create Tournament</Button>
        </div>
      ) : (
        <div className="nec-tournaments-grid">
          {tournaments.map((t) => (
            <div
              key={t.id || t.tournament_id}
              onClick={() => setSelectedTournament(t)}
              className="nec-tournament-card"
            >
              <div>
                <div className="nec-tournament-card-header">
                  <span className="nec-tournament-year-badge">
                    {t.academicYear || t.academic_year || "2025-2026"}
                  </span>
                  <Badge status={t.status === "Ongoing" ? "live" : t.status === "Registration Open" ? "info" : "success"}>
                    {t.status || "Upcoming"}
                  </Badge>
                </div>

                <h3 className="nec-tournament-title">
                  {t.title || t.name}
                </h3>

                <p className="nec-tournament-desc">
                  {t.organizer || "Physical Education Department & Sports Directorate"}
                </p>

                <div className="nec-tournament-meta">
                  <div className="nec-tournament-meta-item">
                    <Calendar size={14} color="var(--nec-blue)" />
                    <span>{formatDate(t.startDate || t.start_date)}</span>
                  </div>
                  <div className="nec-tournament-meta-item">
                    <Award size={14} color="var(--nec-warning)" />
                    <span>{t.eventCategory || t.tier || "Intramural"}</span>
                  </div>
                </div>
              </div>

              <div className="nec-tournament-card-footer">
                <span>Open Tournament Workspace</span>
                <ChevronRight size={16} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create Tournament */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Tournament Series"
      >
        <form onSubmit={handleCreateTournament} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div className="nec-form-group">
            <label className="nec-form-label">Tournament Title *</label>
            <input
              type="text"
              required
              className="nec-form-input"
              placeholder="e.g. NEC Annual Inter-Department Championship 2026"
              value={newTournament.title}
              onChange={(e) => setNewTournament({ ...newTournament, title: e.target.value })}
            />
          </div>

          <div className="nec-form-grid-2">
            <div className="nec-form-group">
              <label className="nec-form-label">Academic Year *</label>
              <input
                type="text"
                required
                className="nec-form-input"
                value={newTournament.academicYear}
                onChange={(e) => setNewTournament({ ...newTournament, academicYear: e.target.value })}
              />
            </div>

            <div className="nec-form-group">
              <label className="nec-form-label">Tier / Category</label>
              <select
                className="nec-form-select"
                value={newTournament.tier}
                onChange={(e) => setNewTournament({ ...newTournament, tier: e.target.value })}
              >
                <option value="Intramural">Intramural</option>
                <option value="District">District</option>
                <option value="Zonal">Zonal</option>
                <option value="Inter-Collegiate">Inter-Collegiate</option>
                <option value="State / National">State / National</option>
              </select>
            </div>
          </div>

          <div className="nec-form-grid-2">
            <div className="nec-form-group">
              <label className="nec-form-label">Start Date *</label>
              <input
                type="date"
                required
                className="nec-form-input"
                value={newTournament.startDate}
                onChange={(e) => setNewTournament({ ...newTournament, startDate: e.target.value })}
              />
            </div>

            <div className="nec-form-group">
              <label className="nec-form-label">End Date</label>
              <input
                type="date"
                className="nec-form-input"
                value={newTournament.endDate}
                onChange={(e) => setNewTournament({ ...newTournament, endDate: e.target.value })}
              />
            </div>
          </div>

          <div className="nec-form-group">
            <label className="nec-form-label">Description & Rules</label>
            <textarea
              rows={3}
              className="nec-form-input"
              placeholder="Optional overview, eligibility rules, and clearance requirements..."
              value={newTournament.description}
              onChange={(e) => setNewTournament({ ...newTournament, description: e.target.value })}
            />
          </div>

          <div className="nec-form-actions">
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Create Tournament</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
