import React, { useEffect, useState } from "react";
import { teamsApi, playersApi } from "../../services/api/apiServices";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import { Users, Filter, Plus, Trophy, Calendar, Eye, Activity } from "lucide-react";
import "./AdminPortal.css";

export default function TeamsManager() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamRoster, setTeamRoster] = useState([]);
  const [rosterModalOpen, setRosterModalOpen] = useState(false);

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = () => {
    setLoading(true);
    teamsApi.getTeams().then(data => {
      setTeams(data);
      setLoading(false);
    });
  };

  const handleViewRoster = (team) => {
    setSelectedTeam(team);
    playersApi.getPlayersByTeam(team.team_id).then(players => {
      setTeamRoster(players);
      setRosterModalOpen(true);
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
          <div style={{ fontSize: "0.75rem", color: "var(--nec-text-muted)" }}>
            Coach: Prof. S. Nathan
          </div>
        </div>
      )
    },
    {
      key: "memberCount",
      label: "Roster",
      width: "120px",
      render: (val) => <span><strong>{val}</strong> / 25 Athletes</span>
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
      key: "nextMatch",
      label: "Next Fixture",
      width: "180px",
      render: () => (
        <div>
          <strong style={{ fontSize: "0.8125rem" }}>Aug 18, 16:00</strong>
          <div style={{ fontSize: "0.75rem", color: "var(--nec-text-muted)" }}>vs Mech Titans</div>
        </div>
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
      {/* Stitch Design Header */}
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

      {/* Stitch Bento Grid Metrics */}
      <div className="nec-stats-grid">
        <div className="nec-stat-card nec-stat-card-navy">
          <div className="nec-stat-card-top">
            <span className="nec-stat-title">Total Teams</span>
            <div className="nec-stat-icon-wrapper"><Users size={20} /></div>
          </div>
          <div className="nec-stat-value">42</div>
          <div className="nec-stat-subtext">
            <span className="nec-stat-trend up">↑ +3</span> this semester
          </div>
        </div>

        <div className="nec-stat-card nec-stat-card-gold">
          <div className="nec-stat-card-top">
            <span className="nec-stat-title">Active Athletes</span>
            <div className="nec-stat-icon-wrapper"><Activity size={20} /></div>
          </div>
          <div className="nec-stat-value">658</div>
          <div className="nec-stat-subtext">
            <span className="nec-stat-trend up">↑ +45</span> this semester
          </div>
        </div>

        <div className="nec-stat-card" style={{
          background: "linear-gradient(135deg, var(--nec-navy), var(--nec-navy-dark))",
          color: "#fff",
          gridColumn: "span 2"
        }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--nec-gold-light)", textTransform: "uppercase" }}>
            Upcoming Inter-College Meet
          </div>
          <h3 style={{ margin: "4px 0", fontSize: "1.3rem", color: "#fff" }}>South Zone Qualifiers</h3>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#cbd5e1" }}>
            12 teams are currently preparing for the zonal qualifiers next week.
          </p>
        </div>
      </div>

      {/* Data Table */}
      <Table
        columns={columns}
        data={teams}
        loading={loading}
        searchPlaceholder="Search teams by name, department, captain..."
      />

      {/* Roster Modal */}
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
