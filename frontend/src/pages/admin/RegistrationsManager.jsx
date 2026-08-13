import React, { useEffect, useState } from "react";
import { teamsApi, playersApi } from "../../services/api/apiServices";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import { Modal, ConfirmDialog } from "../../components/common/Modal";
import { Check, X, Eye } from "lucide-react";
import "./AdminPortal.css";

export default function RegistrationsManager() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamRoster, setTeamRoster] = useState([]);
  const [rosterModalOpen, setRosterModalOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, teamId: null, action: null });

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
    playersApi.getPlayersByTeam(team.id).then(players => {
      setTeamRoster(players);
      setRosterModalOpen(true);
    });
  };

  const handleAction = () => {
    const { teamId, action } = confirmDialog;
    if (!teamId || !action) return;

    teamsApi.updateTeamStatus(teamId, action === "approve" ? "Approved" : "Rejected").then(() => {
      setConfirmDialog({ open: false, teamId: null, action: null });
      loadTeams();
    });
  };

  const columns = [
    { key: "deptCode", label: "Dept", width: "90px", render: (val) => <strong>{val}</strong> },
    { key: "name", label: "Team Name", render: (val) => <strong>{val}</strong> },
    { key: "sportId", label: "Sport", width: "130px", render: (val) => val.replace("sp_", "").toUpperCase() },
    { key: "captainName", label: "Captain", render: (val, row) => <span>{val} ({row.captainRoll})</span> },
    { key: "memberCount", label: "Players", width: "90px", render: (val) => <span>{val} players</span> },
    {
      key: "status",
      label: "Status",
      width: "120px",
      render: (val) => (
        <Badge status={val === "Approved" ? "success" : val === "Rejected" ? "danger" : "warning"}>
          {val}
        </Badge>
      )
    },
    {
      key: "actions",
      label: "Actions",
      width: "200px",
      sortable: false,
      render: (_, row) => (
        <div style={{ display: "flex", gap: "6px" }}>
          <Button variant="ghost" size="sm" icon={Eye} onClick={() => handleViewRoster(row)}>
            Roster
          </Button>
          {row.status === "Pending" && (
            <>
              <Button
                variant="primary"
                size="sm"
                icon={Check}
                onClick={() => setConfirmDialog({ open: true, teamId: row.id, action: "approve" })}
              >
                Approve
              </Button>
              <Button
                variant="danger"
                size="sm"
                icon={X}
                onClick={() => setConfirmDialog({ open: true, teamId: row.id, action: "reject" })}
              >
                Reject
              </Button>
            </>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="nec-portal-page">
      <div className="nec-page-header">
        <h2 className="nec-page-title">Department Team Approvals & Registrations</h2>
        <p className="nec-page-desc">Review submitted department team rosters, verify player details, and approve tournament entries.</p>
      </div>

      <Table
        columns={columns}
        data={teams}
        loading={loading}
        searchPlaceholder="Search by team, department, captain..."
      />

      {/* Roster Preview Modal */}
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

      {/* Approval / Rejection Confirmation */}
      <ConfirmDialog
        isOpen={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, teamId: null, action: null })}
        onConfirm={handleAction}
        title={confirmDialog.action === "approve" ? "Approve Team Registration?" : "Reject Team Registration?"}
        message={`Are you sure you want to ${confirmDialog.action} this department team entry for NEC Sports Tournament?`}
        confirmVariant={confirmDialog.action === "approve" ? "primary" : "danger"}
        confirmLabel={confirmDialog.action === "approve" ? "Approve Entry" : "Reject Entry"}
      />
    </div>
  );
}
