import React, { useEffect, useState } from "react";
import { Card, StatCard } from "../../components/common/Card";
import Table from "../../components/common/Table";
import { useAuth } from "../../context/AuthContext";
import { playersApi, teamsApi } from "../../services/api/apiServices";
import { Users, Shield, UserCircle, Star } from "lucide-react";
import "./PlayerPortal.css";

export default function PlayerTeam() {
  const { currentUser, t } = useAuth();
  const playerDept = currentUser.dept || "MECH";
  const playerName = currentUser.name || "Priya Patel";

  const [myTeam, setMyTeam] = useState(null);
  const [myPlayerInfo, setMyPlayerInfo] = useState(null);
  const [teammates, setTeammates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      teamsApi.getTeams(),
      playersApi.getAllPlayers()
    ]).then(([teams, players]) => {
      const playerObj = players.find(p => p.name.toLowerCase().includes(playerName.toLowerCase()) || p.studentId === currentUser.id) || players[0];
      setMyPlayerInfo(playerObj);

      const teamObj = teams.find(t => t.id === playerObj?.teamId || t.deptCode === playerDept) || teams[0];
      setMyTeam(teamObj);

      if (teamObj) {
        setTeammates(players.filter(p => p.teamId === teamObj.id));
      }

      setLoading(false);
    });
  }, [currentUser, playerDept, playerName]);

  const teammateColumns = [
    { key: "studentId", label: "Roll No", width: "110px", render: (val) => <strong>{val}</strong> },
    { key: "name", label: "Athlete", render: (val, row) => <span>{val} ({row.year})</span> },
    { key: "position", label: "Position", width: "120px" },
    { key: "jerseyNo", label: "Jersey #", width: "90px", render: (val) => <span>#{val}</span> }
  ];

  return (
    <div className="nec-portal-page">
      <div className="nec-page-header">
        <h2 className="nec-page-title">{t.mySquad || "My Squad & Team Info"}</h2>
        <p className="nec-page-desc">View your teammates, coach notes, and team statistics.</p>
      </div>

      <div className="nec-stats-grid">
        <StatCard title="Team Name" value={myTeam ? myTeam.name : "Loading..."} subtext={`${playerDept} Department`} icon={Users} color="navy" />
        <StatCard title="Coach / Coordinator" value={myTeam?.coordinatorId || "Assigned by HOD"} subtext="Primary Contact" icon={UserCircle} color="gold" />
        <StatCard title="My Position" value={myPlayerInfo?.position || "Player"} subtext={`Jersey #${myPlayerInfo?.jerseyNo || "00"}`} icon={Star} color="success" />
      </div>

      <Card title="Team Roster" subtitle={`Team: ${myTeam?.name || "Department Team"} (${teammates.length} Athletes)`}>
        <Table
          columns={teammateColumns}
          data={teammates}
          loading={loading}
          searchable={true}
          pagination={false}
        />
      </Card>
      
      <div style={{ marginTop: "24px" }}>
        <Card title="Coach Notes & Strategies" icon={Shield}>
          <div style={{ padding: "16px", backgroundColor: "var(--nec-surface-raised)", borderRadius: "8px", fontStyle: "italic", color: "var(--nec-text-muted)" }}>
            "Focus on stamina building this week. Evening practice starts at 5:00 PM strictly. Ensure adequate hydration."
            <br /><br />
            - <strong>{myTeam?.coordinatorId || "Team Coach"}</strong>
          </div>
        </Card>
      </div>
    </div>
  );
}
