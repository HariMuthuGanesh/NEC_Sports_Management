import React, { useEffect, useState } from "react";
import { Card, StatCard } from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import Table from "../../components/common/Table";
import { useAuth } from "../../context/AuthContext";
import { matchesApi, playersApi, teamsApi, notificationsApi } from "../../services/api/apiServices";
import { Users, Calendar, Bell, Trophy, Shield, CheckCircle } from "lucide-react";
import "./PlayerPortal.css";

export default function PlayerDashboard() {
  const { currentUser } = useAuth();
  const playerDept = currentUser.dept || "MECH";
  const playerName = currentUser.name || "Priya Patel";

  const [myTeam, setMyTeam] = useState(null);
  const [myPlayerInfo, setMyPlayerInfo] = useState(null);
  const [teammates, setTeammates] = useState([]);
  const [myMatches, setMyMatches] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      teamsApi.getTeams(),
      playersApi.getAllPlayers(),
      matchesApi.getMatches(),
      notificationsApi.getNotifications()
    ]).then(([teams, players, matches, notifications]) => {
      // Find player object matching name or student ID
      const playerObj = players.find(p => p.name.toLowerCase().includes(playerName.toLowerCase()) || p.studentId === currentUser.id) || players[0];
      setMyPlayerInfo(playerObj);

      // Find team
      const teamObj = teams.find(t => t.id === playerObj?.teamId || t.deptCode === playerDept) || teams[0];
      setMyTeam(teamObj);

      // Load squad teammates
      if (teamObj) {
        setTeammates(players.filter(p => p.teamId === teamObj.id));
      }

      // Load matches for player's team or department
      const filteredMatches = matches.filter(m => 
        (teamObj && (m.teamA === teamObj.name || m.teamB === teamObj.name)) ||
        m.deptA === playerDept || m.deptB === playerDept
      );
      setMyMatches(filteredMatches.length > 0 ? filteredMatches : matches.slice(0, 4));

      setNotifs(notifications);
      setLoading(false);
    });
  }, [currentUser]);

  const columns = [
    { key: "sport", label: "Sport", width: "120px", render: (val) => <strong>{val}</strong> },
    { key: "matchup", label: "Fixture", render: (_, row) => <span><strong>{row.teamA}</strong> vs <strong>{row.teamB}</strong></span> },
    { key: "date", label: "Date & Time", width: "160px", render: (_, row) => <span>📅 {row.date} • {row.time}</span> },
    { key: "venue", label: "Venue", width: "180px", render: (val) => <span>📍 {val}</span> },
    {
      key: "status",
      label: "Status",
      width: "120px",
      render: (val) => (
        <Badge status={val === "Live" ? "live" : val === "Completed" ? "success" : "warning"}>
          {val}
        </Badge>
      )
    }
  ];

  const teammateColumns = [
    { key: "studentId", label: "Roll No", width: "110px", render: (val) => <strong>{val}</strong> },
    { key: "name", label: "Athlete", render: (val, row) => <span>{val} ({row.year})</span> },
    { key: "position", label: "Position", width: "120px" },
    { key: "jerseyNo", label: "Jersey #", width: "90px", render: (val) => <span>#{val}</span> }
  ];

  const nextMatch = myMatches.find(m => m.status === "Scheduled" || m.status === "Live") || myMatches[0];

  return (
    <div className="nec-portal-page">
      <div className="nec-page-header">
        <h2 className="nec-page-title">Student Athlete Portal</h2>
        <p className="nec-page-desc">Student Athlete: <strong>{playerName}</strong> | Department: <strong>{playerDept}</strong> | Roll No: <strong>{currentUser.id || "2114012"}</strong></p>
      </div>

      <div className="nec-stats-grid">
        <StatCard title="My Squad" value={myTeam ? myTeam.name : "Mech Titans"} subtext={`${playerDept} Department Squad`} icon={Users} color="navy" />
        <StatCard title="Next Match Fixture" value={nextMatch ? nextMatch.date : "Aug 14"} subtext={nextMatch ? `${nextMatch.time} at ${nextMatch.venue}` : "Scheduled Match"} icon={Calendar} color="gold" />
        <StatCard title="My Attendance Rate" value={`${myPlayerInfo?.attendancePct || 95}%`} subtext="Verified Athlete Eligibility" icon={Trophy} />
      </div>

      <div className="nec-admin-main-grid">
        <Card title="My Team Fixtures & Game Schedule" subtitle="Upcoming scheduled matches and live updates">
          <Table
            columns={columns}
            data={myMatches}
            loading={loading}
            searchable={false}
          />
        </Card>

        <Card title="My Squad & Teammates Roster" subtitle={`Team: ${myTeam?.name || "Department Team"} (${teammates.length} Athletes)`}>
          <Table
            columns={teammateColumns}
            data={teammates}
            loading={loading}
            searchable={false}
            pagination={false}
          />
        </Card>
      </div>

      <div style={{ marginTop: "24px" }}>
        <Card title="Recent Athlete Notifications & Circulars">
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {notifs.map(n => (
              <div key={n.id} style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "10px 14px", backgroundColor: "var(--nec-surface-raised)", borderRadius: "8px" }}>
                <Bell size={18} style={{ color: "var(--nec-gold)", marginTop: "2px" }} />
                <div>
                  <strong style={{ fontSize: "0.9rem" }}>{n.title}</strong>
                  <p style={{ margin: "2px 0 0 0", fontSize: "0.825rem", color: "var(--nec-text-muted)" }}>{n.message}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
