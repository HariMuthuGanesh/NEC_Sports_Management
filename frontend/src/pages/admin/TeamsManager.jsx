import React, { useEffect, useState } from "react";
import { teamsApi, playersApi, sportsApi } from "../../services/api/apiServices";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import ErrorState from "../../components/common/ErrorState";
import { Users, Filter, Plus, Trophy, Calendar, Eye, Activity, CheckCircle2, AlertCircle, X } from "lucide-react";
import "./AdminPortal.css";

export default function TeamsManager() {
  const [teams, setTeams] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Roster Modal
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamRoster, setTeamRoster] = useState([]);
  const [rosterModalOpen, setRosterModalOpen] = useState(false);

  // Register Team Modal
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);

  // Filter State
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("ALL");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  const initialFormState = {
    name: "",
    department: "",
    sport_id: "",
    coachName: "",
    jerseyColor: "",
    status: "Approved"
  };
  const [formData, setFormData] = useState(initialFormState);

  const loadTeams = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      teamsApi.getTeams ? teamsApi.getTeams() : Promise.resolve([]),
      sportsApi.getDepartments ? sportsApi.getDepartments() : Promise.resolve([]),
      sportsApi.getSports ? sportsApi.getSports() : Promise.resolve([])
    ])
      .then(([teamsData, deptsData, sportsData]) => {
        setTeams(Array.isArray(teamsData) ? teamsData : []);
        setDepartments(Array.isArray(deptsData) ? deptsData : []);
        setSports(Array.isArray(sportsData) ? sportsData : []);

        if (Array.isArray(deptsData) && deptsData.length > 0 && !formData.department) {
          setFormData(prev => ({
            ...prev,
            department: deptsData[0].code || "CSE",
            sport_id: sportsData[0]?.sport_id || ""
          }));
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(err.message || "Failed to load teams");
        setLoading(false);
      });
  };

  useEffect(() => {
    loadTeams();
  }, []);

  const handleOpenRegisterModal = () => {
    setFormError(null);
    setFormSuccess(null);
    setFormData({
      ...initialFormState,
      department: departments[0]?.code || "CSE",
      sport_id: sports[0]?.sport_id || ""
    });
    setIsRegisterModalOpen(true);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formError) setFormError(null);
  };

  const handleSubmitTeam = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError("Team name is required.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      await teamsApi.registerTeam({
        name: formData.name.trim(),
        department: formData.department || "CSE",
        deptCode: formData.department || "CSE",
        sport_id: formData.sport_id || sports[0]?.sport_id,
        coach_name: formData.coachName.trim() || null,
        jersey_color: formData.jerseyColor.trim() || null,
        status: formData.status
      });

      setFormSuccess("Team registered successfully.");
      setTimeout(() => {
        setIsRegisterModalOpen(false);
        setFormSuccess(null);
        loadTeams();
      }, 750);
    } catch (err) {
      console.error(err);
      setFormError(err.message || "Failed to register team.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewRoster = (team) => {
    setSelectedTeam(team);
    playersApi.getPlayersByTeam(team.team_id || team.id).then(players => {
      setTeamRoster(players);
      setRosterModalOpen(true);
    }).catch(err => {
      console.error(err);
      alert("Failed to load roster: " + err.message);
    });
  };

  const handleUpdateStatus = (teamId, status) => {
    teamsApi.updateTeamStatus(teamId, status).then(() => {
      loadTeams();
    }).catch(err => {
      alert("Failed to update status: " + err.message);
    });
  };

  // Filtered dataset
  const displayedTeams = selectedDeptFilter === "ALL"
    ? teams
    : teams.filter(t => (t.deptCode || t.deptName || "").toUpperCase() === selectedDeptFilter.toUpperCase());

  const columns = [
    {
      key: "name",
      label: "Team Info",
      render: (val, row) => (
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "42px",
            height: "42px",
            borderRadius: "8px",
            backgroundColor: "var(--nec-surface-raised, #f1f5f9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--nec-navy, #1e3a8a)"
          }}>
            <Trophy size={20} />
          </div>
          <div>
            <strong style={{ fontSize: "0.95rem" }}>{val || row.team_name}</strong>
            <div style={{ fontSize: "0.75rem", color: "var(--nec-text-muted)" }}>
              {row.deptCode || row.deptName} • {row.sportName || "Sport"}
            </div>
          </div>
        </div>
      )
    },
    {
      key: "captainName",
      label: "Leadership",
      render: (val, row) => (
        <div>
          <strong style={{ fontSize: "0.875rem" }}>{val || "Unassigned"}</strong>
          {row.coach_name && (
            <div style={{ fontSize: "0.75rem", color: "var(--nec-text-muted)" }}>
              Coach: {row.coach_name}
            </div>
          )}
        </div>
      )
    },
    {
      key: "status",
      label: "Status",
      width: "120px",
      render: (val) => (
        <Badge status={val === "Approved" ? "success" : "warning"}>
          {val === "Approved" ? "Active ✓" : "Pending"}
        </Badge>
      )
    },
    {
      key: "actions",
      label: "Actions",
      width: "140px",
      sortable: false,
      render: (_, row) => (
        <div style={{ display: "flex", gap: "8px" }}>
          {row.status === "Pending" && (
            <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(row.team_id || row.id, "Approved")}>
              Approve
            </Button>
          )}
          <Button variant="ghost" size="sm" icon={Eye} onClick={() => handleViewRoster(row)}>
            Roster
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="nec-portal-page">
      <div className="nec-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 className="nec-page-title" style={{ fontSize: "1.75rem" }}>Team Catalog &amp; Rosters</h1>
          <p className="nec-page-desc">Oversee active rosters, monitor upcoming fixtures, and manage coaching assignments across all engineering disciplines.</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", position: "relative" }}>
          {/* Department Filter Toggle */}
          <div style={{ position: "relative" }}>
            <Button
              variant={selectedDeptFilter !== "ALL" ? "primary" : "outline"}
              icon={Filter}
              onClick={() => setShowFilterDropdown(prev => !prev)}
            >
              {selectedDeptFilter === "ALL" ? "Filter List" : `Dept: ${selectedDeptFilter}`}
            </Button>

            {showFilterDropdown && (
              <div style={{
                position: "absolute",
                top: "100%",
                right: 0,
                marginTop: "6px",
                background: "var(--nec-surface, #ffffff)",
                border: "1px solid var(--nec-border, #e2e8f0)",
                borderRadius: "8px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                zIndex: 50,
                minWidth: "180px",
                padding: "6px"
              }}>
                <button
                  type="button"
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "8px 12px",
                    borderRadius: "4px",
                    background: selectedDeptFilter === "ALL" ? "var(--nec-surface-raised, #f1f5f9)" : "transparent",
                    fontWeight: selectedDeptFilter === "ALL" ? "600" : "400",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "0.85rem"
                  }}
                  onClick={() => { setSelectedDeptFilter("ALL"); setShowFilterDropdown(false); }}
                >
                  All Departments
                </button>
                {departments.map(d => (
                  <button
                    key={d.id || d.code}
                    type="button"
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "8px 12px",
                      borderRadius: "4px",
                      background: selectedDeptFilter === d.code ? "var(--nec-surface-raised, #f1f5f9)" : "transparent",
                      fontWeight: selectedDeptFilter === d.code ? "600" : "400",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "0.85rem"
                    }}
                    onClick={() => { setSelectedDeptFilter(d.code); setShowFilterDropdown(false); }}
                  >
                    {d.code} - {d.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button variant="primary" icon={Plus} onClick={handleOpenRegisterModal}>
            Register Team
          </Button>
        </div>
      </div>

      {/* Active Filter Indicator */}
      {selectedDeptFilter !== "ALL" && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
          <span style={{ fontSize: "0.825rem", color: "var(--nec-text-muted)" }}>Active Filter:</span>
          <span className="nec-demo-tag" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <strong>{selectedDeptFilter}</strong>
            <button
              type="button"
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}
              onClick={() => setSelectedDeptFilter("ALL")}
              aria-label="Clear filter"
            >
              <X size={12} />
            </button>
          </span>
        </div>
      )}

      {error ? (
        <div style={{ padding: "40px" }}>
          <ErrorState onRetry={loadTeams} />
        </div>
      ) : (
        <>
          <div className="nec-stats-grid">
            <div className="nec-stat-card nec-stat-card-navy">
              <div className="nec-stat-card-top">
                <span className="nec-stat-title">Total Teams</span>
                <div className="nec-stat-icon-wrapper"><Users size={20} /></div>
              </div>
              <div className="nec-stat-value">{teams.length}</div>
              <div className="nec-stat-subtext">Registered this semester</div>
            </div>

            <div className="nec-stat-card nec-stat-card-gold">
              <div className="nec-stat-card-top">
                <span className="nec-stat-title">Pending Approvals</span>
                <div className="nec-stat-icon-wrapper"><Activity size={20} /></div>
              </div>
              <div className="nec-stat-value">{teams.filter(t => t.status === "Pending").length}</div>
              <div className="nec-stat-subtext">Requires attention</div>
            </div>
            
            <div className="nec-stat-card nec-stat-card-navy">
              <div className="nec-stat-card-top">
                <span className="nec-stat-title">Approved Teams</span>
                <div className="nec-stat-icon-wrapper"><Trophy size={20} /></div>
              </div>
              <div className="nec-stat-value">{teams.filter(t => t.status === "Approved").length}</div>
              <div className="nec-stat-subtext">Active for tournaments</div>
            </div>
          </div>

          <Table
            columns={columns}
            data={displayedTeams}
            loading={loading}
            searchPlaceholder="Search teams by name, department, captain..."
            emptyMessage={selectedDeptFilter !== "ALL" ? `No teams found for department ${selectedDeptFilter}.` : "No teams have registered yet. Click '+ Register Team' to create one."}
          />
        </>
      )}

      {/* ── Register Team Modal ── */}
      <Modal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        title="Register New Sports Team"
      >
        <form onSubmit={handleSubmitTeam} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {formError && (
            <div style={{
              background: "var(--nec-danger-bg, #fef2f2)",
              color: "var(--nec-danger, #ef4444)",
              padding: "10px 14px",
              borderRadius: "6px",
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
              <AlertCircle size={16} />
              <span>{formError}</span>
            </div>
          )}

          {formSuccess && (
            <div style={{
              background: "#ecfdf5",
              color: "#10b981",
              padding: "10px 14px",
              borderRadius: "6px",
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
              <CheckCircle2 size={16} />
              <span>{formSuccess}</span>
            </div>
          )}

          <div>
            <label style={{ display: "block", fontSize: "0.825rem", fontWeight: "600", marginBottom: "4px" }}>
              Team Name *
            </label>
            <input
              type="text"
              required
              className="nec-form-control"
              placeholder="e.g. CS Warriors / ECE Hawks"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.825rem", fontWeight: "600", marginBottom: "4px" }}>
                Department *
              </label>
              <select
                className="nec-form-control"
                value={formData.department}
                onChange={(e) => handleInputChange("department", e.target.value)}
              >
                {departments.map(d => (
                  <option key={d.id || d.code} value={d.code}>
                    {d.code} - {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.825rem", fontWeight: "600", marginBottom: "4px" }}>
                Sport Discipline *
              </label>
              <select
                className="nec-form-control"
                value={formData.sport_id}
                onChange={(e) => handleInputChange("sport_id", e.target.value)}
              >
                {sports.map(s => (
                  <option key={s.sport_id} value={s.sport_id}>
                    {s.name} ({s.category || "Outdoor"})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.825rem", fontWeight: "600", marginBottom: "4px" }}>
                Staff Coach / In-Charge
              </label>
              <input
                type="text"
                className="nec-form-control"
                placeholder="e.g. Prof. R. Ramanathan"
                value={formData.coachName}
                onChange={(e) => handleInputChange("coachName", e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.825rem", fontWeight: "600", marginBottom: "4px" }}>
                Jersey Color
              </label>
              <input
                type="text"
                className="nec-form-control"
                placeholder="e.g. Navy Blue / Gold"
                value={formData.jerseyColor}
                onChange={(e) => handleInputChange("jerseyColor", e.target.value)}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.825rem", fontWeight: "600", marginBottom: "4px" }}>
              Initial Status
            </label>
            <select
              className="nec-form-control"
              value={formData.status}
              onChange={(e) => handleInputChange("status", e.target.value)}
            >
              <option value="Approved">Approved (Active immediately)</option>
              <option value="Pending">Pending (Requires review)</option>
            </select>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <Button variant="outline" type="button" onClick={() => setIsRegisterModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? "Registering…" : "Create Team"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── View Roster Modal ── */}
      <Modal
        isOpen={rosterModalOpen}
        onClose={() => setRosterModalOpen(false)}
        title={`Roster Details: ${selectedTeam?.name || ""}`}
      >
        <div>
          <p style={{ margin: "0 0 12px 0", fontSize: "0.875rem", color: "var(--nec-text-muted)" }}>
            Department: <strong>{selectedTeam?.deptCode || selectedTeam?.deptName}</strong> | Sport: <strong>{selectedTeam?.sportName}</strong>
          </p>
          {teamRoster.length === 0 ? (
            <p>No players added to this team roster yet.</p>
          ) : (
            <table className="nec-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Roll / Student ID</th>
                  <th>Student Name</th>
                  <th>Role / Position</th>
                  <th>Jersey #</th>
                </tr>
              </thead>
              <tbody>
                {teamRoster.map(p => (
                  <tr key={p.id || p.member_id}>
                    <td>{p.rollNo || p.register_number || p.studentId}</td>
                    <td><strong>{p.name || p.student_name}</strong></td>
                    <td>{p.role || "Player"}</td>
                    <td>#{p.jersey_number || p.jerseyNo || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Modal>
    </div>
  );
}
