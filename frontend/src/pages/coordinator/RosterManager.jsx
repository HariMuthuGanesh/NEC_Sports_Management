import React, { useEffect, useState } from "react";
import { playersApi, studentLookupApi, teamsApi, sportsApi } from "../../services/api/apiServices";
import { useAuth } from "../../context/AuthContext";
import Table from "../../components/common/Table";
import Button from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import SearchableSelect from "../../components/common/SearchableSelect";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import { UserPlus, Search, Trash2, Shield, Plus, Edit, AlertCircle, CheckCircle2 } from "lucide-react";
import "./CoordinatorPortal.css";

export default function RosterManager() {
  const { currentUser } = useAuth();
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Team CRUD State
  const [sports, setSports] = useState([]);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isEditingTeam, setIsEditingTeam] = useState(false);
  const [teamFormSubmitting, setTeamFormSubmitting] = useState(false);
  const [teamFormError, setTeamFormError] = useState(null);
  const [teamFormSuccess, setTeamFormSuccess] = useState(null);
  const initialTeamForm = { name: "", sport_id: "", coachName: "", jerseyColor: "" };
  const [teamForm, setTeamForm] = useState(initialTeamForm);

  // Student Search Modal State
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Add to squad form state
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [position, setPosition] = useState("");
  const [jerseyNo, setJerseyNo] = useState("");

  const loadTeams = () => {
    teamsApi.getTeams().then(tList => {
      const myDept = currentUser.dept || currentUser.deptCode;
      const list = Array.isArray(tList) ? tList : [];
      const filtered = (myDept && myDept !== "All" && myDept !== "Sports Office")
        ? list.filter(t => (t.deptCode || t.dept_code || t.dept || "").toUpperCase() === myDept.toUpperCase())
        : list;
      setTeams(filtered);
      if (filtered.length > 0) {
        setSelectedTeamId(prev => {
          if (prev && filtered.find(t => String(t.id || t.team_id) === String(prev))) return prev;
          return filtered[0].id || filtered[0].team_id;
        });
      } else {
        setSelectedTeamId("");
        setPlayers([]);
      }
    });
  };

  useEffect(() => {
    loadTeams();
    sportsApi.getSports().then(res => setSports(res || [])).catch(console.error);
  }, [currentUser]);

  useEffect(() => {
    if (selectedTeamId) {
      loadRoster(selectedTeamId);
    }
  }, [selectedTeamId]);

  const handleOpenTeamModal = (isEdit = false) => {
    setTeamFormError(null);
    setTeamFormSuccess(null);
    setIsEditingTeam(isEdit);
    
    if (isEdit && selectedTeamId) {
      const team = teams.find(t => String(t.id || t.team_id) === String(selectedTeamId));
      if (team) {
        setTeamForm({
          name: team.name || "",
          sport_id: team.sportId || team.sport_id || "",
          coachName: team.coachName || team.coach_name || "",
          jerseyColor: team.jerseyColor || team.jersey_color || ""
        });
      }
    } else {
      setTeamForm({ ...initialTeamForm, sport_id: sports[0]?.sport_id || "" });
    }
    setIsTeamModalOpen(true);
  };

  const handleTeamSubmit = async (e) => {
    e.preventDefault();
    if (!teamForm.name.trim() || !teamForm.sport_id) {
      setTeamFormError("Team name and sport are required.");
      return;
    }
    setTeamFormSubmitting(true);
    setTeamFormError(null);

    try {
      if (isEditingTeam) {
        await teamsApi.updateTeam(selectedTeamId, {
          name: teamForm.name.trim(),
          sport_id: teamForm.sport_id,
          coach_name: teamForm.coachName?.trim() || null,
          jersey_color: teamForm.jerseyColor?.trim() || null
        });
        setTeamFormSuccess("Team updated successfully.");
      } else {
        const myDept = currentUser.dept || currentUser.deptCode;
        await teamsApi.registerTeam({
          name: teamForm.name.trim(),
          department: myDept,
          deptCode: myDept,
          sport_id: teamForm.sport_id,
          coach_name: teamForm.coachName?.trim() || null,
          jersey_color: teamForm.jerseyColor?.trim() || null,
          status: "Approved"
        });
        setTeamFormSuccess("Team registered successfully.");
      }
      setTimeout(() => {
        setIsTeamModalOpen(false);
        setTeamFormSuccess(null);
        loadTeams();
      }, 750);
    } catch (err) {
      console.error(err);
      setTeamFormError(err.message || `Failed to ${isEditingTeam ? 'update' : 'register'} team.`);
    } finally {
      setTeamFormSubmitting(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (!selectedTeamId) return;
    const team = teams.find(t => String(t.id || t.team_id) === String(selectedTeamId));
    if (!window.confirm(`Are you sure you want to delete the team "${team?.name}" and its entire roster? This cannot be undone.`)) return;
    
    try {
      await teamsApi.deleteTeam(selectedTeamId);
      loadTeams();
    } catch (err) {
      alert(err.message || "Failed to delete team");
    }
  };

  const loadRoster = (teamId) => {
    setLoading(true);
    setError(null);
    playersApi.getPlayersByTeam(teamId).then(pList => {
      setPlayers(pList);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setError(err.message);
      setLoading(false);
    });
  };

  const handleSearchStudent = () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    studentLookupApi.searchStudent(searchQuery).then(res => {
      setSearchResults(res);
      setSearching(false);
    });
  };

  const handleAddPlayer = (e) => {
    e.preventDefault();
    if (!selectedStudent || !selectedTeamId) return;

    playersApi.addPlayerToTeam(selectedTeamId, {
      studentId: selectedStudent.studentId,
      name: selectedStudent.name,
      dept: selectedStudent.dept,
      year: selectedStudent.year,
      position: position || "Player",
      jerseyNo: jerseyNo || "0"
    }).then(() => {
      setSelectedStudent(null);
      setSearchModalOpen(false);
      setSearchQuery("");
      setSearchResults([]);
      loadRoster(selectedTeamId);
    });
  };

  const handleRemove = (playerId) => {
    playersApi.removePlayer(playerId).then(() => {
      loadRoster(selectedTeamId);
    });
  };

  const columns = [
    { key: "studentId", label: "Student ID (NEC IMS)", width: "140px", render: (val) => <strong>{val}</strong> },
    { key: "name", label: "Student Athlete", render: (val, row) => <div><strong>{val}</strong><br/><small style={{color: 'var(--nec-text-muted)'}}>{row.dept} • {row.year}</small></div> },
    { key: "position", label: "Field Position", width: "130px" },
    { key: "jerseyNo", label: "Jersey #", width: "100px", render: (val) => <span>#{val}</span> },
    { key: "attendancePct", label: "Attendance", width: "120px", render: (val) => <span>{val}% Present</span> },
    {
      key: "actions",
      label: "Actions",
      width: "100px",
      sortable: false,
      render: (_, row) => (
        <Button variant="danger" size="sm" icon={Trash2} onClick={() => handleRemove(row.id)}>
          Remove
        </Button>
      )
    }
  ];

  return (
    <div className="nec-portal-page">
      <div className="nec-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 className="nec-page-title">Department Squad Roster Management</h2>
          <p className="nec-page-desc">Integrated with NEC External Student Information Boundary for verified student entries.</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <Button variant="primary" icon={Plus} onClick={() => handleOpenTeamModal(false)}>
            Register New Team
          </Button>
          <Button variant="outline" icon={UserPlus} onClick={() => setSearchModalOpen(true)} disabled={!selectedTeamId}>
            Add Student Athlete
          </Button>
        </div>
      </div>

      {/* Team Selection Bar */}
      <div className="nec-card" style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: "16px", overflow: "visible", position: "relative", zIndex: 20 }}>
        <label style={{ fontWeight: 600, color: "var(--nec-text-main)", whiteSpace: "nowrap", margin: 0, flexShrink: 0 }}>
          Select Department Team Roster:
        </label>
        <div style={{ flex: "0 1 480px", width: "100%", maxWidth: "480px", position: "relative" }}>
          <SearchableSelect
            options={teams}
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            getValue={(t) => t.id || t.team_id}
            getLabel={(t) => t.name}
            getSearchText={(t) => `${t.name} ${t.deptCode || t.dept_code || ""} ${t.sportName || t.sportId || ""}`}
            placeholder="-- Select Department Team Roster --"
            searchPlaceholder="Search team, dept, or sport..."
            clearable={false}
            renderOption={(t) => (
              <div className="nec-select-team-option">
                <span className="nec-select-team-name">{t.name}</span>
                <div className="nec-select-chips">
                  {(t.deptCode || t.dept_code) && (
                    <span className="nec-chip nec-chip-dept">{t.deptCode || t.dept_code}</span>
                  )}
                  {(t.sportName || t.sportId) && (
                    <span className="nec-chip nec-chip-sport">
                      {String(t.sportName || t.sportId).replace("sp_", "").toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
            )}
            renderSelected={(t) => (
              <div className="nec-select-selected-wrap">
                <span style={{ fontWeight: 600 }}>{t.name}</span>
                {(t.deptCode || t.dept_code) && (
                  <span className="nec-chip nec-chip-dept">{t.deptCode || t.dept_code}</span>
                )}
                {(t.sportName || t.sportId) && (
                  <span className="nec-chip nec-chip-sport">
                    {String(t.sportName || t.sportId).replace("sp_", "").toUpperCase()}
                  </span>
                )}
              </div>
            )}
          />
        </div>
        {selectedTeamId && (
          <div style={{ display: "flex", gap: "8px", marginLeft: "auto" }}>
            <Button variant="ghost" size="sm" icon={Edit} onClick={() => handleOpenTeamModal(true)}>
              Edit
            </Button>
            <Button variant="danger" size="sm" icon={Trash2} onClick={handleDeleteTeam}>
              Delete
            </Button>
          </div>
        )}
      </div>

      {error ? (
        <div style={{ padding: "40px" }}>
          <ErrorState onRetry={() => loadRoster(selectedTeamId)} />
        </div>
      ) : (
        <Table
          columns={columns}
          data={players}
          loading={loading}
          searchPlaceholder="Search athlete by roll no or name..."
          emptyMessage="No players found in this team's roster."
        />
      )}

      {/* External Student Lookup Modal */}
      <Modal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        title="Search Student in NEC Information System"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div className="nec-student-search-box">
            <input
              type="text"
              className="nec-table-search-input"
              style={{ maxWidth: "100%" }}
              placeholder="Enter Student ID (e.g. 2112045) or Student Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button variant="primary" icon={Search} onClick={handleSearchStudent} loading={searching}>
              Search IMS
            </Button>
          </div>

          {searchResults.length > 0 && !selectedStudent && (
            <div className="nec-student-results-list">
              <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--nec-text-muted)" }}>Search Results from NEC IMS:</span>
              {searchResults.map(s => (
                <div key={s.studentId} className="nec-student-result-card">
                  <div className="nec-sr-info">
                    <span className="nec-sr-name">{s.name} ({s.studentId})</span>
                    <span className="nec-sr-sub">{s.dept} • {s.year} | {s.email}</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setSelectedStudent(s)}>
                    Select Student
                  </Button>
                </div>
              ))}
            </div>
          )}

          {selectedStudent && (
            <form onSubmit={handleAddPlayer} style={{ display: "flex", flexDirection: "column", gap: "12px", borderTop: "1px solid var(--nec-border)", paddingTop: "14px" }}>
              <div style={{ background: "var(--nec-surface-raised)", padding: "10px 14px", borderRadius: "8px" }}>
                <strong>Selected Athlete:</strong> {selectedStudent.name} ({selectedStudent.studentId}) — {selectedStudent.dept}
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>Field Position / Role</label>
                <input
                  type="text"
                  required
                  className="nec-table-search-input"
                  style={{ maxWidth: "100%" }}
                  placeholder="e.g. Forward, Midfielder, All-Rounder, Sprinter"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>Jersey Number</label>
                <input
                  type="text"
                  required
                  className="nec-table-search-input"
                  style={{ maxWidth: "100%" }}
                  placeholder="e.g. 10"
                  value={jerseyNo}
                  onChange={(e) => setJerseyNo(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                <Button variant="outline" onClick={() => setSelectedStudent(null)}>Change Student</Button>
                <Button type="submit" variant="primary">Add to Roster</Button>
              </div>
            </form>
          )}
        </div>
      </Modal>
      {/* Team Create/Edit Modal */}
      <Modal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        title={isEditingTeam ? "Edit Team Details" : "Register New Team"}
      >
        <form onSubmit={handleTeamSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {teamFormError && (
            <div style={{ background: "var(--nec-danger-bg, #fef2f2)", color: "var(--nec-danger, #ef4444)", padding: "10px 14px", borderRadius: "6px", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "8px" }}>
              <AlertCircle size={16} /><span>{teamFormError}</span>
            </div>
          )}
          {teamFormSuccess && (
            <div style={{ background: "#ecfdf5", color: "#10b981", padding: "10px 14px", borderRadius: "6px", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "8px" }}>
              <CheckCircle2 size={16} /><span>{teamFormSuccess}</span>
            </div>
          )}
          <div>
            <label style={{ display: "block", fontSize: "0.825rem", fontWeight: "600", marginBottom: "4px" }}>Team Name *</label>
            <input type="text" required className="nec-form-control" placeholder="e.g. CS Warriors" value={teamForm.name} onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.825rem", fontWeight: "600", marginBottom: "4px" }}>Sport Discipline *</label>
            <select className="nec-form-control" value={teamForm.sport_id} onChange={(e) => setTeamForm({ ...teamForm, sport_id: e.target.value })}>
              {sports.map(s => <option key={s.sport_id || s.id} value={s.sport_id || s.id}>{s.name} ({s.category || "Outdoor"})</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.825rem", fontWeight: "600", marginBottom: "4px" }}>Staff Coach / In-Charge</label>
              <input type="text" className="nec-form-control" placeholder="e.g. Prof. R. Ramanathan" value={teamForm.coachName} onChange={(e) => setTeamForm({ ...teamForm, coachName: e.target.value })} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.825rem", fontWeight: "600", marginBottom: "4px" }}>Jersey Color</label>
              <input type="text" className="nec-form-control" placeholder="e.g. Navy Blue / Gold" value={teamForm.jerseyColor} onChange={(e) => setTeamForm({ ...teamForm, jerseyColor: e.target.value })} />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <Button variant="outline" type="button" onClick={() => setIsTeamModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={teamFormSubmitting}>
              {teamFormSubmitting ? "Saving…" : isEditingTeam ? "Update Team" : "Create Team"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
