import React, { useEffect, useState } from "react";
import { teamsApi, playersApi } from "../../services/api/apiServices";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import ErrorState from "../../components/common/ErrorState";
import { Users, Filter, Plus, Trophy, Calendar, Eye, Activity } from "lucide-react";
import "./AdminPortal.css";

export default function TeamsManager() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamRoster, setTeamRoster] = useState([]);
  const [rosterModalOpen, setRosterModalOpen] = useState(false);

  const loadTeams = () => {
    setLoading(true);
    setError(null);
    teamsApi.getTeams().then(data => {
      setTeams(data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setError(err.message);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadTeams();
  }, []);

  const handleViewRoster = (team) => {
    setSelectedTeam(team);
    playersApi.getPlayersByTeam(team.team_id).then(players => {
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
            backgroundColor: "var(--nec-surface-raised)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--nec-navy)"
          }}>
            <Trophy size={20} />
          </div>
          <div>
            <strong style={{ fontSize: "0.95rem" }}>{val}</strong>
            <div style={{ fontSize: "0.75rem", color: "var(--nec-text-muted)" }}>
              {row.deptCode} • {row.sportName}
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
          <strong style={{ fontSize: "0.875rem" }}>{val} (Captain)</strong>
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
      width: "110px",
      sortable: false,
      render: (_, row) => (
        <div style={{ display: "flex", gap: "8px" }}>
          {row.status === "Pending" && (
            <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(row.team_id, "Approved")}>
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
      <div className="nec-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 className="nec-page-title" style={{ fontSize: "1.75rem" }}>Team Roster Management</h1>
          <p className="nec-page-desc">Oversee active rosters, monitor upcoming fixtures, and manage coaching assignments across all engineering disciplines.</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <Button variant="outline" icon={Filter}>Filter List</Button>
          <Button variant="primary" icon={Plus}>Register Team</Button>
        </div>
      </div>

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
            data={teams}
            loading={loading}
            searchPlaceholder="Search teams by name, department, captain..."
            emptyMessage="No teams have registered yet."
          />
        </>
      )}

      <Modal
        isOpen={rosterModalOpen}
        onClose={() => setRosterModalOpen(false)}
        title={`Roster Details: ${selectedTeam?.name || ""}`}
      >
        <div>
          <p style={{ margin: "0 0 12px 0", fontSize: "0.875rem", color: "var(--nec-text-muted)" }}>
            Department: <strong>{selectedTeam?.deptCode}</strong> | Captain: <strong>{selectedTeam?.captainName}</strong>
          </p>
          {teamRoster.length === 0 ? (
            <p>No players added to this team roster yet.</p>
          ) : (
            <table className="nec-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Roll / Student ID</th>
                  <th>Student Name</th>
                  <th>Position</th>
                  <th>Jersey #</th>
                </tr>
              </thead>
              <tbody>
                {teamRoster.map(p => (
                  <tr key={p.id}>
                    <td>{p.studentId}</td>
                    <td><strong>{p.name}</strong> ({p.year})</td>
                    <td>{p.position}</td>
                    <td>#{p.jerseyNo}</td>
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
