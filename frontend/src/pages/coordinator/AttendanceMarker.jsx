import React, { useEffect, useState } from "react";
import { playersApi, teamsApi, matchesApi, apiFetch } from "../../services/api/apiServices";
import { useAuth } from "../../context/AuthContext";
import { Card } from "../../components/common/Card";
import Button from "../../components/common/Button";
import ErrorState from "../../components/common/ErrorState";
import { UserCheck, CheckSquare, Square, Save } from "lucide-react";
import "./CoordinatorPortal.css";

export default function AttendanceMarker() {
  const { currentUser } = useAuth();
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [matches, setMatches] = useState([]);
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [players, setPlayers] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  useEffect(() => {
    teamsApi.getTeams().then(tList => {
      const filtered = Array.isArray(tList) ? tList : [];
      setTeams(filtered);
      if (filtered.length > 0) setSelectedTeamId(filtered[0].id || filtered[0].team_id);
      else setSelectedTeamId("");
    }).catch(err => {
      console.error(err);
      setTeams([]);
    });
  }, [currentUser.id]);

  const loadPlayers = (teamId) => {
    setLoading(true);
    setError(null);
    playersApi.getPlayersByTeam(teamId).then(pList => {
      setPlayers(pList);
      const initial = {};
      pList.forEach(p => { initial[p.id] = true; }); // Default present
      setAttendance(initial);
      setDirty(false);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setError(err.message);
      setLoading(false);
    });
  };

  useEffect(() => {
    if (selectedTeamId) {
      loadPlayers(selectedTeamId);
      setSelectedMatchId("");
      matchesApi.getMatches().then(list => setMatches(list.filter(m => Number(m.team_a_id) === Number(selectedTeamId) || Number(m.team_b_id) === Number(selectedTeamId)))).catch(err => setError(err.message));
    }
  }, [selectedTeamId]);

  useEffect(() => {
    if (!selectedTeamId || !selectedMatchId || dirty) return;
    let cancelled = false;
    const refresh = () => apiFetch(`/teams/${selectedTeamId}/attendance?matchId=${selectedMatchId}`).then(rows => {
      if (cancelled) return;
      const saved = rows.filter(r => Number(r.match_id) === Number(selectedMatchId));
      const next = Object.fromEntries(players.map(p => [p.id, saved.find(r => Number(r.student_id) === Number(p.student_id || p.id))?.status === 'Present']));
      setAttendance(next);
    }).catch(e => { if (!cancelled) setError(e.message); });
    refresh();
    const timer = setInterval(refresh, 10000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [selectedTeamId, selectedMatchId, players, dirty]);

  const toggleStudent = (pId) => {
    setDirty(true);
    setAttendance(prev => ({ ...prev, [pId]: !prev[pId] }));
  };

  const handleSelectAll = (val) => {
    setDirty(true);
    const updated = {};
    players.forEach(p => { updated[p.id] = val; });
    setAttendance(updated);
  };

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const handleSaveAttendance = async () => {
    if (!selectedTeamId) return;
    setSaving(true);
    setSuccessMsg("");
    try {
      await playersApi.saveSquadAttendance(selectedTeamId, attendance, selectedMatchId);
      setDirty(false);
      setSuccessMsg(`Matchday attendance recorded! ${presentCount} of ${players.length} athletes marked present.`);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      alert("Failed to save squad attendance: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const presentCount = Object.values(attendance).filter(Boolean).length;

  return (
    <div className="nec-portal-page">
      <div className="nec-page-header">
        <h2 className="nec-page-title">Match Attendance</h2>
      </div>

      <div className="nec-card" style={{ padding: "14px 20px" }}>
        <label style={{ fontWeight: 600, marginRight: "12px" }}>Department Team:</label>
        <select
          className="nec-table-search-input"
          style={{ display: "inline-block", width: "auto" }}
          value={selectedTeamId}
          onChange={(e) => setSelectedTeamId(e.target.value)}
        >
          {teams.map(t => (
            <option key={t.id} value={t.id}>{t.name} ({t.deptCode})</option>
          ))}
        </select>
        <label htmlFor="attendance-match" style={{ marginLeft: 16 }}>Match:</label>
        <select id="attendance-match" className="nec-table-search-input" value={selectedMatchId} onChange={e => { setSelectedMatchId(e.target.value); setDirty(false); }}>
          <option value="">Select match</option>
          {matches.map(m => <option key={m.id} value={m.id}>{m.teamA} vs {m.teamB} ? {m.date}</option>)}
        </select>
      </div>

      {error ? (
        <div style={{ padding: "40px" }}>
          <ErrorState onRetry={() => loadPlayers(selectedTeamId)} />
        </div>
      ) : (
        <Card
          title="Squad Attendance Sheet"
          subtitle={`Present: ${presentCount} / ${players.length} Athletes`}
          headerAction={
            <div style={{ display: "flex", gap: "8px" }}>
              <Button variant="outline" size="sm" onClick={() => handleSelectAll(true)}>Select All</Button>
              <Button variant="outline" size="sm" onClick={() => handleSelectAll(false)}>Clear</Button>
            </div>
          }
          footer={
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
              {successMsg ? (
                <span style={{ color: "var(--nec-success, #10b981)", fontWeight: 600, fontSize: "0.85rem" }}>
                  ✓ {successMsg}
                </span>
              ) : <span />}
              <Button variant="primary" icon={Save} onClick={handleSaveAttendance} loading={saving} disabled={loading || saving || !selectedMatchId || players.length === 0}>
                {saving ? "Saving..." : "Save Matchday Attendance"}
              </Button>
            </div>
          }
        >
          <div className="nec-attendance-list">
            {players.length === 0 ? (
              <p>No players in this team.</p>
            ) : players.map(p => {
              const isPresent = !!attendance[p.id];
              return (
                <div
                  key={p.id}
                  className="nec-att-row"
                  style={{ backgroundColor: isPresent ? "var(--nec-success-bg)" : "var(--nec-surface-raised)" }}
                  onClick={() => toggleStudent(p.id)}
                >
                  <div className="nec-att-toggle">
                    {isPresent ? (
                      <CheckSquare size={20} style={{ color: "var(--nec-success)" }} />
                    ) : (
                      <Square size={20} style={{ color: "var(--nec-text-muted)" }} />
                    )}
                    <div>
                      <strong>{p.name}</strong> ({p.studentId})
                      <br />
                      <small style={{ color: "var(--nec-text-muted)" }}>#{p.jerseyNo} • {p.position}</small>
                    </div>
                  </div>
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: isPresent ? "var(--nec-success-text)" : "var(--nec-text-muted)" }}>
                    {isPresent ? "PRESENT ✓" : "ABSENT ×"}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
