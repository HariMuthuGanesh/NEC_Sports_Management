import React, { useState, useEffect } from "react";
import { departmentTeamsApi, studentLookupApi } from "../../services/api/apiServices";
import Table from "../../components/common/Table";
import Button from "../../components/common/Button";
import "../coordinator/CoordinatorPortal.css";

export default function MyRoster() {
  const [team, setTeam] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Add player form state
  const [newPlayerUserId, setNewPlayerUserId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);

  const loadMyRoster = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await departmentTeamsApi.getMyDepartmentTeam();
      if (res) {
        setTeam(res);
        setPlayers(res.players || []);
      } else {
        setTeam(null);
        setPlayers([]);
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load team roster.");
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMyRoster();
  }, []);

  const handleSearchStudent = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const res = await studentLookupApi.searchStudent(searchQuery);
      setSearchResults(res || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Student lookup failed.");
    } finally {
      setSearching(false);
    }
  };

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    if (!team?.id || !newPlayerUserId) return;
    setAdding(true);
    setError(null);
    try {
      await departmentTeamsApi.addPlayer(team.id, Number(newPlayerUserId));
      setNewPlayerUserId("");
      setSearchQuery("");
      setSearchResults([]);
      await loadMyRoster();
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to add player to roster.");
    } finally {
      setAdding(false);
    }
  };

  const handleRemovePlayer = async (playerUserId) => {
    if (!team?.id) return;
    setError(null);
    try {
      await departmentTeamsApi.removePlayer(team.id, playerUserId);
      await loadMyRoster();
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to remove player from roster.");
    }
  };

  const columns = [
    { key: "player_user_id", label: "User ID", width: "90px" },
    { key: "username", label: "Username", render: (val) => <strong>{val}</strong> },
    { key: "student_name", label: "Student Name", render: (val, row) => val || row.username },
    { key: "register_number", label: "Register #", render: (val) => val || "N/A" },
    { key: "status", label: "Status", render: (val) => <span style={{ color: "#28a745", fontWeight: 600 }}>{val || "Active"}</span> },
    {
      key: "actions",
      label: "Actions",
      width: "120px",
      sortable: false,
      render: (_, row) => (
        <Button
          variant="danger"
          size="sm"
          onClick={() => handleRemovePlayer(row.player_user_id)}
        >
          Remove
        </Button>
      )
    }
  ];

  if (loading) {
    return <div style={{ padding: "30px", textAlign: "center" }}>Loading your roster...</div>;
  }

  if (!team) {
    return (
      <div className="nec-portal-page" style={{ padding: "30px" }}>
        <h2>Team Captain Roster Management</h2>
        <p>No assigned department team was found for your account.</p>
      </div>
    );
  }

  return (
    <div className="nec-portal-page">
      <div className="nec-page-header">
        <div>
          <h2 className="nec-page-title">My Team Roster — {team.sport_name}</h2>
          <p className="nec-page-desc">Department: {team.department_name}</p>
        </div>
      </div>

      {error && (
        <div style={{ color: "#d9534f", backgroundColor: "#fdf7f7", padding: "12px", borderRadius: "6px", marginBottom: "16px", border: "1px solid #d9534f" }}>
          {error}
        </div>
      )}

      {/* Add Player Box */}
      <div className="nec-card" style={{ padding: "16px 20px", marginBottom: "20px" }}>
        <h4 style={{ margin: "0 0 12px 0" }}>Add Player to Roster</h4>
        
        {/* Quick ID Entry Form */}
        <form onSubmit={handleAddPlayer} style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "12px" }}>
          <input
            type="number"
            className="nec-table-search-input"
            style={{ width: "220px" }}
            placeholder="Enter Player User ID..."
            value={newPlayerUserId}
            onChange={(e) => setNewPlayerUserId(e.target.value)}
            required
          />
          <Button type="submit" variant="primary" disabled={adding}>
            {adding ? "Adding..." : "Add Player"}
          </Button>
        </form>

        {/* Optional Student Lookup */}
        <div style={{ borderTop: "1px solid var(--nec-border, #eee)", paddingTop: "12px", marginTop: "12px" }}>
          <span style={{ fontSize: "0.85rem", color: "var(--nec-text-muted, #666)", display: "block", marginBottom: "6px" }}>
            Lookup Player by Roll Number / Name:
          </span>
          <div style={{ display: "flex", gap: "8px", maxWidth: "420px" }}>
            <input
              type="text"
              className="nec-table-search-input"
              style={{ flex: 1 }}
              placeholder="e.g. 2112045 or Student Name"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button variant="outline" size="sm" onClick={handleSearchStudent} disabled={searching}>
              {searching ? "Searching..." : "Search"}
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div style={{ marginTop: "10px", background: "var(--nec-surface-raised, #f9f9f9)", padding: "10px", borderRadius: "6px" }}>
              {searchResults.map((s) => (
                <div key={s.studentId || s.user_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}>
                  <span>{s.name} ({s.registerNumber || s.studentId}) — User ID: <strong>{s.userId || s.user_id}</strong></span>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setNewPlayerUserId(String(s.userId || s.user_id))}
                  >
                    Use User ID
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Roster Table */}
      <Table
        columns={columns}
        data={players}
        loading={false}
        searchPlaceholder="Search active roster..."
        emptyMessage="No players currently in this team's active roster."
      />
    </div>
  );
}
