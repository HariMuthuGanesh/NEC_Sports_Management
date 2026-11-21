import React, { useEffect, useState } from "react";
import { teamsApi, playersApi, sportsApi } from "../../services/api/apiServices";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import ErrorState from "../../components/common/ErrorState";
import { Users, Filter, Plus, Trophy, Calendar, Eye, Activity, CheckCircle2, AlertCircle, X, Trash2, Ban, UserCheck, Crown } from "lucide-react";
import "./AdminPortal.css";

export default function TeamsManager() {
  const [teams, setTeams] = useState([]);
  // Merged page: one catalog with status tabs (replaces the separate Team Approvals page).
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [departments, setDepartments] = useState([]);
  const [sports, setSports] = useState([]);
  const [coordinators, setCoordinators] = useState([]);
  const [selectedCoordinator, setSelectedCoordinator] = useState(null);
  const [coordinatorModalOpen, setCoordinatorModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Roster Modal
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamRoster, setTeamRoster] = useState([]);
  const [rosterModalOpen, setRosterModalOpen] = useState(false);
  const [settingCaptain, setSettingCaptain] = useState(false);
  const [selectedCaptainId, setSelectedCaptainId] = useState("");
  const [captainFeedback, setCaptainFeedback] = useState(null);

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
      sportsApi.getSports ? sportsApi.getSports() : Promise.resolve([]),
      sportsApi.getCoordinators ? sportsApi.getCoordinators() : Promise.resolve([])
    ])
      .then(([teamsData, deptsData, sportsData, coordsData]) => {
        setTeams(Array.isArray(teamsData) ? teamsData : []);
        setDepartments(Array.isArray(deptsData) ? deptsData : []);
        setSports(Array.isArray(sportsData) ? sportsData : []);
        setCoordinators(Array.isArray(coordsData?.data || coordsData) ? (coordsData?.data || coordsData) : []);

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

  const handleDeleteTeam = async (teamId) => {
    if (!window.confirm("Delete this team? Teams that already have fixtures are disqualified instead, to keep match history.")) return;
    try {
      const res = await teamsApi.deleteTeam(teamId);
      if (res?.softDeleted) alert(res.message);
      loadTeams();
    } catch (err) {
      alert("Failed to delete team: " + err.message);
    }
  };

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
    setCaptainFeedback(null);
    setSelectedCaptainId("");
    playersApi.getPlayersByTeam(team.team_id || team.id).then(players => {
      setTeamRoster(players);
      const currentCap = players.find(p => p.role === "Captain");
      if (currentCap) {
        setSelectedCaptainId(String(currentCap.student_id || currentCap.studentId || currentCap.member_id));
      }
      setRosterModalOpen(true);
    }).catch(err => {
      console.error(err);
      alert("Failed to load roster: " + err.message);
    });
  };

  const handleSetCaptain = async (studentIdToSet = null) => {
    if (!selectedTeam) return;
    const teamId = selectedTeam.team_id || selectedTeam.id;
    const targetStudentId = studentIdToSet !== null 
      ? studentIdToSet 
      : (selectedCaptainId === "" || selectedCaptainId === "UNASSIGN" ? null : selectedCaptainId);

    try {
      setSettingCaptain(true);
      setCaptainFeedback(null);
      const res = await teamsApi.setTeamCaptain(teamId, targetStudentId);
      
      const updatedRoster = await playersApi.getPlayersByTeam(teamId);
      setTeamRoster(updatedRoster);

      // Refresh catalog and coordinator stats
      loadTeams();

      const newCaptain = updatedRoster.find(p => p.role === "Captain");
      if (newCaptain) {
        setSelectedCaptainId(String(newCaptain.student_id || newCaptain.studentId || newCaptain.member_id));
        setCaptainFeedback({
          type: "success",
          message: res.message || `${newCaptain.name || newCaptain.student_name} is now designated as Captain.`
        });
      } else {
        setSelectedCaptainId("");
        setCaptainFeedback({
          type: "info",
          message: res.message || "Team captain has been unassigned."
        });
      }
    } catch (err) {
      console.error(err);
      setCaptainFeedback({
        type: "error",
        message: err.message || "Failed to update captain."
      });
    } finally {
      setSettingCaptain(false);
    }
  };

  const handleUpdateStatus = (teamId, status) => {
    teamsApi.updateTeamStatus(teamId, status).then(() => {
      loadTeams();
    }).catch(err => {
      alert("Failed to update status: " + err.message);
    });
  };

  // Filtered dataset
  const displayedTeams = teams
    .filter(t => statusFilter === "ALL" || t.status === statusFilter)
    .filter(t => selectedDeptFilter === "ALL"
      || (t.deptCode || t.deptName || "").toUpperCase() === selectedDeptFilter.toUpperCase());

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
        <Badge status={val === "Approved" ? "success" : val === "Disqualified" ? "danger" : "warning"}>
          {val === "Approved" ? "Approved" : val === "Disqualified" ? "Disqualified" : "Pending"}
        </Badge>
      )
    },
    {
      key: "memberCount",
      label: "Team Size",
      width: "135px",
      render: (val, row) => {
        const count = Number(val ?? row.memberCount ?? 0);
        return (
          <div
            style={{ cursor: "pointer" }}
            onClick={() => handleViewRoster(row)}
            title="Click to view team roster"
          >
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 10px",
              borderRadius: "12px",
              fontSize: "0.825rem",
              fontWeight: 700,
              background: count > 0 ? "rgba(30, 58, 138, 0.08)" : "rgba(100, 116, 139, 0.08)",
              color: count > 0 ? "var(--nec-navy, #1e3a8a)" : "var(--nec-text-muted, #64748b)",
              border: `1px solid ${count > 0 ? "rgba(30, 58, 138, 0.15)" : "rgba(100, 116, 139, 0.15)"}`
            }}>
              <Users size={13} />
              {count} {count === 1 ? "Player" : "Players"}
            </span>
          </div>
        );
      }
    },
    {
      key: "actions",
      label: "Actions",
      width: "210px",
      sortable: false,
      render: (_, row) => (
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {row.status !== "Approved" && (
            <Button variant="outline" size="sm" icon={CheckCircle2} aria-label="Approve team" title="Approve team" onClick={() => handleUpdateStatus(row.team_id || row.id, "Approved")} />
          )}
          {row.status !== "Disqualified" && (
            <Button variant="ghost" size="sm" icon={Ban} onClick={() => handleUpdateStatus(row.team_id || row.id, "Disqualified")} aria-label="Disqualify team" title="Disqualify team" />
          )}
          <Button variant="ghost" size="sm" icon={Eye} onClick={() => handleViewRoster(row)}>
            Roster
          </Button>
          <Button
            variant="danger"
            size="sm"
            icon={Trash2}
            onClick={() => handleDeleteTeam(row.team_id || row.id)}
            title="Delete Team"
          >
            Delete
          </Button>
        </div>
      )
    }
  ];

  // ── Coordinator Helpers & Columns ──
  const getTeamsForCoordinator = (coord) => {
    if (!coord) return [];
    const cDeptId = Number(coord.departmentId || coord.department_id);
    const cDeptCode = (coord.departmentCode || coord.department_code || "").toUpperCase();
    return teams.filter(t => {
      const tDeptId = Number(t.department_id || t.deptId || t.dept_id);
      const tDeptCode = (t.deptCode || t.dept_code || t.department || "").toUpperCase();
      return (cDeptId && tDeptId === cDeptId) || (cDeptCode && tDeptCode === cDeptCode);
    });
  };

  const getCaptainsForCoordinator = (coord) => {
    const coordTeams = getTeamsForCoordinator(coord);
    const captains = [];
    const seen = new Set();
    coordTeams.forEach(t => {
      if (t.captainName && !seen.has(t.captainName + (t.captainRoll || ''))) {
        seen.add(t.captainName + (t.captainRoll || ''));
        captains.push({
          name: t.captainName,
          roll: t.captainRoll,
          teamName: t.name,
          sportName: t.sportName
        });
      }
    });
    return captains;
  };

  const handleOpenCoordinator = (coord) => {
    setSelectedCoordinator(coord);
    setCoordinatorModalOpen(true);
  };

  const displayedCoordinators = coordinators.filter(c => {
    if (selectedDeptFilter === "ALL") return true;
    return (c.departmentCode || c.departmentName || "").toUpperCase() === selectedDeptFilter.toUpperCase();
  });

  const coordinatorColumns = [
    {
      key: "fullName",
      label: "Coordinator Name",
      render: (val, row) => (
        <div
          style={{ cursor: "pointer" }}
          onClick={() => handleOpenCoordinator(row)}
          title="Click to view teams and captains"
        >
          <strong style={{ color: "var(--nec-primary, #0056b3)", fontSize: "0.95rem" }}>
            {val || row.username}
          </strong>
          <div style={{ fontSize: "0.78rem", color: "var(--nec-text-muted, #64748b)" }}>
            {row.designation || "Department Sports Coordinator"}
          </div>
        </div>
      )
    },
    {
      key: "departmentCode",
      label: "Department",
      width: "150px",
      render: (val, row) => (
        <div style={{ cursor: "pointer" }} onClick={() => handleOpenCoordinator(row)}>
          <span style={{
            display: "inline-block",
            padding: "2px 8px",
            borderRadius: "6px",
            fontSize: "0.8rem",
            fontWeight: 700,
            background: "rgba(14, 116, 144, 0.1)",
            color: "#0e7490",
            border: "1px solid rgba(14, 116, 144, 0.25)"
          }}>
            {val || "N/A"}
          </span>
          <div style={{ fontSize: "0.74rem", color: "var(--nec-text-muted, #64748b)", marginTop: "2px" }}>
            {row.departmentName}
          </div>
        </div>
      )
    },
    {
      key: "teams_count",
      label: "Number of Teams",
      width: "160px",
      render: (_, row) => {
        const count = getTeamsForCoordinator(row).length;
        return (
          <div
            style={{ cursor: "pointer" }}
            onClick={() => handleOpenCoordinator(row)}
            title="Touch to view teams"
          >
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 10px",
              borderRadius: "12px",
              fontSize: "0.82rem",
              fontWeight: 700,
              background: "rgba(59, 130, 246, 0.12)",
              color: "#1d4ed8"
            }}>
              <Trophy size={13} />
              {count} {count === 1 ? "Team" : "Teams"}
            </span>
          </div>
        );
      }
    },
    {
      key: "captains_count",
      label: "Number of Captains",
      width: "170px",
      render: (_, row) => {
        const count = getCaptainsForCoordinator(row).length;
        return (
          <div
            style={{ cursor: "pointer" }}
            onClick={() => handleOpenCoordinator(row)}
            title="Touch to view captains"
          >
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 10px",
              borderRadius: "12px",
              fontSize: "0.82rem",
              fontWeight: 700,
              background: "rgba(16, 185, 129, 0.12)",
              color: "#059669"
            }}>
              <UserCheck size={13} />
              {count} {count === 1 ? "Captain" : "Captains"}
            </span>
          </div>
        );
      }
    },
    {
      key: "contact",
      label: "Contact",
      render: (_, row) => (
        <div style={{ fontSize: "0.82rem", color: "var(--nec-text-muted, #64748b)" }}>
          {row.email && <div>✉️ {row.email}</div>}
          {row.phone && <div>📞 {row.phone}</div>}
        </div>
      )
    },
    {
      key: "actions",
      label: "Actions",
      width: "150px",
      sortable: false,
      render: (_, row) => (
        <Button
          variant="outline"
          size="sm"
          icon={Eye}
          onClick={() => handleOpenCoordinator(row)}
          title="Touch/Click to view teams and captains"
        >
          View Details
        </Button>
      )
    }
  ];

  return (
    <div className="nec-portal-page">
      <div className="nec-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 className="nec-page-title" style={{ fontSize: "1.75rem" }}>Team Approvals &amp; Catalog</h1>
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

      {/* Status tabs */}
      <div role="tablist" aria-label="Team status" style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        {[
          { id: "ALL", label: `All (${teams.length})` },
          { id: "Pending", label: `Pending (${teams.filter(t => t.status === "Pending").length})` },
          { id: "Approved", label: `Approved (${teams.filter(t => t.status === "Approved").length})` },
          { id: "Disqualified", label: `Disqualified (${teams.filter(t => t.status === "Disqualified").length})` },
          { id: "Coordinators", label: `Coordinators (${coordinators.length})` }
        ].map(tab => (
          <Button
            key={tab.id}
            variant={statusFilter === tab.id ? "primary" : "outline"}
            size="sm"
            role="tab"
            aria-selected={statusFilter === tab.id}
            onClick={() => setStatusFilter(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
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
      ) : statusFilter === "Coordinators" ? (
        <Table
          columns={coordinatorColumns}
          data={displayedCoordinators}
          loading={loading}
          searchPlaceholder="Search staff coordinators by name, department, designation, email..."
          emptyMessage={selectedDeptFilter !== "ALL" ? `No coordinator found for department ${selectedDeptFilter}.` : "No staff coordinators configured."}
        />
      ) : (
        <>
          <Table
            columns={columns}
            data={displayedTeams}
            loading={loading}
            searchPlaceholder="Search teams by name, department, captain..."
            emptyMessage={selectedDeptFilter !== "ALL" ? `No teams found for department ${selectedDeptFilter}.` : statusFilter !== "ALL" ? `No ${statusFilter.toLowerCase()} teams.` : "No teams have registered yet. Click '+ Register Team' to create one."}
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
        onClose={() => {
          setRosterModalOpen(false);
          setCaptainFeedback(null);
        }}
        title={`Roster Details: ${selectedTeam?.name || ""}`}
        size="lg"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Header Info */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "8px",
            paddingBottom: "12px",
            borderBottom: "1px solid var(--nec-border, #e2e8f0)"
          }}>
            <div style={{ fontSize: "0.875rem", color: "var(--nec-text-muted)" }}>
              Department: <strong style={{ color: "var(--nec-text-main, #0f172a)" }}>{selectedTeam?.deptCode || selectedTeam?.deptName}</strong>
              <span style={{ margin: "0 8px" }}>•</span>
              Sport: <strong style={{ color: "var(--nec-text-main, #0f172a)" }}>{selectedTeam?.sportName}</strong>
              {selectedTeam?.coach_name && (
                <>
                  <span style={{ margin: "0 8px" }}>•</span>
                  Coach: <strong style={{ color: "var(--nec-text-main, #0f172a)" }}>{selectedTeam.coach_name}</strong>
                </>
              )}
            </div>
            <div style={{
              fontSize: "0.82rem",
              background: "var(--nec-surface-raised, #f1f5f9)",
              padding: "4px 10px",
              borderRadius: "6px",
              fontWeight: 600,
              color: "var(--nec-text-muted)"
            }}>
              Squad Size: {teamRoster.length} Players
            </div>
          </div>

          {/* Captain Selection / Quick Changer Banner */}
          <div style={{
            background: "linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(251, 191, 36, 0.04) 100%)",
            border: "1px solid rgba(245, 158, 11, 0.25)",
            borderRadius: "10px",
            padding: "14px 16px",
            display: "flex",
            flexDirection: "column",
            gap: "10px"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: "#fef3c7",
                  color: "#d97706",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <Crown size={18} />
                </div>
                <div>
                  <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "#92400e" }}>
                    Select Team Captain
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#b45309" }}>
                    {(() => {
                      const currentCap = teamRoster.find(p => p.role === "Captain");
                      return currentCap
                        ? `Current Captain: ${currentCap.name || currentCap.student_name} (${currentCap.rollNo || currentCap.register_number || currentCap.studentId})`
                        : "No captain currently assigned to this team.";
                    })()}
                  </div>
                </div>
              </div>

              {/* Action Dropdown & Button */}
              {teamRoster.length > 0 && (
                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                  <select
                    className="nec-form-input"
                    value={selectedCaptainId}
                    onChange={(e) => setSelectedCaptainId(e.target.value)}
                    style={{
                      padding: "6px 12px",
                      fontSize: "0.85rem",
                      minWidth: "220px",
                      borderColor: "rgba(245, 158, 11, 0.4)",
                      borderRadius: "6px",
                      background: "#ffffff"
                    }}
                    disabled={settingCaptain}
                  >
                    <option value="">-- Choose player from roster --</option>
                    {teamRoster.map(p => {
                      const pid = String(p.student_id || p.studentId || p.member_id);
                      const isCap = p.role === "Captain";
                      return (
                        <option key={pid} value={pid}>
                          {p.name || p.student_name} ({p.rollNo || p.register_number}) {isCap ? "👑 (Current Captain)" : ""}
                        </option>
                      );
                    })}
                    {teamRoster.some(p => p.role === "Captain") && (
                      <option value="UNASSIGN">❌ Unassign / Remove Captain</option>
                    )}
                  </select>

                  <Button
                    variant="primary"
                    size="sm"
                    icon={Crown}
                    disabled={
                      settingCaptain ||
                      !selectedCaptainId ||
                      (selectedCaptainId !== "UNASSIGN" && teamRoster.find(p => String(p.student_id || p.studentId || p.member_id) === selectedCaptainId)?.role === "Captain")
                    }
                    onClick={() => handleSetCaptain(null)}
                    style={{
                      background: "#d97706",
                      borderColor: "#b45309",
                      color: "#ffffff"
                    }}
                  >
                    {settingCaptain ? "Updating…" : selectedCaptainId === "UNASSIGN" ? "Remove Captain" : "Set as Captain"}
                  </Button>
                </div>
              )}
            </div>

            {/* Feedback message */}
            {captainFeedback && (
              <div style={{
                padding: "8px 12px",
                borderRadius: "6px",
                fontSize: "0.825rem",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: captainFeedback.type === "success" ? "#ecfdf5" : captainFeedback.type === "error" ? "#fef2f2" : "#eff6ff",
                color: captainFeedback.type === "success" ? "#065f46" : captainFeedback.type === "error" ? "#991b1b" : "#1e40af",
                border: `1px solid ${captainFeedback.type === "success" ? "#a7f3d0" : captainFeedback.type === "error" ? "#fecaca" : "#bfdbfe"}`
              }}>
                {captainFeedback.type === "success" ? <CheckCircle2 size={15} /> : captainFeedback.type === "error" ? <AlertCircle size={15} /> : <Crown size={15} />}
                <span>{captainFeedback.message}</span>
              </div>
            )}
          </div>

          {/* Roster Table */}
          {teamRoster.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 20px", color: "var(--nec-text-muted)" }}>
              <p>No players added to this team roster yet.</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="nec-table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Roll / Student ID</th>
                    <th>Student Name</th>
                    <th>Role / Position</th>
                    <th>Jersey #</th>
                    <th style={{ textAlign: "right" }}>Captain Action</th>
                  </tr>
                </thead>
                <tbody>
                  {teamRoster.map(p => {
                    const isCaptain = p.role === "Captain";
                    const pStudentId = p.student_id || p.studentId || p.member_id;
                    return (
                      <tr
                        key={p.id || p.member_id || pStudentId}
                        style={{
                          background: isCaptain ? "rgba(245, 158, 11, 0.08)" : undefined,
                          transition: "background 0.2s ease"
                        }}
                      >
                        <td>
                          <span style={{ fontFamily: "monospace", fontWeight: 600 }}>
                            {p.rollNo || p.register_number || p.studentId}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <strong>{p.name || p.student_name}</strong>
                            {isCaptain && (
                              <span style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "3px",
                                background: "#fef3c7",
                                color: "#b45309",
                                border: "1px solid #fde68a",
                                padding: "2px 7px",
                                borderRadius: "12px",
                                fontSize: "0.72rem",
                                fontWeight: 700
                              }}>
                                <Crown size={11} /> Captain
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            fontSize: "0.78rem",
                            background: isCaptain ? "#fef3c7" : "var(--nec-surface-raised, #f1f5f9)",
                            color: isCaptain ? "#92400e" : "var(--nec-text-main, #334155)",
                            fontWeight: isCaptain ? 700 : 500
                          }}>
                            {p.role || "Player"}
                          </span>
                        </td>
                        <td>
                          {p.jersey_number || p.jerseyNo ? (
                            <span style={{ fontWeight: 600 }}>#{p.jersey_number || p.jerseyNo}</span>
                          ) : (
                            <span style={{ color: "var(--nec-text-muted)" }}>—</span>
                          )}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {isCaptain ? (
                            <span style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              fontSize: "0.8rem",
                              fontWeight: 700,
                              color: "#b45309",
                              padding: "4px 8px"
                            }}>
                              <Crown size={13} /> Active Captain
                            </span>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              icon={Crown}
                              disabled={settingCaptain}
                              onClick={() => handleSetCaptain(pStudentId)}
                              title={`Designate ${p.name || p.student_name} as Captain`}
                              style={{
                                borderColor: "#f59e0b",
                                color: "#d97706",
                                fontSize: "0.78rem",
                                padding: "4px 10px"
                              }}
                            >
                              Make Captain
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>

      {/* ── Coordinator Teams & Captains Modal ── */}
      {coordinatorModalOpen && selectedCoordinator && (
        <Modal
          isOpen={coordinatorModalOpen}
          onClose={() => setCoordinatorModalOpen(false)}
          title={`Coordinator: ${selectedCoordinator.fullName || selectedCoordinator.username}`}
          size="lg"
          footer={
            <Button variant="secondary" onClick={() => setCoordinatorModalOpen(false)}>
              Close
            </Button>
          }
        >
          {(() => {
            const coordTeams = getTeamsForCoordinator(selectedCoordinator);
            const coordCaptains = getCaptainsForCoordinator(selectedCoordinator);

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                {/* Profile Header Box */}
                <div style={{
                  background: "var(--nec-bg-subtle, #f8fafc)",
                  padding: "16px 20px",
                  borderRadius: "10px",
                  border: "1px solid var(--nec-border, #e2e8f0)",
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "14px"
                }}>
                  <div>
                    <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--nec-text-main, #0f172a)" }}>
                      {selectedCoordinator.fullName || selectedCoordinator.username}
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "var(--nec-text-muted, #64748b)", marginTop: "2px" }}>
                      {selectedCoordinator.designation || "Staff Coordinator"}
                    </div>
                    <div style={{ fontSize: "0.82rem", color: "var(--nec-text-muted, #64748b)", marginTop: "4px" }}>
                      {selectedCoordinator.email} {selectedCoordinator.phone ? `• ${selectedCoordinator.phone}` : ""}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <span style={{
                      display: "inline-block",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      background: "rgba(14, 116, 144, 0.12)",
                      color: "#0e7490",
                      border: "1px solid rgba(14, 116, 144, 0.25)"
                    }}>
                      Dept: {selectedCoordinator.departmentCode || "N/A"}
                    </span>
                  </div>
                </div>

                {/* 2 Big Stat Cards for Number of Teams and Captains */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div style={{
                    background: "rgba(59, 130, 246, 0.08)",
                    border: "1px solid rgba(59, 130, 246, 0.25)",
                    borderRadius: "10px",
                    padding: "14px 18px",
                    display: "flex",
                    alignItems: "center",
                    gap: "14px"
                  }}>
                    <div style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "8px",
                      background: "rgba(59, 130, 246, 0.18)",
                      color: "#1d4ed8",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      <Trophy size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#1d4ed8" }}>
                        {coordTeams.length}
                      </div>
                      <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--nec-text-muted, #64748b)" }}>
                        Total Teams Managed
                      </div>
                    </div>
                  </div>

                  <div style={{
                    background: "rgba(16, 185, 129, 0.08)",
                    border: "1px solid rgba(16, 185, 129, 0.25)",
                    borderRadius: "10px",
                    padding: "14px 18px",
                    display: "flex",
                    alignItems: "center",
                    gap: "14px"
                  }}>
                    <div style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "8px",
                      background: "rgba(16, 185, 129, 0.18)",
                      color: "#059669",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      <UserCheck size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#059669" }}>
                        {coordCaptains.length}
                      </div>
                      <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--nec-text-muted, #64748b)" }}>
                        Total Captains Assigned
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 1: Teams List */}
                <div>
                  <h4 style={{ margin: "0 0 10px 0", fontSize: "0.95rem", fontWeight: 700, color: "var(--nec-text-main, #0f172a)", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Trophy size={16} />
                    Teams under {selectedCoordinator.departmentCode || "this Department"} ({coordTeams.length})
                  </h4>

                  {coordTeams.length === 0 ? (
                    <div style={{ padding: "16px", background: "var(--nec-bg-subtle, #f8fafc)", borderRadius: "8px", textAlign: "center", color: "var(--nec-text-muted, #64748b)", fontSize: "0.85rem" }}>
                      No teams registered for this department yet.
                    </div>
                  ) : (
                    <div className="nec-table-responsive-wrapper">
                      <table className="nec-table">
                        <thead>
                          <tr>
                            <th>Team Name</th>
                            <th style={{ width: "130px" }}>Sport</th>
                            <th style={{ width: "160px" }}>Team Captain</th>
                            <th style={{ width: "100px", textAlign: "center" }}>Squad Size</th>
                            <th style={{ width: "110px" }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {coordTeams.map((t) => (
                            <tr key={t.team_id || t.id}>
                              <td>
                                <strong style={{ color: "var(--nec-text-main, #0f172a)" }}>
                                  {t.name}
                                </strong>
                              </td>
                              <td>{t.sportName || "Sport"}</td>
                              <td>
                                {t.captainName ? (
                                  <div>
                                    <span style={{ fontWeight: 600, color: "var(--nec-primary, #0056b3)" }}>
                                      {t.captainName}
                                    </span>
                                    {t.captainRoll && (
                                      <div style={{ fontSize: "0.75rem", color: "var(--nec-text-muted, #64748b)" }}>
                                        {t.captainRoll}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <em style={{ color: "var(--nec-text-muted, #94a3b8)" }}>Unassigned</em>
                                )}
                              </td>
                              <td style={{ textAlign: "center" }}>{t.memberCount || 0}</td>
                              <td>
                                <Badge status={t.status === "Approved" ? "success" : t.status === "Disqualified" ? "danger" : "warning"}>
                                  {t.status}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Section 2: Captains List */}
                <div>
                  <h4 style={{ margin: "0 0 10px 0", fontSize: "0.95rem", fontWeight: 700, color: "var(--nec-text-main, #0f172a)", display: "flex", alignItems: "center", gap: "6px" }}>
                    <UserCheck size={16} />
                    Captains under {selectedCoordinator.departmentCode || "this Department"} ({coordCaptains.length})
                  </h4>

                  {coordCaptains.length === 0 ? (
                    <div style={{ padding: "16px", background: "var(--nec-bg-subtle, #f8fafc)", borderRadius: "8px", textAlign: "center", color: "var(--nec-text-muted, #64748b)", fontSize: "0.85rem" }}>
                      No captains assigned in this department yet.
                    </div>
                  ) : (
                    <div className="nec-table-responsive-wrapper">
                      <table className="nec-table">
                        <thead>
                          <tr>
                            <th>Captain Athlete Name</th>
                            <th style={{ width: "130px" }}>Register #</th>
                            <th>Team Represented</th>
                            <th style={{ width: "140px" }}>Sport</th>
                          </tr>
                        </thead>
                        <tbody>
                          {coordCaptains.map((cap, i) => (
                            <tr key={i}>
                              <td>
                                <strong style={{ color: "var(--nec-primary, #0056b3)" }}>
                                  {cap.name}
                                </strong>
                              </td>
                              <td>{cap.roll || "N/A"}</td>
                              <td>{cap.teamName}</td>
                              <td>
                                <span style={{ fontWeight: 600 }}>{cap.sportName}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </Modal>
      )}
    </div>
  );
}
