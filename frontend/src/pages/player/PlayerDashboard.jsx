import React, { useEffect, useState } from "react";
import { Card, StatCard } from "../../components/common/Card";
import Button from "../../components/common/Button";
import { useAuth } from "../../context/AuthContext";
import { matchesApi, teamsApi, playersApi } from "../../services/api/apiServices";
import { Users, Calendar, Trophy, ArrowRight } from "lucide-react";
import "./PlayerPortal.css";

export default function PlayerDashboard({ onNavigate }) {
  const { currentUser, t } = useAuth();
  const playerDept = currentUser.dept || "MECH";
  const playerName = currentUser.name || "Priya Patel";

  const [myTeam, setMyTeam] = useState(null);
  const [myPlayerInfo, setMyPlayerInfo] = useState(null);
  const [nextMatch, setNextMatch] = useState(null);

  useEffect(() => {
    Promise.all([
      teamsApi.getTeams(),
      playersApi.getAllPlayers(),
      matchesApi.getMatches()
    ]).then(([teams, players, matches]) => {
      const playerObj = players.find(p => p.name.toLowerCase().includes(playerName.toLowerCase()) || p.studentId === currentUser.id) || players[0];
      setMyPlayerInfo(playerObj);

      const teamObj = teams.find(t => t.id === playerObj?.teamId || t.deptCode === playerDept) || teams[0];
      setMyTeam(teamObj);

      const filteredMatches = matches.filter(m => 
        (teamObj && (m.teamA === teamObj.name || m.teamB === teamObj.name)) ||
        m.deptA === playerDept || m.deptB === playerDept
      );
      setNextMatch(filteredMatches.find(m => m.status === "Scheduled" || m.status === "Live") || filteredMatches[0]);
    });
  }, [currentUser, playerDept, playerName]);

  return (
    <div className="nec-portal-page">
      <div className="nec-page-header">
        <h2 className="nec-page-title">{t.playerDashboardTitle || "Student Athlete Portal"}</h2>
        <p className="nec-page-desc">Student Athlete: <strong>{playerName}</strong> | Department: <strong>{playerDept}</strong></p>
      </div>

      <div className="nec-stats-grid">
        <StatCard title={t.mySquad || "My Squad"} value={myTeam ? myTeam.name : "Loading..."} subtext={`${playerDept} Department Squad`} icon={Users} color="navy" />
        <StatCard title={t.nextMatchFixture || "Next Match Fixture"} value={nextMatch ? nextMatch.date : "TBD"} subtext={nextMatch ? `${nextMatch.time} at ${nextMatch.venue}` : "Check Schedule"} icon={Calendar} color="gold" />
        <StatCard title={t.myAttendanceRate || "My Attendance Rate"} value={`${myPlayerInfo?.attendancePct || 95}%`} subtext="Verified Athlete Eligibility" icon={Trophy} color="success" />
      </div>

      <div className="nec-admin-main-grid" style={{ marginTop: "20px" }}>
        <Card title="Quick Links">
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <Button variant="outline" onClick={() => onNavigate && onNavigate("player_team")} style={{ justifyContent: "space-between" }}>
              View My Full Roster & Coach Notes <ArrowRight size={16} />
            </Button>
            <Button variant="outline" onClick={() => onNavigate && onNavigate("player_matches")} style={{ justifyContent: "space-between" }}>
              My Match Schedule & Results <ArrowRight size={16} />
            </Button>
            <Button variant="outline" onClick={() => onNavigate && onNavigate("player_notifs")} style={{ justifyContent: "space-between" }}>
              Inbox & Official Circulars <ArrowRight size={16} />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
