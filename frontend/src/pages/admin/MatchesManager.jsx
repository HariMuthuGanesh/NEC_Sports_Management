import React, { useEffect, useState } from "react";
import { matchesApi, sportsApi, teamsApi, tournamentsApi } from "../../services/api/apiServices";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import { Calendar, Plus, Trash2, AlertTriangle } from "lucide-react";
import "./AdminPortal.css";

export default function MatchesManager() {
  const [matches, setMatches] = useState([]);
  const [venues, setVenues] = useState([]);
  const [teams, setTeams] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [scheduleError, setScheduleError] = useState("");

  const [sport, setSport] = useState("Football");
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [venue, setVenue] = useState("");
  const [tournamentId, setTournamentId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState("10:00");
  // Round values must match DB ENUM: League | Quarter-Final | Semi-Final | Final
  const [round, setRound] = useState("League");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      matchesApi.getMatches(),
      sportsApi.getVenues(),
      teamsApi.getTeams(),
      tournamentsApi.getTournaments()
    ]).then(([mList, vList, tList, tourList]) => {
      setMatches(mList);
      setVenues(vList);
      setTeams(tList);
      setTournaments(tourList);
      if (tList.length >= 2) {
        setTeamA(tList[0].name);
        setTeamB(tList[1].name);
      }
      if (vList.length > 0) setVenue(vList[0].name);
      if (tourList.length > 0) setTournamentId(String(tourList[0].id || tourList[0].tournament_id));
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setError(err.message);
      setLoading(false);
    });
  };

  const handleSchedule = (e) => {
    e.preventDefault();
    setScheduleError("");
    if (!teamA || !teamB || !venue) {
      setScheduleError("Please select Team A, Team B, and a Venue.");
      return;
    }
    if (teamA === teamB) {
      setScheduleError("Team A and Team B must be different.");
      return;
    }
    if (!tournamentId) {
      setScheduleError("Please select a Tournament.");
      return;
    }

    matchesApi.scheduleMatch({
      sport,
      teamA,
      teamB,
      venue,
      date,
      time,
      round,
      tournament_id: Number(tournamentId)
    }).then(() => {
      setIsModalOpen(false);
      setScheduleError("");
      loadData();
    }).catch(err => {
      setScheduleError(err.message || "Failed to schedule match.");
    });
  };

  const handleDeleteMatch = (matchId) => {
    matchesApi.deleteMatch(matchId).then(() => {
      loadData();
    });
  };

  const columns = [
    { key: "sport", label: "Sport", width: "120px", render: (val) => <strong>{val || "—"}</strong> },
    { key: "eventCategory", label: "Category", width: "120px", render: (val) => <Badge status={val === "Inter-College" ? "danger" : "info"}>{val || "Intramural"}</Badge> },
    { key: "matchup", label: "Match Teams", render: (_, row) => <span>{row.teamA || "Team A"} ({row.deptA || "—"}) vs {row.teamB || "Team B"} ({row.deptB || "—"})</span> },
    { key: "schedule", label: "Date & Time", width: "180px", render: (_, row) => <span>📅 {row.date || "TBD"} • {row.time || "--:--"}</span> },
    { key: "venue", label: "Venue", width: "200px", render: (val) => <span>📍 {val || "TBD"}</span> },
    { key: "round", label: "Round", width: "130px" },
    {
      key: "status",
      label: "Status",
      width: "120px",
      render: (val) => (
        <Badge status={val === "Live" ? "live" : val === "Completed" ? "success" : "warning"}>
          {val || "Scheduled"}
        </Badge>
      )
    },
    {
      key: "actions",
      label: "Actions",
      width: "100px",
      sortable: false,
      render: (_, row) => (
        <Button variant="danger" size="sm" icon={Trash2} onClick={() => handleDeleteMatch(row.id || row.match_id)}>
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

      {error ? (
        <div style={{ padding: "40px" }}>
          <ErrorState onRetry={loadData} />
        </div>
      ) : (
        <Table
          columns={columns}
          data={matches}
          loading={loading}
          searchPlaceholder="Search by team, venue, sport..."
          emptyMessage="No matches scheduled yet."
        />
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setScheduleError(""); }}
        title="Schedule Match & Assign Venue"
      >
        <form onSubmit={handleSchedule} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

          {/* Tournament — required FK */}
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>Tournament *</label>
            <select
              className="nec-table-search-input"
              style={{ maxWidth: "100%" }}
              value={tournamentId}
              onChange={(e) => setTournamentId(e.target.value)}
              required
            >
              <option value="">-- Select Tournament --</option>
              {tournaments.map(t => (
                <option key={t.id || t.tournament_id} value={t.id || t.tournament_id}>{t.title || t.name}</option>
              ))}
            </select>
          </div>

          {/* Sport */}
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
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>Team A *</label>
              <select
                className="nec-table-search-input"
                style={{ maxWidth: "100%" }}
                value={teamA}
                onChange={(e) => setTeamA(e.target.value)}
                required
              >
                <option value="">-- Select Team --</option>
                {teams.map(t => <option key={t.id} value={t.name}>{t.name} ({t.deptCode})</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>Team B *</label>
              <select
                className="nec-table-search-input"
                style={{ maxWidth: "100%" }}
                value={teamB}
                onChange={(e) => setTeamB(e.target.value)}
                required
              >
                <option value="">-- Select Team --</option>
                {teams.map(t => <option key={t.id} value={t.name}>{t.name} ({t.deptCode})</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>Official Campus Venue *</label>
            <select
              className="nec-table-search-input"
              style={{ maxWidth: "100%" }}
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              required
            >
              <option value="">-- Select Venue --</option>
              {venues.map(v => <option key={v.id} value={v.name}>{v.name} ({v.type})</option>)}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>Date *</label>
              <input
                type="date"
                className="nec-table-search-input"
                style={{ maxWidth: "100%" }}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>Start Time</label>
              <input
                type="time"
                className="nec-table-search-input"
                style={{ maxWidth: "100%" }}
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
            <div>
              {/* Round must match DB ENUM: League | Quarter-Final | Semi-Final | Final */}
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>Round</label>
              <select
                className="nec-table-search-input"
                style={{ maxWidth: "100%" }}
                value={round}
                onChange={(e) => setRound(e.target.value)}
              >
                {["League", "Quarter-Final", "Semi-Final", "Final"].map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Error banner */}
          {scheduleError && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--nec-danger-bg)", border: "1px solid var(--nec-danger)", color: "var(--nec-danger-text)", padding: "10px 14px", borderRadius: "var(--nec-radius-md)", fontSize: "0.8125rem" }}>
              <AlertTriangle size={16} style={{ flexShrink: 0, color: "var(--nec-danger)" }} />
              <span>{scheduleError}</span>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <Button variant="outline" onClick={() => { setIsModalOpen(false); setScheduleError(""); }}>Cancel</Button>
            <Button type="submit" variant="primary">Confirm Schedule</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
