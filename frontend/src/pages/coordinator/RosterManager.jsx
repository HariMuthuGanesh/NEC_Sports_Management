import React, { useEffect, useState } from "react";
import { playersApi, studentLookupApi, teamsApi } from "../../services/api/apiServices";
import { useAuth } from "../../context/AuthContext";
import Table from "../../components/common/Table";
import Button from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import { UserPlus, Search, Trash2, Shield } from "lucide-react";
import "./CoordinatorPortal.css";

export default function RosterManager() {
  const { currentUser } = useAuth();
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Student Search Modal State
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Add to squad form state
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [position, setPosition] = useState("");
  const [jerseyNo, setJerseyNo] = useState("");

  useEffect(() => {
    teamsApi.getTeams().then(tList => {
      const myDept = currentUser.dept;
      const filtered = (myDept && myDept !== "All") ? tList.filter(t => t.deptCode === myDept) : tList;
      const finalTeams = filtered.length > 0 ? filtered : tList;
      setTeams(finalTeams);
      if (finalTeams.length > 0) {
        setSelectedTeamId(finalTeams[0].id);
      }
    });
  }, [currentUser]);

  useEffect(() => {
    if (selectedTeamId) {
      loadRoster(selectedTeamId);
    }
  }, [selectedTeamId]);

  const loadRoster = (teamId) => {
    setLoading(true);
    playersApi.getPlayersByTeam(teamId).then(pList => {
      setPlayers(pList);
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

    playersApi.addPlayerToRoster(selectedTeamId, {
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
      <div className="nec-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 className="nec-page-title">Department Squad Roster Management</h2>
          <p className="nec-page-desc">Integrated with NEC External Student Information Boundary for verified student entries.</p>
        </div>
        <Button variant="primary" icon={UserPlus} onClick={() => setSearchModalOpen(true)}>
          Search & Add Student Athlete
        </Button>
      </div>

      {/* Team Selection Bar */}
      <div className="nec-card" style={{ padding: "14px 20px" }}>
        <label style={{ fontWeight: 600, marginRight: "12px" }}>Select Department Team Roster:</label>
        <select
          className="nec-table-search-input"
          style={{ display: "inline-block", width: "auto" }}
          value={selectedTeamId}
          onChange={(e) => setSelectedTeamId(e.target.value)}
        >
          {teams.map(t => (
            <option key={t.id} value={t.id}>{t.name} ({t.deptCode}) - {t.sportId.replace("sp_", "").toUpperCase()}</option>
          ))}
        </select>
      </div>

      <Table
        columns={columns}
        data={players}
        loading={loading}
        searchPlaceholder="Search athlete by roll no or name..."
      />

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
    </div>
  );
}
