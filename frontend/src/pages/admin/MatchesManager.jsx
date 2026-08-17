import React, { useEffect, useState } from "react";
import { matchesApi, sportsApi, teamsApi } from "../../services/api/apiServices";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import { Calendar, Plus, MapPin, Clock, Trash2 } from "lucide-react";
import "./AdminPortal.css";

export default function MatchesManager() {
  const [matches, setMatches] = useState([]);
  const [venues, setVenues] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [sport, setSport] = useState("Football");
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [venue, setVenue] = useState("");
  const [date, setDate] = useState("2026-08-16");
  const [time, setTime] = useState("04:00 PM");
  const [round, setRound] = useState("Quarter Final");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setLoading(true);
    Promise.all([matchesApi.getMatches(), sportsApi.getVenues(), teamsApi.getTeams()]).then(([mList, vList, tList]) => {
      setMatches(mList);
      setVenues(vList);
      setTeams(tList);
      if (tList.length >= 2) {
        setTeamA(tList[0].name);
        setTeamB(tList[1].name);
      }
      if (vList.length > 0) setVenue(vList[0].name);
      setLoading(false);
    });
  };

  const handleSchedule = (e) => {
    e.preventDefault();
    if (!teamA || !teamB || !venue) return;

    const tAObj = teams.find(t => t.name === teamA);
    const tBObj = teams.find(t => t.name === teamB);

    matchesApi.scheduleMatch({
      sport,
      teamA,
      teamB,
      deptA: tAObj ? tAObj.deptCode : "NEC",
      deptB: tBObj ? tBObj.deptCode : "NEC",
      venue,
      date,
      time,
      round
    }).then(() => {
      setIsModalOpen(false);
      loadData();
    });
  };

  const handleDeleteMatch = (matchId) => {
    matchesApi.deleteMatch(matchId).then(() => {
      loadData();
    });
  };

  const columns = [
    { key: "sport", label: "Sport", width: "120px", render: (val) => <strong>{val}</strong> },
    { key: "matchup", label: "Match Teams", render: (_, row) => <span>{row.teamA} ({row.deptA}) vs {row.teamB} ({row.deptB})</span> },
    { key: "schedule", label: "Date & Time", width: "180px", render: (_, row) => <span>📅 {row.date} • {row.time}</span> },
    { key: "venue", label: "Venue", width: "200px", render: (val) => <span>📍 {val}</span> },
    { key: "round", label: "Round", width: "130px" },
    {
      key: "status",
      label: "Status",
      width: "120px",
      render: (val) => (
        <Badge status={val === "Live" ? "live" : val === "Completed" ? "success" : "warning"}>
          {val}
        </Badge>
      )
    },
    {
      key: "actions",
      label: "Actions",
      width: "100px",
      sortable: false,
      render: (_, row) => (
        <Button variant="danger" size="sm" icon={Trash2} onClick={() => handleDeleteMatch(row.id)}>
          Cancel
        </Button>
      )
    }
  ];

  return (
    <div className="nec-portal-page">
      <div className="nec-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 className="nec-page-title">Match Scheduler & Venue Management</h2>
          <p className="nec-page-desc">Schedule matches, assign official campus venues, and prevent scheduling conflicts.</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setIsModalOpen(true)}>
          Schedule New Match
        </Button>
      </div>

      <Table
        columns={columns}
        data={matches}
        loading={loading}
        searchPlaceholder="Search by team, venue, sport..."
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Schedule Match & Assign Venue"
      >
        <form onSubmit={handleSchedule} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>Sport</label>
            <select
              className="nec-table-search-input"
              style={{ maxWidth: "100%" }}
              value={sport}
              onChange={(e) => setSport(e.target.value)}
            >
              {["Football", "Cricket", "Basketball", "Volleyball", "Badminton", "Table Tennis", "Athletics", "Chess"].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>Team A</label>
              <select
                className="nec-table-search-input"
                style={{ maxWidth: "100%" }}
                value={teamA}
                onChange={(e) => setTeamA(e.target.value)}
              >
                {teams.map(t => <option key={t.id} value={t.name}>{t.name} ({t.deptCode})</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>Team B</label>
              <select
                className="nec-table-search-input"
                style={{ maxWidth: "100%" }}
                value={teamB}
                onChange={(e) => setTeamB(e.target.value)}
              >
                {teams.map(t => <option key={t.id} value={t.name}>{t.name} ({t.deptCode})</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>Official Campus Venue</label>
            <select
              className="nec-table-search-input"
              style={{ maxWidth: "100%" }}
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
            >
              {venues.map(v => <option key={v.id} value={v.name}>{v.name} ({v.type})</option>)}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>Date</label>
              <input
                type="date"
                className="nec-table-search-input"
                style={{ maxWidth: "100%" }}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>Start Time</label>
              <input
                type="text"
                className="nec-table-search-input"
                style={{ maxWidth: "100%" }}
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>Round</label>
              <input
                type="text"
                className="nec-table-search-input"
                style={{ maxWidth: "100%" }}
                value={round}
                onChange={(e) => setRound(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Confirm Schedule</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
