import React, { useState, useEffect } from "react";
import { sportsApi, collegeTeamsApi } from "../../services/api/apiServices";
import Table from "../../components/common/Table";
import Button from "../../components/common/Button";
import "./AdminPortal.css";

export default function CollegeTeamBuilder() {
  const [sports, setSports] = useState([]);
  const [selectedSportId, setSelectedSportId] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedPlayersMap, setSelectedPlayersMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [fetchingSuggestions, setFetchingSuggestions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    sportsApi.getSports()
      .then((data) => {
        setSports(data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message || "Failed to load sports catalog.");
        setLoading(false);
      });
  }, []);

  const handleSportSelect = async (sportId) => {
    setSelectedSportId(sportId);
    setSuggestions([]);
    setSelectedPlayersMap({});
    setError(null);
    setSuccessMsg(null);

    if (!sportId) return;

    setFetchingSuggestions(true);
    try {
      const data = await collegeTeamsApi.getSuggestions(sportId);
      setSuggestions(data || []);
      // Default all suggested players as checked
      const initialMap = {};
      (data || []).forEach((p) => {
        initialMap[p.player_user_id] = true;
      });
      setSelectedPlayersMap(initialMap);
      setFetchingSuggestions(false);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to fetch college team player suggestions.");
      setFetchingSuggestions(false);
    }
  };

  const handleTogglePlayer = (playerUserId) => {
    setSelectedPlayersMap((prev) => ({
      ...prev,
      [playerUserId]: !prev[playerUserId]
    }));
  };

  const handleConfirmTeam = async () => {
    if (!selectedSportId) return;

    const selectedPlayers = suggestions
      .filter((p) => selectedPlayersMap[p.player_user_id])
      .map((p) => ({
        player_user_id: p.player_user_id,
        source_department_id: p.source_department_id
      }));

    if (selectedPlayers.length === 0) {
      setError("Please select at least one player to confirm the team.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await collegeTeamsApi.confirmTeam(Number(selectedSportId), selectedPlayers);
      setSuccessMsg(`College team confirmed successfully with ${selectedPlayers.length} athletes!`);
      setSubmitting(false);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to confirm college team selection.");
      setSubmitting(false);
    }
  };

  const columns = [
    {
      key: "select",
      label: "Select",
      width: "60px",
      sortable: false,
      render: (_, row) => (
        <input
          type="checkbox"
          checked={Boolean(selectedPlayersMap[row.player_user_id])}
          onChange={() => handleTogglePlayer(row.player_user_id)}
        />
      )
    },
    { key: "player_user_id", label: "User ID", width: "90px" },
    { key: "student_name", label: "Student Athlete", render: (val, row) => <strong>{val || row.username}</strong> },
    { key: "register_number", label: "Register #", render: (val) => val || "N/A" },
    { key: "source_department_name", label: "Department", render: (val, row) => row.source_department_code || val },
    { key: "matches_played", label: "Matches Played", render: (val) => <span>{val}</span> }
  ];

  if (loading) {
    return <div style={{ padding: "30px", textAlign: "center" }}>Loading...</div>;
  }

  return (
    <div className="nec-portal-page">
      <div className="nec-page-header">
        <div>
          <h2 className="nec-page-title">College Team Builder</h2>
          <p className="nec-page-desc">Select and confirm institutional college team rosters across all departments.</p>
        </div>
      </div>

      {error && (
        <div style={{ color: "#d9534f", backgroundColor: "#fdf7f7", padding: "12px", borderRadius: "6px", marginBottom: "16px", border: "1px solid #d9534f" }}>
          {error}
        </div>
      )}

      {successMsg && (
        <div style={{ color: "#155724", backgroundColor: "#d4edda", padding: "12px", borderRadius: "6px", marginBottom: "16px", border: "1px solid #c3e6cb" }}>
          {successMsg}
        </div>
      )}

      {/* Sport Selector */}
      <div className="nec-card" style={{ padding: "16px 20px", marginBottom: "20px" }}>
        <label style={{ fontWeight: 600, marginRight: "12px" }}>Select Sport for College Team:</label>
        <select
          className="nec-table-search-input"
          style={{ width: "280px", display: "inline-block" }}
          value={selectedSportId}
          onChange={(e) => handleSportSelect(e.target.value)}
        >
          <option value="">-- Choose Sport --</option>
          {sports.map((s) => (
            <option key={s.sport_id || s.id} value={s.sport_id || s.id}>
              {s.name} ({s.category || "Outdoor"})
            </option>
          ))}
        </select>
      </div>

      {selectedSportId && (
        <>
          <div style={{ marginBottom: "12px", fontSize: "0.9rem", color: "var(--nec-text-muted, #666)" }}>
            Ranking is a placeholder until attendance tracking is built
          </div>

          <Table
            columns={columns}
            data={suggestions}
            loading={fetchingSuggestions}
            searchPlaceholder="Search candidate athletes..."
            emptyMessage="No department team member suggestions found for this sport."
          />

          {suggestions.length > 0 && (
            <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="primary"
                onClick={handleConfirmTeam}
                disabled={submitting}
              >
                {submitting ? "Confirming..." : "Confirm College Team Selection"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
