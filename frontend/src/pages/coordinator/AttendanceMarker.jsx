import React, { useEffect, useState } from "react";
import { playersApi, teamsApi } from "../../services/api/apiServices";
import { Card } from "../../components/common/Card";
import Button from "../../components/common/Button";
import { UserCheck, CheckSquare, Square, Save } from "lucide-react";
import "./CoordinatorPortal.css";

export default function AttendanceMarker() {
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [players, setPlayers] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    teamsApi.getTeams().then(tList => {
      setTeams(tList);
      if (tList.length > 0) setSelectedTeamId(tList[0].id);
    });
  }, []);

  useEffect(() => {
    if (selectedTeamId) {
      setLoading(true);
      playersApi.getPlayersByTeam(selectedTeamId).then(pList => {
        setPlayers(pList);
        const initial = {};
        pList.forEach(p => { initial[p.id] = true; }); // Default present
        setAttendance(initial);
        setLoading(false);
      });
    }
  }, [selectedTeamId]);

  const toggleStudent = (pId) => {
    setAttendance(prev => ({ ...prev, [pId]: !prev[pId] }));
  };

  const handleSelectAll = (val) => {
    const updated = {};
    players.forEach(p => { updated[p.id] = val; });
    setAttendance(updated);
  };

  const handleSaveAttendance = () => {
    if (!selectedTeamId) return;
    playersApi.saveSquadAttendance(selectedTeamId, attendance).then(() => {
      alert(`Matchday attendance recorded! ${presentCount} / ${players.length} athletes present.`);
    });
  };

  const presentCount = Object.values(attendance).filter(Boolean).length;

  return (
    <div className="nec-portal-page">
      <div className="nec-page-header">
        <h2 className="nec-page-title">Mobile Squad Attendance Checklist</h2>
        <p className="nec-page-desc">Roster-oriented matchday attendance verification for department coordinators.</p>
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
      </div>

      <Card
        title="Squad Attendance Sheet"
        subtitle={`Present: ${presentCount} / ${players.length} Athletes`}
        headerAction={
          <div style={{ display: "flex", gap: "8px" }}>
            <Button variant="outline" size="sm" onClick={() => handleSelectAll(true)}>Select All</Button>
            <Button variant="ghost" size="sm" onClick={() => handleSelectAll(false)}>Clear</Button>
          </div>
        }
        footer={
          <Button variant="primary" icon={Save} onClick={handleSaveAttendance}>
            Save Matchday Attendance
          </Button>
        }
      >
        <div className="nec-attendance-list">
          {players.map(p => {
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
    </div>
  );
}
