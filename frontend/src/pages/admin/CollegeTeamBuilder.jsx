import React, { useState, useEffect, useMemo } from "react";
import { sportsApi, collegeTeamsApi, teamsApi, playersApi } from "../../services/api/apiServices";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import EmptyState from "../../components/common/EmptyState";
import SkeletonLoader from "../../components/common/SkeletonLoader";
import {
  Search,
  Filter,
  RotateCcw,
  Building2,
  Trophy,
  Users,
  CheckCircle2,
  AlertCircle,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Medal,
  Sparkles,
  ShieldCheck,
  Calendar,
  X
} from "lucide-react";
import "./AdminPortal.css";
import "./CollegeTeamBuilder.css";

export default function CollegeTeamBuilder() {
  // ── Global Data ──────────────────────────────────────────────────────────
  const [sports, setSports] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [allTeams, setAllTeams] = useState([]);
  const [collegeTeams, setCollegeTeams] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [globalError, setGlobalError] = useState(null);

  // Active View Tab: 'dept-teams' | 'college-squads' | 'builder'
  const [activeTab, setActiveTab] = useState("dept-teams");

  // ── Department-Wise Teams Filter & Search State ──────────────────────────
  const [teamSearch, setTeamSearch] = useState("");
  const [filterDept, setFilterDept] = useState("ALL");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [filterSport, setFilterSport] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [teamCurrentPage, setTeamCurrentPage] = useState(1);
  const [teamPageSize, setTeamPageSize] = useState(8);

  // ── College Team Builder State ───────────────────────────────────────────
  const [selectedSportId, setSelectedSportId] = useState("");
  const [customTeamName, setCustomTeamName] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedPlayersMap, setSelectedPlayersMap] = useState({});
  const [fetchingSuggestions, setFetchingSuggestions] = useState(false);
  const [submittingTeam, setSubmittingTeam] = useState(false);
  const [builderError, setBuilderError] = useState(null);
  const [builderSuccess, setBuilderSuccess] = useState(null);
  const [builderSearch, setBuilderSearch] = useState("");
  const [builderDeptFilter, setBuilderDeptFilter] = useState("ALL");
  const [builderPage, setBuilderPage] = useState(1);
  const [builderPageSize, setBuilderPageSize] = useState(8);

  // ── Selected College Teams State ────────────────────────────────────────
  const [collegeSearch, setCollegeSearch] = useState("");
  const [collegePage, setCollegePage] = useState(1);
  const [collegePageSize, setCollegePageSize] = useState(8);
  const [justAddedTeamId, setJustAddedTeamId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // ── Roster View Modal State ──────────────────────────────────────────────
  const [rosterModalOpen, setRosterModalOpen] = useState(false);
  const [modalTarget, setModalTarget] = useState(null); // { title, subtitle, dept, sport, category, isCollegeTeam }
  const [rosterList, setRosterList] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState(null);

  // ── Load Initial Data ───────────────────────────────────────────────────
  const loadAllData = async () => {
    setLoadingInitial(true);
    setGlobalError(null);
    try {
      const [sportsData, deptsData, teamsData, collegeData] = await Promise.all([
        sportsApi.getSports ? sportsApi.getSports() : Promise.resolve([]),
        sportsApi.getDepartments ? sportsApi.getDepartments() : Promise.resolve([]),
        teamsApi.getTeams ? teamsApi.getTeams() : Promise.resolve([]),
        collegeTeamsApi.getCollegeTeams ? collegeTeamsApi.getCollegeTeams() : Promise.resolve([])
      ]);

      setSports(Array.isArray(sportsData) ? sportsData : []);
      setDepartments(Array.isArray(deptsData) ? deptsData : []);
      setAllTeams(Array.isArray(teamsData) ? teamsData : []);
      setCollegeTeams(Array.isArray(collegeData?.data || collegeData) ? (collegeData?.data || collegeData) : []);
    } catch (err) {
      console.error(err);
      setGlobalError(err.message || "Failed to load team and department records.");
    } finally {
      setLoadingInitial(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Map sport categories lookup for quick access
  const sportsMap = useMemo(() => {
    const map = {};
    sports.forEach((s) => {
      map[s.sport_id || s.id] = s;
    });
    return map;
  }, [sports]);

  // Unique Sports Categories available in the database
  const availableCategories = useMemo(() => {
    const cats = new Set();
    sports.forEach((s) => {
      if (s.category) cats.add(s.category);
    });
    return Array.from(cats);
  }, [sports]);

  // ── Department-Wise Teams Filtering & Pagination ─────────────────────────
  const filteredTeams = useMemo(() => {
    return allTeams.filter((t) => {
      // 1. Department Filter
      if (filterDept !== "ALL") {
        const teamDept = String(t.deptCode || t.deptName || t.department || "").toUpperCase();
        if (teamDept !== filterDept.toUpperCase()) return false;
      }

      // 2. Sport Filter
      if (filterSport !== "ALL") {
        if (String(t.sportId || t.sport_id) !== String(filterSport)) return false;
      }

      // 3. Category Filter
      const sportObj = sportsMap[t.sportId || t.sport_id];
      const category = (t.sportCategory || sportObj?.category || "").toUpperCase();
      if (filterCategory !== "ALL") {
        if (category !== filterCategory.toUpperCase()) return false;
      }

      // 4. Status Filter
      if (filterStatus !== "ALL") {
        if ((t.status || "Pending").toUpperCase() !== filterStatus.toUpperCase()) return false;
      }

      // 5. Search Text Filter
      if (teamSearch.trim()) {
        const query = teamSearch.toLowerCase();
        const nameMatch = (t.name || "").toLowerCase().includes(query);
        const deptMatch = (t.deptCode || t.deptName || "").toLowerCase().includes(query);
        const sportMatch = (t.sportName || sportObj?.name || "").toLowerCase().includes(query);
        const catMatch = category.toLowerCase().includes(query);
        const captainMatch = (t.captainName || "").toLowerCase().includes(query) || (t.captainRoll || "").toLowerCase().includes(query);
        if (!nameMatch && !deptMatch && !sportMatch && !catMatch && !captainMatch) {
          return false;
        }
      }

      return true;
    });
  }, [allTeams, filterDept, filterSport, filterCategory, filterStatus, teamSearch, sportsMap]);

  const totalTeamPages = Math.ceil(filteredTeams.length / teamPageSize) || 1;
  const paginatedTeams = useMemo(() => {
    const start = (teamCurrentPage - 1) * teamPageSize;
    return filteredTeams.slice(start, start + teamPageSize);
  }, [filteredTeams, teamCurrentPage, teamPageSize]);

  const resetTeamFilters = () => {
    setTeamSearch("");
    setFilterDept("ALL");
    setFilterCategory("ALL");
    setFilterSport("ALL");
    setFilterStatus("ALL");
    setTeamCurrentPage(1);
  };

  // ── Category Badge Helper ───────────────────────────────────────────────
  const renderCategoryBadge = (category, sportType) => {
    const cat = category || "Open";
    let catClass = "nec-cat-default";
    const lower = cat.toLowerCase();
    if (lower.includes("outdoor")) catClass = "nec-cat-outdoor";
    else if (lower.includes("indoor")) catClass = "nec-cat-indoor";
    else if (lower.includes("men") && !lower.includes("women")) catClass = "nec-cat-men";
    else if (lower.includes("women")) catClass = "nec-cat-women";
    else if (lower.includes("open")) catClass = "nec-cat-open";

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "3px", alignItems: "flex-start" }}>
        <span className={`nec-category-badge ${catClass}`}>
          {cat}
        </span>
        {sportType && (
          <span style={{ fontSize: "0.72rem", color: "var(--nec-text-muted, #64748b)" }}>
            {sportType}
          </span>
        )}
      </div>
    );
  };

  // ── View Team Roster ────────────────────────────────────────────────────
  const handleViewRoster = async (team) => {
    const sportObj = sportsMap[team.sportId || team.sport_id];
    setModalTarget({
      title: team.name,
      subtitle: team.tournamentName || "Department Sports Squad",
      dept: team.deptCode || team.deptName || "NEC",
      sport: team.sportName || sportObj?.name || "Sport",
      category: team.sportCategory || sportObj?.category || "Open",
      isCollegeTeam: false
    });
    setRosterList([]);
    setRosterError(null);
    setRosterLoading(true);
    setRosterModalOpen(true);

    try {
      const players = await playersApi.getPlayersByTeam(team.team_id || team.id);
      setRosterList(Array.isArray(players) ? players : []);
    } catch (err) {
      console.error(err);
      setRosterError(err.message || "Failed to load players for this team.");
    } finally {
      setRosterLoading(false);
    }
  };

  // ── View Confirmed College Squad ────────────────────────────────────────
  const handleViewCollegeSquad = async (cTeam) => {
    setModalTarget({
      title: cTeam.team_name || `NEC College Team - ${cTeam.sport_name}`,
      subtitle: `Season ${cTeam.season_year} Official College Squad`,
      dept: "All Departments",
      sport: cTeam.sport_name,
      category: cTeam.sport_category || "Men",
      isCollegeTeam: true
    });
    setRosterList([]);
    setRosterError(null);
    setRosterLoading(true);
    setRosterModalOpen(true);

    try {
      const res = await collegeTeamsApi.getCollegeTeamMembers(cTeam.college_team_id || cTeam.id);
      setRosterList(Array.isArray(res?.data || res) ? (res?.data || res) : []);
    } catch (err) {
      console.error(err);
      setRosterError(err.message || "Failed to load athletes for this college team.");
    } finally {
      setRosterLoading(false);
    }
  };

  // ── Delete / Remove Confirmed College Team ──────────────────────────────
  const handleDeleteCollegeTeam = async (cTeam) => {
    const teamTitle = cTeam.team_name || `NEC ${cTeam.sport_name} Team`;
    if (!window.confirm(`Are you sure you want to remove "${teamTitle}"? This will permanently delete this college team and its confirmed athlete roster.`)) {
      return;
    }

    const targetId = cTeam.college_team_id || cTeam.id;
    setDeletingId(targetId);
    try {
      await collegeTeamsApi.deleteCollegeTeam(targetId);
      // Refresh list
      const collegeData = await collegeTeamsApi.getCollegeTeams();
      const list = Array.isArray(collegeData?.data || collegeData) ? (collegeData?.data || collegeData) : [];
      setCollegeTeams(list);
    } catch (err) {
      console.error(err);
      alert("Failed to remove college team: " + (err.message || "Unknown error"));
    } finally {
      setDeletingId(null);
    }
  };

  // ── College Team Builder Logic ──────────────────────────────────────────
  const handleSportSelect = async (sportId) => {
    setSelectedSportId(sportId);
    setSuggestions([]);
    setSelectedPlayersMap({});
    setBuilderError(null);
    setBuilderSuccess(null);
    setBuilderPage(1);

    if (!sportId) return;

    // Suggest default team name based on sport
    const sp = sportsMap[sportId];
    if (sp) {
      setCustomTeamName(`NEC ${sp.name} Varsity`);
    }

    setFetchingSuggestions(true);
    try {
      const data = await collegeTeamsApi.getSuggestions(sportId);
      const list = data?.data || data || [];
      setSuggestions(list);
      // Default all suggested candidate players as checked
      const initialMap = {};
      list.forEach((p) => {
        initialMap[p.student_id] = true;
      });
      setSelectedPlayersMap(initialMap);
    } catch (err) {
      console.error(err);
      setBuilderError(err.message || "Failed to fetch candidate squad suggestions.");
    } finally {
      setFetchingSuggestions(false);
    }
  };

  const handleTogglePlayer = (studentId) => {
    setSelectedPlayersMap((prev) => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  const handleToggleAllSuggestions = (checked) => {
    const updated = {};
    suggestions.forEach((p) => {
      updated[p.student_id] = checked;
    });
    setSelectedPlayersMap(updated);
  };

  const handleConfirmTeam = async () => {
    if (!selectedSportId) return;

    const selectedPlayers = suggestions
      .filter((p) => selectedPlayersMap[p.student_id])
      .map((p) => ({
        student_id: p.student_id,
        source_department_id: p.source_department_id
      }));

    if (selectedPlayers.length === 0) {
      setBuilderError("Please select at least one candidate athlete to confirm the college team.");
      return;
    }

    setSubmittingTeam(true);
    setBuilderError(null);
    setBuilderSuccess(null);

    try {
      const res = await collegeTeamsApi.confirmTeam(
        Number(selectedSportId),
        selectedPlayers,
        customTeamName.trim() || null
      );
      
      const newTeamId = res?.college_team_id || res?.data?.college_team_id;
      setJustAddedTeamId(newTeamId);

      // Reload college teams list so newly added team is immediately present
      const collegeData = await collegeTeamsApi.getCollegeTeams();
      const list = Array.isArray(collegeData?.data || collegeData) ? (collegeData?.data || collegeData) : [];
      setCollegeTeams(list);

      setBuilderSuccess(`College team "${res?.team_name || res?.data?.team_name || customTeamName || 'Varsity'}" confirmed and added with ${selectedPlayers.length} athletes!`);
      
      // Auto-switch to "Selected College Teams" tab so user immediately sees their newly added team alongside the older ones!
      setTimeout(() => {
        setActiveTab("college-squads");
      }, 700);
    } catch (err) {
      console.error(err);
      setBuilderError(err.message || "Failed to confirm college team selection.");
    } finally {
      setSubmittingTeam(false);
    }
  };

  // Filtered Candidate Athletes in Builder
  const filteredSuggestions = useMemo(() => {
    return suggestions.filter((p) => {
      if (builderDeptFilter !== "ALL") {
        const pDept = String(p.source_department_code || p.source_department_name || "").toUpperCase();
        if (pDept !== builderDeptFilter.toUpperCase()) return false;
      }
      if (builderSearch.trim()) {
        const q = builderSearch.toLowerCase();
        const matchName = (p.name || "").toLowerCase().includes(q);
        const matchRoll = (p.register_number || "").toLowerCase().includes(q);
        const matchDept = (p.source_department_name || p.source_department_code || "").toLowerCase().includes(q);
        if (!matchName && !matchRoll && !matchDept) return false;
      }
      return true;
    });
  }, [suggestions, builderDeptFilter, builderSearch]);

  const totalBuilderPages = Math.ceil(filteredSuggestions.length / builderPageSize) || 1;
  const paginatedSuggestions = useMemo(() => {
    const start = (builderPage - 1) * builderPageSize;
    return filteredSuggestions.slice(start, start + builderPageSize);
  }, [filteredSuggestions, builderPage, builderPageSize]);

  // Selected College Teams filtered & paginated
  const filteredCollegeTeams = useMemo(() => {
    if (!collegeSearch.trim()) return collegeTeams;
    const q = collegeSearch.toLowerCase();
    return collegeTeams.filter((ct) => {
      return (
        (ct.team_name || "").toLowerCase().includes(q) ||
        (ct.sport_name || "").toLowerCase().includes(q) ||
        (ct.sport_category || "").toLowerCase().includes(q) ||
        String(ct.season_year || "").includes(q)
      );
    });
  }, [collegeTeams, collegeSearch]);

  const totalCollegePages = Math.ceil(filteredCollegeTeams.length / collegePageSize) || 1;
  const paginatedCollegeTeams = useMemo(() => {
    const start = (collegePage - 1) * collegePageSize;
    return filteredCollegeTeams.slice(start, start + collegePageSize);
  }, [filteredCollegeTeams, collegePage, collegePageSize]);

  // ── Render Loading State ────────────────────────────────────────────────
  if (loadingInitial) {
    return (
      <div className="nec-portal-page">
        <div style={{ padding: "40px 20px", maxWidth: "1200px", margin: "0 auto" }}>
          <SkeletonLoader rows={8} />
        </div>
      </div>
    );
  }

  return (
    <div className="nec-portal-page">
      <div className="nec-ct-container">
        {/* ── Page Header ──────────────────────────────────────────────── */}
        <div className="nec-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "14px" }}>
          <div>
            <h1 className="nec-page-title" style={{ fontSize: "1.75rem", marginBottom: "4px" }}>
              College Teams &amp; Department Rosters
            </h1>
            <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--nec-text-muted, #64748b)" }}>
              Manage selected college teams, browse department-wise squads, and assemble new teams.
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <Button
              variant={activeTab === "builder" ? "primary" : "outline"}
              icon={Sparkles}
              onClick={() => setActiveTab("builder")}
            >
              + Add New College Team
            </Button>
          </div>
        </div>

        {/* ── Global Alert Banner ────────────────────────────────────────── */}
        {globalError && (
          <div style={{ color: "#d9534f", backgroundColor: "#fdf7f7", padding: "12px 16px", borderRadius: "8px", border: "1px solid #d9534f", display: "flex", alignItems: "center", gap: "10px" }}>
            <AlertCircle size={18} />
            <span>{globalError}</span>
          </div>
        )}

        {/* ── Key Statistics Cards ──────────────────────────────────────── */}
        <div className="nec-ct-stats-grid">
          <div className="nec-ct-stat-card">
            <div className="nec-ct-stat-icon amber">
              <Trophy size={22} />
            </div>
            <div>
              <div className="nec-ct-stat-val">{collegeTeams.length}</div>
              <div className="nec-ct-stat-label">Selected College Teams</div>
            </div>
          </div>

          <div className="nec-ct-stat-card">
            <div className="nec-ct-stat-icon primary">
              <Users size={22} />
            </div>
            <div>
              <div className="nec-ct-stat-val">{allTeams.length}</div>
              <div className="nec-ct-stat-label">Dept-Wise Teams</div>
            </div>
          </div>

          <div className="nec-ct-stat-card">
            <div className="nec-ct-stat-icon indigo">
              <Building2 size={22} />
            </div>
            <div>
              <div className="nec-ct-stat-val">{departments.length}</div>
              <div className="nec-ct-stat-label">Departments</div>
            </div>
          </div>

          <div className="nec-ct-stat-card">
            <div className="nec-ct-stat-icon success">
              <Medal size={22} />
            </div>
            <div>
              <div className="nec-ct-stat-val">{sports.length}</div>
              <div className="nec-ct-stat-label">Sports Disciplines</div>
            </div>
          </div>
        </div>

        {/* ── Navigation Tabs ───────────────────────────────────────────── */}
        <div className="nec-ct-tabs">
          <button
            type="button"
            className={`nec-ct-tab-btn ${activeTab === "college-squads" ? "active" : ""}`}
            onClick={() => setActiveTab("college-squads")}
          >
            <Trophy size={16} />
            <span>Selected College Teams</span>
            <span className="nec-ct-tab-badge">{collegeTeams.length}</span>
          </button>

          <button
            type="button"
            className={`nec-ct-tab-btn ${activeTab === "dept-teams" ? "active" : ""}`}
            onClick={() => setActiveTab("dept-teams")}
          >
            <Building2 size={16} />
            <span>Department-Wise Teams</span>
            <span className="nec-ct-tab-badge">{allTeams.length}</span>
          </button>

          <button
            type="button"
            className={`nec-ct-tab-btn ${activeTab === "builder" ? "active" : ""}`}
            onClick={() => setActiveTab("builder")}
          >
            <Sparkles size={16} />
            <span>Add New College Team (Builder)</span>
          </button>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            TAB 1: SELECTED COLLEGE TEAMS (Displays Both New & Old + Removal)
           ════════════════════════════════════════════════════════════════════ */}
        {activeTab === "college-squads" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="nec-ct-toolbar-card">
              <div className="nec-ct-toolbar-row">
                <div className="nec-ct-search-box">
                  <Search size={16} className="nec-ct-search-icon" />
                  <input
                    type="text"
                    className="nec-ct-search-input"
                    placeholder="Search selected college teams by name, sport, category..."
                    value={collegeSearch}
                    onChange={(e) => {
                      setCollegeSearch(e.target.value);
                      setCollegePage(1);
                    }}
                  />
                </div>
                <Button
                  variant="primary"
                  icon={Sparkles}
                  onClick={() => setActiveTab("builder")}
                >
                  + Add New College Team
                </Button>
              </div>
            </div>

            {filteredCollegeTeams.length === 0 ? (
              <div className="nec-card" style={{ padding: "40px 20px" }}>
                <EmptyState
                  title="No Selected College Teams Found"
                  message="No college squads match your search. Use the 'Add New College Team' tab to assemble and confirm a new college team."
                />
              </div>
            ) : (
              <div className="nec-card" style={{ padding: 0, overflow: "hidden" }}>
                <div className="nec-table-responsive-wrapper">
                  <table className="nec-table">
                    <thead>
                      <tr>
                        <th style={{ width: "90px" }}>Season</th>
                        <th>College Team Name</th>
                        <th style={{ width: "150px" }}>Sport Discipline</th>
                        <th style={{ width: "150px" }}>Sports Category</th>
                        <th style={{ width: "130px" }}>Created On</th>
                        <th style={{ width: "130px", textAlign: "center" }}>Confirmed Athletes</th>
                        <th style={{ width: "180px", textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedCollegeTeams.map((ct) => {
                        const targetId = ct.college_team_id || ct.id;
                        const isRecentlyAdded = targetId === justAddedTeamId;

                        return (
                          <tr
                            key={targetId}
                            style={{
                              backgroundColor: targetId === justAddedTeamId ? "rgba(16, 185, 129, 0.05)" : "transparent"
                            }}
                          >
                            <td>
                              <span style={{ fontWeight: 700, color: "var(--nec-primary, #0056b3)" }}>
                                {ct.season_year || 2026}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <strong style={{ fontSize: "0.96rem", color: "var(--nec-text-main, #0f172a)" }}>
                                  {ct.team_name || `NEC ${ct.sport_name} Varsity`}
                                </strong>
                                {isRecentlyAdded && (
                                  <span style={{
                                    fontSize: "0.7rem",
                                    fontWeight: 800,
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    backgroundColor: "#10b981",
                                    color: "#ffffff",
                                    letterSpacing: "0.5px"
                                  }}>
                                    NEW
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 600, color: "var(--nec-text-main, #0f172a)" }}>
                                {ct.sport_name}
                              </div>
                            </td>
                            <td>
                              {renderCategoryBadge(ct.sport_category || "Men", ct.sport_type)}
                            </td>
                            <td>
                              <span style={{ fontSize: "0.82rem", color: "var(--nec-text-muted, #64748b)" }}>
                                {ct.created_at ? new Date(ct.created_at).toLocaleDateString() : "Active Season"}
                              </span>
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <span style={{
                                display: "inline-block",
                                padding: "3px 10px",
                                borderRadius: "12px",
                                fontSize: "0.82rem",
                                fontWeight: 700,
                                background: "rgba(16, 185, 129, 0.12)",
                                color: "#059669"
                              }}>
                                {ct.member_count || 0} Athletes
                              </span>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  icon={Eye}
                                  onClick={() => handleViewCollegeSquad(ct)}
                                  title="View confirmed squad athletes"
                                >
                                  Squad
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  icon={Trash2}
                                  loading={deletingId === targetId}
                                  onClick={() => handleDeleteCollegeTeam(ct)}
                                  title="Remove this college team"
                                >
                                  Remove
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="nec-ct-pagination-bar">
                  <div className="nec-ct-page-size-selector">
                    <span>Show</span>
                    <select
                      className="nec-ct-page-size-select"
                      value={collegePageSize}
                      onChange={(e) => {
                        setCollegePageSize(Number(e.target.value));
                        setCollegePage(1);
                      }}
                    >
                      <option value={5}>5</option>
                      <option value={8}>8</option>
                      <option value={12}>12</option>
                      <option value={20}>20</option>
                    </select>
                    <span>per page • Showing {Math.min((collegePage - 1) * collegePageSize + 1, filteredCollegeTeams.length)} - {Math.min(collegePage * collegePageSize, filteredCollegeTeams.length)} of {filteredCollegeTeams.length} selected college teams</span>
                  </div>

                  <div className="nec-ct-pagination-controls">
                    <button
                      type="button"
                      className="nec-ct-page-btn"
                      disabled={collegePage <= 1}
                      onClick={() => setCollegePage(1)}
                      title="First Page"
                    >
                      <ChevronsLeft size={16} />
                    </button>
                    <button
                      type="button"
                      className="nec-ct-page-btn"
                      disabled={collegePage <= 1}
                      onClick={() => setCollegePage((p) => Math.max(1, p - 1))}
                      title="Previous Page"
                    >
                      <ChevronLeft size={16} />
                    </button>

                    {Array.from({ length: totalCollegePages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalCollegePages || Math.abs(p - collegePage) <= 2)
                      .map((p, idx, arr) => {
                        const showEllipsisBefore = idx > 0 && p - arr[idx - 1] > 1;
                        return (
                          <React.Fragment key={p}>
                            {showEllipsisBefore && <span style={{ padding: "0 4px", color: "#94a3b8" }}>…</span>}
                            <button
                              type="button"
                              className={`nec-ct-page-btn ${p === collegePage ? "active" : ""}`}
                              onClick={() => setCollegePage(p)}
                            >
                              {p}
                            </button>
                          </React.Fragment>
                        );
                      })}

                    <button
                      type="button"
                      className="nec-ct-page-btn"
                      disabled={collegePage >= totalCollegePages}
                      onClick={() => setCollegePage((p) => Math.min(totalCollegePages, p + 1))}
                      title="Next Page"
                    >
                      <ChevronRight size={16} />
                    </button>
                    <button
                      type="button"
                      className="nec-ct-page-btn"
                      disabled={collegePage >= totalCollegePages}
                      onClick={() => setCollegePage(totalCollegePages)}
                      title="Last Page"
                    >
                      <ChevronsRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            TAB 2: DEPARTMENT-WISE TEAMS WITH SPORTS CATEGORY & FILTERS
           ════════════════════════════════════════════════════════════════════ */}
        {activeTab === "dept-teams" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Toolbar: Search, Filters & Reset */}
            <div className="nec-ct-toolbar-card">
              <div className="nec-ct-toolbar-row">
                <div className="nec-ct-search-box">
                  <Search size={16} className="nec-ct-search-icon" />
                  <input
                    type="text"
                    className="nec-ct-search-input"
                    placeholder="Search by team, sport, category, captain..."
                    value={teamSearch}
                    onChange={(e) => {
                      setTeamSearch(e.target.value);
                      setTeamCurrentPage(1);
                    }}
                  />
                </div>

                <div className="nec-ct-filter-group">
                  <select
                    className="nec-ct-select"
                    value={filterDept}
                    onChange={(e) => {
                      setFilterDept(e.target.value);
                      setTeamCurrentPage(1);
                    }}
                    title="Filter by Department"
                  >
                    <option value="ALL">All Departments</option>
                    {departments.map((d) => (
                      <option key={d.id || d.code} value={d.code || d.name}>
                        {d.code} - {d.name}
                      </option>
                    ))}
                  </select>

                  <select
                    className="nec-ct-select"
                    value={filterCategory}
                    onChange={(e) => {
                      setFilterCategory(e.target.value);
                      setTeamCurrentPage(1);
                    }}
                    title="Filter by Sports Category"
                  >
                    <option value="ALL">All Categories</option>
                    {availableCategories.map((c) => (
                      <option key={c} value={c}>
                        Category: {c}
                      </option>
                    ))}
                  </select>

                  <select
                    className="nec-ct-select"
                    value={filterSport}
                    onChange={(e) => {
                      setFilterSport(e.target.value);
                      setTeamCurrentPage(1);
                    }}
                    title="Filter by Sport"
                  >
                    <option value="ALL">All Sports</option>
                    {sports.map((s) => (
                      <option key={s.sport_id || s.id} value={s.sport_id || s.id}>
                        {s.name} ({s.category || "Open"})
                      </option>
                    ))}
                  </select>

                  <select
                    className="nec-ct-select"
                    value={filterStatus}
                    onChange={(e) => {
                      setFilterStatus(e.target.value);
                      setTeamCurrentPage(1);
                    }}
                    title="Filter by Status"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="Approved">Approved</option>
                    <option value="Pending">Pending</option>
                    <option value="Disqualified">Disqualified</option>
                  </select>

                  {(teamSearch || filterDept !== "ALL" || filterCategory !== "ALL" || filterSport !== "ALL" || filterStatus !== "ALL") && (
                    <button
                      type="button"
                      className="nec-ct-reset-btn"
                      onClick={resetTeamFilters}
                      title="Reset all search and filter conditions"
                    >
                      <RotateCcw size={14} />
                      <span>Reset</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Active Filter Chips */}
              {(filterDept !== "ALL" || filterCategory !== "ALL" || filterSport !== "ALL" || filterStatus !== "ALL" || teamSearch) && (
                <div className="nec-ct-active-chips">
                  <span className="nec-ct-chip-label">Active Filters:</span>
                  {filterDept !== "ALL" && (
                    <span className="nec-ct-chip">
                      Dept: {filterDept}
                      <button type="button" className="nec-ct-chip-remove" onClick={() => setFilterDept("ALL")}>
                        <X size={12} />
                      </button>
                    </span>
                  )}
                  {filterCategory !== "ALL" && (
                    <span className="nec-ct-chip">
                      Category: {filterCategory}
                      <button type="button" className="nec-ct-chip-remove" onClick={() => setFilterCategory("ALL")}>
                        <X size={12} />
                      </button>
                    </span>
                  )}
                  {filterSport !== "ALL" && (
                    <span className="nec-ct-chip">
                      Sport: {sportsMap[filterSport]?.name || filterSport}
                      <button type="button" className="nec-ct-chip-remove" onClick={() => setFilterSport("ALL")}>
                        <X size={12} />
                      </button>
                    </span>
                  )}
                  {filterStatus !== "ALL" && (
                    <span className="nec-ct-chip">
                      Status: {filterStatus}
                      <button type="button" className="nec-ct-chip-remove" onClick={() => setFilterStatus("ALL")}>
                        <X size={12} />
                      </button>
                    </span>
                  )}
                  {teamSearch && (
                    <span className="nec-ct-chip">
                      Query: "{teamSearch}"
                      <button type="button" className="nec-ct-chip-remove" onClick={() => setTeamSearch("")}>
                        <X size={12} />
                      </button>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Department Teams Table */}
            {filteredTeams.length === 0 ? (
              <div className="nec-card" style={{ padding: "40px 20px" }}>
                <EmptyState
                  title="No Department Teams Found"
                  message="No teams match your selected department, sports category, or search filters."
                />
              </div>
            ) : (
              <div className="nec-card" style={{ padding: 0, overflow: "hidden" }}>
                <div className="nec-table-responsive-wrapper">
                  <table className="nec-table">
                    <thead>
                      <tr>
                        <th style={{ width: "130px" }}>Department</th>
                        <th>Team Name</th>
                        <th style={{ width: "150px" }}>Sport</th>
                        <th style={{ width: "150px" }}>Sports Category</th>
                        <th style={{ width: "170px" }}>Team Captain</th>
                        <th style={{ width: "110px", textAlign: "center" }}>Squad Size</th>
                        <th style={{ width: "120px" }}>Status</th>
                        <th style={{ width: "130px", textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedTeams.map((team) => {
                        const sportObj = sportsMap[team.sportId || team.sport_id];
                        const cat = team.sportCategory || sportObj?.category || "Open";
                        const sportType = team.sportType || sportObj?.sport_type;
                        const isApproved = (team.status || "Approved").toLowerCase() === "approved";
                        const isDisqualified = (team.status || "").toLowerCase() === "disqualified";

                        return (
                          <tr key={team.team_id || team.id}>
                            <td>
                              <span className="nec-dept-pill">
                                {team.deptCode || "NEC"}
                              </span>
                              <div style={{ fontSize: "0.75rem", color: "var(--nec-text-muted, #64748b)", marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "120px" }}>
                                {team.deptName || team.department || "Engineering"}
                              </div>
                            </td>

                            <td>
                              <strong style={{ fontSize: "0.94rem", color: "var(--nec-text-main, #0f172a)" }}>
                                {team.name}
                              </strong>
                              {team.tournamentName && (
                                <div style={{ fontSize: "0.76rem", color: "var(--nec-text-muted, #64748b)", marginTop: "2px" }}>
                                  🏆 {team.tournamentName}
                                </div>
                              )}
                            </td>

                            <td>
                              <div style={{ fontWeight: 600, color: "var(--nec-text-main, #0f172a)" }}>
                                {team.sportName || sportObj?.name || "Sport"}
                              </div>
                            </td>

                            <td>
                              {renderCategoryBadge(cat, sportType)}
                            </td>

                            <td>
                              {team.captainName ? (
                                <div>
                                  <div style={{ fontWeight: 600, color: "var(--nec-primary, #0056b3)", fontSize: "0.88rem" }}>
                                    {team.captainName}
                                  </div>
                                  <div style={{ fontSize: "0.76rem", color: "var(--nec-text-muted, #64748b)" }}>
                                    {team.captainRoll || "N/A"}
                                  </div>
                                </div>
                              ) : (
                                <span style={{ fontStyle: "italic", color: "var(--nec-text-muted, #94a3b8)", fontSize: "0.84rem" }}>
                                  Unassigned
                                </span>
                              )}
                            </td>

                            <td style={{ textAlign: "center" }}>
                              <span style={{
                                display: "inline-block",
                                padding: "2px 8px",
                                borderRadius: "12px",
                                fontSize: "0.8rem",
                                fontWeight: 600,
                                background: "rgba(100, 116, 139, 0.1)",
                                color: "var(--nec-text-main, #334155)"
                              }}>
                                {team.memberCount || 0} Players
                              </span>
                            </td>

                            <td>
                              <Badge status={isApproved ? "success" : isDisqualified ? "danger" : "warning"}>
                                {team.status || "Approved"}
                              </Badge>
                            </td>

                            <td style={{ textAlign: "right" }}>
                              <Button
                                variant="outline"
                                size="sm"
                                icon={Eye}
                                onClick={() => handleViewRoster(team)}
                                title="View registered player roster"
                              >
                                Roster
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="nec-ct-pagination-bar">
                  <div className="nec-ct-page-size-selector">
                    <span>Show</span>
                    <select
                      className="nec-ct-page-size-select"
                      value={teamPageSize}
                      onChange={(e) => {
                        setTeamPageSize(Number(e.target.value));
                        setTeamCurrentPage(1);
                      }}
                    >
                      <option value={5}>5</option>
                      <option value={8}>8</option>
                      <option value={12}>12</option>
                      <option value={20}>20</option>
                    </select>
                    <span>per page • Showing {Math.min((teamCurrentPage - 1) * teamPageSize + 1, filteredTeams.length)} - {Math.min(teamCurrentPage * teamPageSize, filteredTeams.length)} of {filteredTeams.length} teams</span>
                  </div>

                  <div className="nec-ct-pagination-controls">
                    <button
                      type="button"
                      className="nec-ct-page-btn"
                      disabled={teamCurrentPage <= 1}
                      onClick={() => setTeamCurrentPage(1)}
                      title="First Page"
                    >
                      <ChevronsLeft size={16} />
                    </button>
                    <button
                      type="button"
                      className="nec-ct-page-btn"
                      disabled={teamCurrentPage <= 1}
                      onClick={() => setTeamCurrentPage((p) => Math.max(1, p - 1))}
                      title="Previous Page"
                    >
                      <ChevronLeft size={16} />
                    </button>

                    {Array.from({ length: totalTeamPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalTeamPages || Math.abs(p - teamCurrentPage) <= 2)
                      .map((p, idx, arr) => {
                        const showEllipsisBefore = idx > 0 && p - arr[idx - 1] > 1;
                        return (
                          <React.Fragment key={p}>
                            {showEllipsisBefore && <span style={{ padding: "0 4px", color: "#94a3b8" }}>…</span>}
                            <button
                              type="button"
                              className={`nec-ct-page-btn ${p === teamCurrentPage ? "active" : ""}`}
                              onClick={() => setTeamCurrentPage(p)}
                            >
                              {p}
                            </button>
                          </React.Fragment>
                        );
                      })}

                    <button
                      type="button"
                      className="nec-ct-page-btn"
                      disabled={teamCurrentPage >= totalTeamPages}
                      onClick={() => setTeamCurrentPage((p) => Math.min(totalTeamPages, p + 1))}
                      title="Next Page"
                    >
                      <ChevronRight size={16} />
                    </button>
                    <button
                      type="button"
                      className="nec-ct-page-btn"
                      disabled={teamCurrentPage >= totalTeamPages}
                      onClick={() => setTeamCurrentPage(totalTeamPages)}
                      title="Last Page"
                    >
                      <ChevronsRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            TAB 3: ADD NEW COLLEGE TEAM (BUILDER)
           ════════════════════════════════════════════════════════════════════ */}
        {activeTab === "builder" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {builderError && (
              <div style={{ color: "#d9534f", backgroundColor: "#fdf7f7", padding: "12px 16px", borderRadius: "8px", border: "1px solid #d9534f", display: "flex", alignItems: "center", gap: "8px" }}>
                <AlertCircle size={18} />
                <span>{builderError}</span>
              </div>
            )}

            {builderSuccess && (
              <div style={{ color: "#155724", backgroundColor: "#d4edda", padding: "12px 16px", borderRadius: "8px", border: "1px solid #c3e6cb", display: "flex", alignItems: "center", gap: "8px" }}>
                <CheckCircle2 size={18} />
                <span>{builderSuccess}</span>
              </div>
            )}

            {/* Sport & Team Name Setup Card */}
            <div className="nec-card" style={{ padding: "20px 24px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "14px" }}>
                  <label style={{ fontWeight: 600, fontSize: "0.95rem", minWidth: "180px", color: "var(--nec-text-main, #0f172a)" }}>
                    Select Sport Discipline:
                  </label>
                  <select
                    className="nec-ct-select"
                    style={{ minWidth: "320px", flex: "1 1 280px" }}
                    value={selectedSportId}
                    onChange={(e) => handleSportSelect(e.target.value)}
                  >
                    <option value="">-- Choose Sport Discipline --</option>
                    {sports.map((s) => (
                      <option key={s.sport_id || s.id} value={s.sport_id || s.id}>
                        {s.name} ({s.category || "Open"} • {s.sport_type || "Team"})
                      </option>
                    ))}
                  </select>

                  {selectedSportId && sportsMap[selectedSportId] && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "0.85rem", color: "var(--nec-text-muted, #64748b)" }}>Discipline Details:</span>
                      {renderCategoryBadge(sportsMap[selectedSportId].category, sportsMap[selectedSportId].sport_type)}
                    </div>
                  )}
                </div>

                {selectedSportId && (
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "14px" }}>
                    <label style={{ fontWeight: 600, fontSize: "0.95rem", minWidth: "180px", color: "var(--nec-text-main, #0f172a)" }}>
                      College Team Name:
                    </label>
                    <input
                      type="text"
                      className="nec-ct-search-input"
                      style={{ paddingLeft: "14px", flex: "1 1 320px" }}
                      placeholder="e.g. NEC Cricket Varsity Team A"
                      value={customTeamName}
                      onChange={(e) => setCustomTeamName(e.target.value)}
                    />
                    <span style={{ fontSize: "0.8rem", color: "var(--nec-text-muted, #64748b)" }}>
                      (You can create multiple squads or customize the title)
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Candidates Listing */}
            {selectedSportId ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {/* Candidates Search & Dept Filter */}
                <div className="nec-ct-toolbar-card">
                  <div className="nec-ct-toolbar-row">
                    <div className="nec-ct-search-box">
                      <Search size={16} className="nec-ct-search-icon" />
                      <input
                        type="text"
                        className="nec-ct-search-input"
                        placeholder="Search candidate athletes by name, register #, dept..."
                        value={builderSearch}
                        onChange={(e) => {
                          setBuilderSearch(e.target.value);
                          setBuilderPage(1);
                        }}
                      />
                    </div>

                    <div className="nec-ct-filter-group">
                      <select
                        className="nec-ct-select"
                        value={builderDeptFilter}
                        onChange={(e) => {
                          setBuilderDeptFilter(e.target.value);
                          setBuilderPage(1);
                        }}
                      >
                        <option value="ALL">All Source Departments</option>
                        {departments.map((d) => (
                          <option key={d.id || d.code} value={d.code || d.name}>
                            {d.code} - {d.name}
                          </option>
                        ))}
                      </select>

                      <div style={{ display: "flex", gap: "8px" }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleAllSuggestions(true)}
                        >
                          Select All
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleAllSuggestions(false)}
                        >
                          Deselect All
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {fetchingSuggestions ? (
                  <div className="nec-card" style={{ padding: "30px" }}>
                    <SkeletonLoader rows={6} />
                  </div>
                ) : filteredSuggestions.length === 0 ? (
                  <div className="nec-card" style={{ padding: "40px 20px" }}>
                    <EmptyState
                      title="No Candidate Squad Members Found"
                      message="No active department squad members or match attendees found for this sport. Ensure department captains have registered players."
                    />
                  </div>
                ) : (
                  <div className="nec-card" style={{ padding: 0, overflow: "hidden" }}>
                    <div className="nec-table-responsive-wrapper">
                      <table className="nec-table">
                        <thead>
                          <tr>
                            <th style={{ width: "60px", textAlign: "center" }}>
                              <input
                                type="checkbox"
                                aria-label="Select all candidate players"
                                checked={
                                  paginatedSuggestions.length > 0 &&
                                  paginatedSuggestions.every((p) => selectedPlayersMap[p.student_id])
                                }
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setSelectedPlayersMap((prev) => {
                                    const next = { ...prev };
                                    paginatedSuggestions.forEach((p) => {
                                      next[p.student_id] = checked;
                                    });
                                    return next;
                                  });
                                }}
                              />
                            </th>
                            <th style={{ width: "110px" }}>Student ID</th>
                            <th>Student Athlete</th>
                            <th style={{ width: "130px" }}>Register #</th>
                            <th style={{ width: "160px" }}>Department</th>
                            <th style={{ width: "150px" }}>Sports Category</th>
                            <th style={{ width: "140px", textAlign: "center" }}>Matches Played</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedSuggestions.map((p) => {
                            const isChecked = Boolean(selectedPlayersMap[p.student_id]);
                            const sportObj = sportsMap[selectedSportId];
                            const cat = p.sport_category || sportObj?.category || "Open";

                            return (
                              <tr
                                key={p.student_id}
                                style={{
                                  backgroundColor: isChecked ? "rgba(0, 86, 179, 0.03)" : "transparent",
                                  cursor: "pointer"
                                }}
                                onClick={() => handleTogglePlayer(p.student_id)}
                              >
                                <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleTogglePlayer(p.student_id)}
                                  />
                                </td>
                                <td>
                                  <span style={{ fontFamily: "monospace", fontSize: "0.85rem", color: "#64748b" }}>
                                    #{p.student_id}
                                  </span>
                                </td>
                                <td>
                                  <strong style={{ fontSize: "0.92rem", color: "var(--nec-text-main, #0f172a)" }}>
                                    {p.name}
                                  </strong>
                                </td>
                                <td>
                                  <span style={{ fontSize: "0.86rem", color: "var(--nec-text-muted, #64748b)" }}>
                                    {p.register_number || "N/A"}
                                  </span>
                                </td>
                                <td>
                                  <span className="nec-dept-pill">
                                    {p.source_department_code || "DEPT"}
                                  </span>
                                  <div style={{ fontSize: "0.74rem", color: "var(--nec-text-muted, #64748b)", marginTop: "2px" }}>
                                    {p.source_department_name}
                                  </div>
                                </td>
                                <td>
                                  {renderCategoryBadge(cat, sportObj?.sport_type)}
                                </td>
                                <td style={{ textAlign: "center" }}>
                                  <span style={{
                                    display: "inline-block",
                                    padding: "2px 8px",
                                    borderRadius: "10px",
                                    fontSize: "0.82rem",
                                    fontWeight: 700,
                                    background: (p.attendance_count || 0) > 0 ? "rgba(16, 185, 129, 0.12)" : "rgba(100, 116, 139, 0.1)",
                                    color: (p.attendance_count || 0) > 0 ? "#059669" : "#64748b"
                                  }}>
                                    {p.attendance_count || 0} matches
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Builder Pagination & Confirmation Footer */}
                    <div className="nec-ct-pagination-bar" style={{ borderRadius: 0, borderLeft: "none", borderRight: "none", borderBottom: "none" }}>
                      <div className="nec-ct-page-size-selector">
                        <span>Showing {Math.min((builderPage - 1) * builderPageSize + 1, filteredSuggestions.length)} - {Math.min(builderPage * builderPageSize, filteredSuggestions.length)} of {filteredSuggestions.length} candidate athletes</span>
                      </div>
                      <div className="nec-ct-pagination-controls">
                        <button
                          type="button"
                          className="nec-ct-page-btn"
                          disabled={builderPage <= 1}
                          onClick={() => setBuilderPage((p) => Math.max(1, p - 1))}
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <span style={{ fontSize: "0.85rem", padding: "0 8px", fontWeight: 600 }}>
                          Page {builderPage} of {totalBuilderPages}
                        </span>
                        <button
                          type="button"
                          className="nec-ct-page-btn"
                          disabled={builderPage >= totalBuilderPages}
                          onClick={() => setBuilderPage((p) => Math.min(totalBuilderPages, p + 1))}
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>

                    <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--nec-border, #e2e8f0)", background: "var(--nec-bg-subtle, #f8fafc)" }}>
                      <div style={{ fontSize: "0.88rem", color: "var(--nec-text-muted, #64748b)" }}>
                        Selected: <strong style={{ color: "var(--nec-primary, #0056b3)" }}>{Object.values(selectedPlayersMap).filter(Boolean).length}</strong> candidate athletes
                      </div>
                      <Button
                        variant="primary"
                        icon={ShieldCheck}
                        onClick={handleConfirmTeam}
                        loading={submittingTeam}
                      >
                        {submittingTeam ? "Confirming & Adding Squad..." : "Confirm & Save College Team"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="nec-card" style={{ padding: "40px 20px", textAlign: "center" }}>
                <Trophy size={48} style={{ color: "#94a3b8", marginBottom: "12px" }} />
                <h3 style={{ margin: "0 0 6px 0", color: "var(--nec-text-main, #0f172a)" }}>
                  Choose a Sport to Begin Team Assembly
                </h3>
                <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--nec-text-muted, #64748b)" }}>
                  Select a sport discipline above to view candidate athletes suggested from department squads.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            ROSTER VIEW MODAL (Department Team / Selected College Squad)
           ════════════════════════════════════════════════════════════════════ */}
        {rosterModalOpen && modalTarget && (
          <Modal
            isOpen={rosterModalOpen}
            onClose={() => setRosterModalOpen(false)}
            title={modalTarget.title}
            size="lg"
            footer={
              <Button variant="secondary" onClick={() => setRosterModalOpen(false)}>
                Close
              </Button>
            }
          >
            <div>
              {/* Modal Subheader Details */}
              <div className="nec-ct-roster-header">
                <div>
                  <div className="nec-ct-roster-team-title">{modalTarget.title}</div>
                  <div style={{ fontSize: "0.82rem", color: "var(--nec-text-muted, #64748b)", marginTop: "2px" }}>
                    {modalTarget.subtitle}
                  </div>
                </div>
                <div className="nec-ct-roster-tags">
                  <span className="nec-dept-pill">{modalTarget.dept}</span>
                  {renderCategoryBadge(modalTarget.category)}
                  <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--nec-text-main, #334155)" }}>
                    {modalTarget.sport}
                  </span>
                </div>
              </div>

              {rosterError && (
                <div style={{ color: "#d9534f", backgroundColor: "#fdf7f7", padding: "10px", borderRadius: "6px", marginBottom: "12px", border: "1px solid #d9534f" }}>
                  {rosterError}
                </div>
              )}

              {rosterLoading ? (
                <SkeletonLoader rows={4} />
              ) : rosterList.length === 0 ? (
                <EmptyState
                  title="No Athletes Registered"
                  message="No player records have been attached to this squad roster yet."
                />
              ) : (
                <div className="nec-table-responsive-wrapper">
                  <table className="nec-table">
                    <thead>
                      <tr>
                        <th style={{ width: "60px" }}>#</th>
                        <th>Athlete Name</th>
                        <th style={{ width: "130px" }}>Register #</th>
                        <th style={{ width: "130px" }}>Department</th>
                        <th style={{ width: "120px" }}>Role / Position</th>
                        <th style={{ width: "80px", textAlign: "center" }}>Year</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rosterList.map((player, idx) => (
                        <tr key={player.member_id || player.id || player.student_id || idx}>
                          <td style={{ color: "#94a3b8", fontSize: "0.85rem" }}>{idx + 1}</td>
                          <td>
                            <strong style={{ color: "var(--nec-text-main, #0f172a)" }}>
                              {player.student_name || player.name || player.username}
                            </strong>
                          </td>
                          <td>
                            <span style={{ fontSize: "0.85rem", color: "var(--nec-text-muted, #64748b)" }}>
                              {player.register_number || player.rollNo || "N/A"}
                            </span>
                          </td>
                          <td>
                            <span className="nec-dept-pill">
                              {player.dept_code || player.department_code || player.dept || modalTarget.dept}
                            </span>
                          </td>
                          <td>
                            <span style={{
                              fontWeight: player.role === "Captain" ? 700 : 500,
                              color: player.role === "Captain" ? "var(--nec-primary, #0056b3)" : "inherit",
                              fontSize: "0.85rem"
                            }}>
                              {player.role || player.position || "Athlete"}
                            </span>
                          </td>
                          <td style={{ textAlign: "center", fontSize: "0.85rem", color: "var(--nec-text-muted, #64748b)" }}>
                            {player.year || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}
