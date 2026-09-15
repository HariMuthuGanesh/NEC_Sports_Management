import React, { useEffect, useState } from "react";
import { tournamentsApi, teamsApi, sportsApi } from "../../services/api/apiServices";
import { useAuth } from "../../context/AuthContext";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import { Card } from "../../components/common/Card";
import Pagination from "../../components/common/Pagination";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import { CheckSquare, Plus, Trophy, Calendar, Users, Send } from "lucide-react";
import "./CoordinatorPortal.css";

export default function EventRegistration() {
  const { currentUser } = useAuth();
  const myDept = currentUser.dept || "CSE";

  const [openEvents, setOpenEvents] = useState([]);
  const [deptTeams, setDeptTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 4;

  const [selectedEventId, setSelectedEventId] = useState("");
  const [sports, setSports] = useState([]);
  const [selectedSportId, setSelectedSportId] = useState("");
  const [teamName, setTeamName] = useState("");
  const [captainName, setCaptainName] = useState(currentUser.name || "Rahul Sharma");
  const [captainRoll, setCaptainRoll] = useState(currentUser.id || "2112045");

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const loadData = () => {
    setLoading(true);
    setError(null);
    Promise.all([tournamentsApi.getEvents(), teamsApi.getTeams(), sportsApi.getSports()]).then(([evList, tList, sList]) => {
      const activeEv = evList.filter(e => e.status === "Open" || e.status === "Registration Open");
      setOpenEvents(activeEv);
      if (activeEv.length > 0) setSelectedEventId(activeEv[0].id);

      const filteredTeams = tList.filter(t => t.deptCode === myDept || myDept === "All");
      setDeptTeams(filteredTeams);
      setSports(sList || []);
      if (sList?.length > 0) setSelectedSportId(sList[0].sport_id || sList[0].id);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setError(err.message);
      setLoading(false);
    });
  };

  const handleEventChange = (eventId) => {
    setSelectedEventId(eventId);
    const ev = openEvents.find(e => String(e.id || e.event_id) === String(eventId));
    if (ev && (ev.sportId || ev.sport_id)) {
      setSelectedSportId(ev.sportId || ev.sport_id);
    }
  };

  const handleRegisterTeam = (e) => {
    e.preventDefault();
    if (!teamName.trim() || !selectedEventId) return;

    const evObj = openEvents.find(e => String(e.id || e.event_id) === String(selectedEventId));
    const resolvedSportId = selectedSportId || evObj?.sportId || evObj?.sport_id;

    teamsApi.registerTeam({
      name: teamName,
      deptCode: myDept,
      tournamentId: evObj?.tournamentId || evObj?.tournament_id,
      eventId: evObj?.id || evObj?.event_id || selectedEventId,
      sportId: resolvedSportId,
      captainName,
      captainRoll,
      memberCount: 1,
      status: "Pending"
    }).then(() => {
      setIsModalOpen(false);
      setTeamName("");
      loadData();
    }).catch(err => {
      alert("Registration failed: " + (err.message || "Unknown error"));
    });
  };

  const teamColumns = [
    { key: "name", label: "Registered Squad", render: (val) => <strong>{val}</strong> },
    { key: "deptCode", label: "Dept", width: "90px", render: (val) => <span>{val}</span> },
    { key: "sportId", label: "Sport", width: "130px", render: (val, row) => String(row.sportName || val || "Sport").replace("sp_", "").toUpperCase() },
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

      {error ? (
        <div style={{ padding: "40px" }}>
          <ErrorState onRetry={loadData} />
        </div>
      ) : (
        <div className="nec-admin-main-grid">
          <Card title="Open Events & Tournament Deadlines" subtitle="Available championships accepting department registrations">
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {openEvents.length === 0 ? (
                <p>No open event registrations available right now.</p>
              ) : (
                <>
                  {openEvents.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(ev => (
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
                          setTeamName(`${myDept} ${String(ev.sportName || ev.sportId || "Sport").replace("sp_", "").toUpperCase()}`);
                          setIsModalOpen(true);
                        }}
                      >
                        Enter Team
                      </Button>
                    </div>
                  ))}
                  {Math.ceil(openEvents.length / pageSize) > 1 && (
                    <Pagination
                      currentPage={currentPage}
                      totalPages={Math.ceil(openEvents.length / pageSize)}
                      onPageChange={setCurrentPage}
                      style={{ marginTop: "10px", border: "1px solid var(--nec-border)", borderRadius: "8px" }}
                    />
                  )}
                </>
              )}
            </div>
          </Card>

          <Card title="Submitted Department Entries" subtitle={`Status of ${myDept} team registrations submitted for PT Sir approval`}>
            <Table
              columns={teamColumns}
              data={deptTeams}
              loading={loading}
              searchable={false}
              emptyMessage={`No team registrations submitted by ${myDept} yet.`}
            />
          </Card>
        </div>
      )}

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
              onChange={(e) => handleEventChange(e.target.value)}
            >
              {openEvents.map(ev => (
                <option key={ev.id} value={ev.id}>{ev.title} ({ev.category}) - Deadline: {ev.regDeadline}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>Select Sport</label>
            <select
              className="nec-table-search-input"
              style={{ maxWidth: "100%" }}
              value={selectedSportId}
              onChange={(e) => setSelectedSportId(e.target.value)}
            >
              {sports.map(s => (
                <option key={s.sport_id || s.id} value={s.sport_id || s.id}>{s.name}</option>
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
