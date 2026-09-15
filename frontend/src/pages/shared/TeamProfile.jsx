import React, { useState, useEffect } from "react";
import { teamsApi } from "../../services/api/apiServices";
import {
  Shield,
  Award,
  Calendar,
  MapPin,
  ChevronLeft,
  Users,
  CheckCircle2,
  AlertCircle,
  Activity,
  Layers,
  Phone,
  Mail,
  Shirt
} from "lucide-react";
import { Card } from "../../components/common/Card";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import "../captain/CaptainPortal.css";

export default function TeamProfile({ teamId, id: propId, onNavigate }) {
  const targetId = teamId || propId;
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (targetId) {
      fetchTeamDetails();
    } else {
      setLoading(false);
      setError("No team ID specified");
    }
  }, [targetId]);

  const fetchTeamDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await teamsApi.getTeamDetails(targetId);
      setTeam(data);
    } catch (err) {
      console.error("Failed to load team profile:", err);
      setError(err.message || "Could not load team details");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "50vh", gap: "12px" }}>
        <div style={{ width: "36px", height: "36px", border: "4px solid var(--nec-border)", borderTopColor: "var(--nec-blue)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <p style={{ color: "var(--nec-text-muted)", fontSize: "0.9rem" }}>Loading team profile & athlete roster...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div style={{ maxWidth: "600px", margin: "40px auto", padding: "20px" }}>
        <Card style={{ textAlign: "center", padding: "36px 20px" }}>
          <AlertCircle size={44} style={{ color: "var(--nec-danger)", margin: "0 auto 12px auto" }} />
          <h2 style={{ margin: "0 0 6px 0", fontSize: "1.3rem" }}>Team Profile Not Found</h2>
          <p style={{ color: "var(--nec-text-muted)", fontSize: "0.85rem", marginBottom: "20px" }}>
            {error || "The requested team details could not be loaded."}
          </p>
          <Button
            variant="outline"
            icon={ChevronLeft}
            onClick={() => onNavigate ? onNavigate("captain_dash") : window.history.back()}
          >
            Back to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="nec-team-profile-page">
      {/* Navigation Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Button
          variant="ghost"
          size="sm"
          icon={ChevronLeft}
          onClick={() => onNavigate ? onNavigate("captain_dash") : window.history.back()}
        >
          Back to Overview
        </Button>
        <Badge status={team.status === "Approved" ? "success" : "warning"}>
          {team.status || "Pending Review"}
        </Badge>
      </div>

      {/* Main Team Banner Card */}
      <div className="nec-team-profile-banner">
        <div className="nec-team-profile-banner-top">
          <div className="nec-team-profile-title-group">
            <div className="nec-team-profile-pill-row">
              <span className="nec-team-profile-pill">
                {team.sportName} • {team.sportCategory || "Outdoor"}
              </span>
              <span className="nec-team-profile-pill">
                {team.deptName || team.deptCode}
              </span>
              {team.academicYear && (
                <span className="nec-team-profile-pill">
                  {team.academicYear}
                </span>
              )}
            </div>

            <h1 className="nec-team-profile-name">
              <Shield size={32} />
              <span>{team.name}</span>
            </h1>

            <p className="nec-team-profile-sub">
              Registered in <strong>{team.tournamentName || "Inter-Collegiate Tournament"}</strong>
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {team.coachName && (
              <div style={{ background: "rgba(255,255,255,0.1)", padding: "10px 16px", borderRadius: "8px" }}>
                <span style={{ fontSize: "0.72rem", opacity: 0.8, textTransform: "uppercase", display: "block" }}>Head Coach</span>
                <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{team.coachName}</span>
              </div>
            )}
            {team.jerseyColor && (
              <div style={{ background: "rgba(255,255,255,0.1)", padding: "10px 16px", borderRadius: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                <Shirt size={16} />
                <div>
                  <span style={{ fontSize: "0.72rem", opacity: 0.8, textTransform: "uppercase", display: "block" }}>Jersey Color</span>
                  <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{team.jerseyColor}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Captain and Cross-Department Athlete Breakdown */}
      <div className="nec-team-profile-grid">
        {/* Captain Profile Card */}
        <Card title="Team Captain" subtitle="Designated squad lead">
          {team.captain ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "var(--nec-navy)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "1.1rem" }}>
                  {team.captain.name?.charAt(0) || "C"}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: "1rem" }}>{team.captain.name}</h4>
                  <span style={{ fontSize: "0.78rem", color: "var(--nec-text-muted)", fontFamily: "monospace" }}>
                    Roll: {team.captain.rollNo || team.captain.studentId}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.825rem", borderTop: "1px solid var(--nec-border)", paddingTop: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--nec-text-muted)" }}>Department</span>
                  <Badge status="neutral">{team.captain.dept_code || team.captain.dept}</Badge>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--nec-text-muted)" }}>Batch / Year</span>
                  <span style={{ fontWeight: 600 }}>Class of {team.captain.year || 2026}</span>
                </div>
                {team.captain.personal_email && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--nec-text-muted)" }}>Email</span>
                    <span style={{ fontWeight: 500 }}>{team.captain.personal_email}</span>
                  </div>
                )}
                {team.captain.personal_phone && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--nec-text-muted)" }}>Phone</span>
                    <span style={{ fontWeight: 500 }}>{team.captain.personal_phone}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p style={{ margin: 0, color: "var(--nec-text-muted)", fontSize: "0.85rem" }}>
              No captain assigned to this squad yet.
            </p>
          )}
        </Card>

        {/* Multi-Department Roster Breakdown */}
        <Card
          title="Multi-Department Athlete Representation"
          subtitle={`Total squad roster: ${team.players?.length || 0} athletes`}
        >
          <p style={{ margin: 0, fontSize: "0.825rem", color: "var(--nec-text-muted)" }}>
            Athletes representing this squad across academic branches. Matchday attendance logs automatically route to each athlete's department coordinator.
          </p>

          <div className="nec-dept-breakdown-grid">
            {Object.entries(team.deptBreakdown || {}).map(([dept, count]) => (
              <div key={dept} className="nec-dept-box">
                <span className="nec-dept-box-label">{dept}</span>
                <span className="nec-dept-box-count">{count}</span>
                <span style={{ fontSize: "0.72rem", color: "var(--nec-text-muted)", marginTop: "4px" }}>
                  {Math.round((count / (team.players?.length || 1)) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Official Squad Roster Table */}
      <Card
        title="Official Squad Roster"
        subtitle="Verified athletes enrolled for inter-departmental and collegiate fixtures"
        headerAction={
          <span style={{ fontSize: "0.8rem", color: "var(--nec-text-muted)", fontWeight: 600 }}>
            {team.players?.length || 0} Athletes
          </span>
        }
      >
        <div className="nec-attendance-table-wrap">
          <table className="nec-attendance-table">
            <thead>
              <tr>
                <th style={{ width: "60px" }}>#</th>
                <th>Athlete Name</th>
                <th>Register Number</th>
                <th>Department</th>
                <th>Squad Role</th>
                <th>Medical Fitness</th>
              </tr>
            </thead>
            <tbody>
              {team.players && team.players.length > 0 ? (
                team.players.map((player, idx) => (
                  <tr key={player.id || idx}>
                    <td>
                      <span className="nec-jersey-badge">
                        {player.jerseyNo ? `#${player.jerseyNo}` : `${idx + 1}`}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                        <span>{player.name}</span>
                        {player.role === "Captain" && (
                          <Badge status="warning">CAPTAIN</Badge>
                        )}
                      </span>
                    </td>
                    <td style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "var(--nec-text-muted)" }}>
                      {player.rollNo || player.studentId}
                    </td>
                    <td>
                      <Badge status="neutral">{player.dept_code || player.dept}</Badge>
                    </td>
                    <td style={{ color: "var(--nec-text-muted)" }}>
                      {player.role || player.position || "Player"}
                    </td>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "var(--nec-success)", fontSize: "0.8rem", fontWeight: 600 }}>
                        <CheckCircle2 size={14} />
                        <span>Medical Fit</span>
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ padding: "36px", textAlign: "center", color: "var(--nec-text-muted)" }}>
                    No athletes enrolled in this squad roster yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Match Fixtures Log */}
      {team.matches && team.matches.length > 0 && (
        <Card title="Fixtures & Match Log" subtitle="Scheduled and completed matches">
          <div className="nec-fixtures-grid">
            {team.matches.map((m) => (
              <div key={m.id} className="nec-fixture-card">
                <div className="nec-fixture-header">
                  <span className="nec-fixture-pool-tag">
                    {m.pool || "Pool A"} • {m.round}
                  </span>
                  <span>{new Date(m.date).toLocaleDateString()}</span>
                </div>

                <div className="nec-fixture-teams-row">
                  <span>{m.teamA}</span>
                  <div className="nec-fixture-score-box">
                    {m.scoreA} : {m.scoreB}
                  </div>
                  <span>{m.teamB}</span>
                </div>

                <div className="nec-fixture-footer">
                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <MapPin size={14} />
                    <span>{m.ground || m.venue || "Main Ground"}</span>
                  </span>
                  <Badge status={m.status === "Completed" ? "success" : "warning"}>
                    {m.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
