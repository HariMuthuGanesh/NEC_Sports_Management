import React, { useEffect, useState } from "react";
import { tournamentsApi, teamsApi } from "../../services/api/apiServices";
import { useAuth } from "../../context/AuthContext";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import { Card } from "../../components/common/Card";
import { CheckSquare, Plus, Trophy, Calendar, Users, Send } from "lucide-react";
import "./CoordinatorPortal.css";

export default function EventRegistration() {
  const { currentUser } = useAuth();
  const myDept = currentUser.dept || "CSE";

  const [openEvents, setOpenEvents] = useState([]);
  const [deptTeams, setDeptTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [selectedEventId, setSelectedEventId] = useState("");
  const [teamName, setTeamName] = useState("");
  const [captainName, setCaptainName] = useState(currentUser.name || "Rahul Sharma");
  const [captainRoll, setCaptainRoll] = useState(currentUser.id || "2112045");

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const loadData = () => {
    setLoading(true);
    Promise.all([tournamentsApi.getEvents(), teamsApi.getTeams()]).then(([evList, tList]) => {
      const activeEv = evList.filter(e => e.status === "Open" || e.status === "Registration Open");
      setOpenEvents(activeEv);
      if (activeEv.length > 0) setSelectedEventId(activeEv[0].id);

      const filteredTeams = tList.filter(t => t.deptCode === myDept || myDept === "All");
      setDeptTeams(filteredTeams);
      setLoading(false);
    });
  };

  const handleRegisterTeam = (e) => {
    e.preventDefault();
    if (!teamName.trim() || !selectedEventId) return;

    const evObj = openEvents.find(e => e.id === selectedEventId);

    teamsApi.registerTeam({
      name: teamName,
      deptId: `dept_${myDept.toLowerCase()}`,
      deptCode: myDept,
      sportId: evObj ? evObj.sportId : "sp_football",
      captainName,
      captainRoll,
      memberCount: 1,
      status: "Pending"
    }).then(() => {
      setIsModalOpen(false);
      setTeamName("");
      loadData();
    });
  };

  const teamColumns = [
    { key: "name", label: "Registered Squad", render: (val) => <strong>{val}</strong> },
    { key: "deptCode", label: "Dept", width: "90px", render: (val) => <span>{val}</span> },
    { key: "sportId", label: "Sport", width: "130px", render: (val) => val.replace("sp_", "").toUpperCase() },
    { key: "captainName", label: "Captain", render: (val, row) => <span>{val} ({row.captainRoll})</span> },
    { key: "memberCount", label: "Squad Size", width: "110px", render: (val) => <span>{val} Athletes</span> },
    {
      key: "status",
      label: "Approval Status",
      width: "140px",
      render: (val) => (
        <Badge status={val === "Approved" ? "success" : val === "Rejected" ? "danger" : "warning"}>
          {val === "Approved" ? "Approved ✓" : val === "Pending" ? "Pending Approval" : "Rejected"}
        </Badge>
      )
    }
  ];

  return (
    <div className="nec-portal-page">
      <div className="nec-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 className="nec-page-title">Department Tournament Entry & Team Registration</h2>
          <p className="nec-page-desc">Register <strong>{myDept}</strong> department teams for open inter-department sports tournaments.</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setIsModalOpen(true)}>
          Register New Squad
        </Button>
      </div>

      <div className="nec-admin-main-grid">
        <Card title="Open Events & Tournament Deadlines" subtitle="Available championships accepting department registrations">
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {openEvents.length === 0 ? (
              <p>No open event registrations available right now.</p>
            ) : (
              openEvents.map(ev => (
                <div key={ev.id} style={{
                  padding: "14px",
                  borderRadius: "8px",
                  border: "1px solid var(--nec-border)",
                  backgroundColor: "var(--nec-surface-raised)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <div>
                    <strong style={{ fontSize: "1rem" }}>
                      {ev.title} ({ev.category})
                      {ev.eventCategory && <span style={{ marginLeft: "8px" }}><Badge status={ev.eventCategory === "Inter-College" ? "danger" : "info"}>{ev.eventCategory}</Badge></span>}
                    </strong>
                    <div style={{ fontSize: "0.8rem", color: "var(--nec-text-muted)", marginTop: "2px" }}>
                      Deadline: 📅 {ev.regDeadline} | Registered: {ev.registeredTeams} / {ev.maxTeams} Teams
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={Send}
                    onClick={() => {
                      setSelectedEventId(ev.id);
                      setTeamName(`${myDept} ${ev.sportId.replace("sp_", "").toUpperCase()}`);
                      setIsModalOpen(true);
                    }}
                  >
                    Enter Team
                  </Button>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card title="Submitted Department Entries" subtitle={`Status of ${myDept} team registrations submitted for PT Sir approval`}>
          <Table
            columns={teamColumns}
            data={deptTeams}
            loading={loading}
            searchable={false}
          />
        </Card>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Register ${myDept} Team for Tournament`}
      >
        <form onSubmit={handleRegisterTeam} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>Select Open Event</label>
            <select
              className="nec-table-search-input"
              style={{ maxWidth: "100%" }}
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
            >
              {openEvents.map(ev => (
                <option key={ev.id} value={ev.id}>{ev.title} ({ev.category}) - Deadline: {ev.regDeadline}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>Department Team Name</label>
            <input
              type="text"
              required
              className="nec-table-search-input"
              style={{ maxWidth: "100%" }}
              placeholder={`e.g. ${myDept} Strikers`}
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>Captain Name</label>
              <input
                type="text"
                required
                className="nec-table-search-input"
                style={{ maxWidth: "100%" }}
                value={captainName}
                onChange={(e) => setCaptainName(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>Captain Student Roll No</label>
              <input
                type="text"
                required
                className="nec-table-search-input"
                style={{ maxWidth: "100%" }}
                value={captainRoll}
                onChange={(e) => setCaptainRoll(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Submit Entry for Approval</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
