import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { departmentTeamsApi, sportsApi, playersApi } from "../../services/api/apiServices";
import Table from "../../components/common/Table";
import Button from "../../components/common/Button";
import "./CoordinatorPortal.css";

export default function DepartmentTeams() {
  const { currentUser } = useAuth();
  const [teams, setTeams] = useState([]);
  const [sports, setSports] = useState([]);
  const [captains, setCaptains] = useState([]);
  const [selectedSportId, setSelectedSportId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [teamsData, sportsData, playersRes] = await Promise.all([
        departmentTeamsApi.getDepartmentTeams(),
        sportsApi.getSports(),
        playersApi.getAllPlayers()
      ]);

      setTeams(teamsData || []);
      setSports(sportsData || []);

      // Filter potential team captains from players/users list
      const allPlayers = playersRes?.data || (Array.isArray(playersRes) ? playersRes : []);
      setCaptains(allPlayers);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load department teams data.");
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!selectedSportId) return;
    setSubmitting(true);
    setError(null);

    const deptId = currentUser?.deptId || currentUser?.dept_id;
    try {
      await departmentTeamsApi.createDepartmentTeam({
        department_id: deptId,
        sport_id: Number(selectedSportId)
      });
      setSelectedSportId("");
      await loadData();
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to create department team.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignCaptain = async (teamId, captainUserId) => {
    if (!captainUserId) return;
    setError(null);
    try {
      await departmentTeamsApi.assignCaptain(teamId, Number(captainUserId));
      await loadData();
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to assign team captain.");
    }
  };

  const columns = [
    { key: "id", label: "Team ID", width: "80px" },
    { key: "sport_name", label: "Sport", render: (val, row) => <strong>{val || `Sport #${row.sport_id}`}</strong> },
    { key: "department_name", label: "Department", render: (val, row) => row.department_code || val },
    {
      key: "captain_name",
      label: "Current Captain",
      render: (val) => (val ? <span style={{ color: "var(--nec-primary, #0056b3)", fontWeight: 600 }}>{val}</span> : <em>Unassigned</em>)
    },
    {
      key: "assign_captain",
      label: "Assign / Change Captain",
      sortable: false,
      render: (_, row) => (
        <select
          className="nec-table-search-input"
          style={{ width: "auto", padding: "4px 8px" }}
          defaultValue=""
          onChange={(e) => handleAssignCaptain(row.id, e.target.value)}
        >
          <option value="" disabled>Select Team Captain...</option>
          {captains.map((c) => (
            <option key={c.id || c.player_user_id} value={c.id || c.player_user_id}>
              {c.student_name || c.username} ({c.register_number || c.email})
            </option>
          ))}
        </select>
      )
    }
  ];

  if (loading) {
    return <div style={{ padding: "30px", textAlign: "center" }}>Loading department teams...</div>;
  }

  return (
    <div className="nec-portal-page">
      <div className="nec-page-header">
        <div>
          <h2 className="nec-page-title">Department Teams</h2>
          <p className="nec-page-desc">Manage sports teams and assign Team Captains for your department.</p>
        </div>
      </div>

      {error && (
        <div style={{ color: "#d9534f", backgroundColor: "#fdf7f7", padding: "12px", borderRadius: "6px", marginBottom: "16px", border: "1px solid #d9534f" }}>
          {error}
        </div>
      )}

      {/* Create Department Team Form */}
      <div className="nec-card" style={{ padding: "16px 20px", marginBottom: "20px" }}>
        <h4 style={{ margin: "0 0 12px 0" }}>Create New Department Team</h4>
        <form onSubmit={handleCreateTeam} style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <select
            className="nec-table-search-input"
            style={{ width: "260px" }}
            value={selectedSportId}
            onChange={(e) => setSelectedSportId(e.target.value)}
            required
          >
            <option value="">-- Pick a Sport --</option>
            {sports.map((s) => (
              <option key={s.sport_id || s.id} value={s.sport_id || s.id}>
                {s.name} ({s.category || "Outdoor"})
              </option>
            ))}
          </select>

          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? "Creating..." : "Create Team"}
          </Button>
        </form>
      </div>

      {/* Teams List */}
      <Table
        columns={columns}
        data={teams}
        loading={false}
        searchPlaceholder="Search department teams..."
        emptyMessage="No department teams created yet."
      />
    </div>
  );
}
