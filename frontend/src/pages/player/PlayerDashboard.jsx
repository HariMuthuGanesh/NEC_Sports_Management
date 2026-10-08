import React, { useEffect, useState } from "react";
import { Card, StatCard } from "../../components/common/Card";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import { useAuth } from "../../context/AuthContext";
import { matchesApi, teamsApi, playersApi, odApi } from "../../services/api/apiServices";
import ErrorState from "../../components/common/ErrorState";
import { Users, Calendar, Trophy, ArrowRight, FileText, Download, CheckCircle2, Clock, XCircle } from "lucide-react";
import "./PlayerPortal.css";

export default function PlayerDashboard({ onNavigate }) {
  const { currentUser, t } = useAuth();
  const playerDept = currentUser.dept || currentUser.studentProfile?.department_code || "CSE";
  const playerName = currentUser.name || currentUser.playerName || currentUser.studentProfile?.student_name || currentUser.username || "Athlete";
  const studentRegNo = currentUser.studentProfile?.register_number || currentUser.registerNumber;

  const [myTeam, setMyTeam] = useState(null);
  const [myPlayerInfo, setMyPlayerInfo] = useState(null);
  const [nextMatch, setNextMatch] = useState(null);
  const [matchHistory, setMatchHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [myOd, setMyOd] = useState([]);

  const loadData = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      teamsApi.getTeams(),
      playersApi.getAllPlayers(),
      matchesApi.getMatches()
    ]).then(([teams, playersResponse, matches]) => {
      const players = Array.isArray(playersResponse) ? playersResponse : playersResponse.data || [];
      const playerObj = players.find(p => p.name?.toLowerCase().includes(playerName.toLowerCase()) || p.studentId === currentUser.id) || players[0];
      setMyPlayerInfo(playerObj);

      const teamObj = teams.find(t => t.id === playerObj?.teamId || t.deptCode === playerDept) || teams[0];
      setMyTeam(teamObj);

      const filteredMatches = matches.filter(m =>
        (teamObj && (m.teamA === teamObj.name || m.teamB === teamObj.name || m.team_a_id === teamObj.id || m.team_b_id === teamObj.id)) ||
        m.deptA === playerDept || m.deptB === playerDept
      );
      setNextMatch(filteredMatches.find(m => m.status === "Scheduled" || m.status === "Ongoing") || filteredMatches[0]);
      setMatchHistory(filteredMatches);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setError(err.message);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
    // Load OD letters separately (won't break the main dashboard if it fails)
    odApi.getMyOd()
      .then(data => setMyOd(Array.isArray(data) ? data : []))
      .catch(() => setMyOd([]));
  }, [currentUser, playerDept, playerName]);

  return (
    <div className="nec-portal-page">
      <div className="nec-page-header">
        <h2 className="nec-page-title">{playerName}</h2>
        <p className="nec-page-desc">
          Department: <strong>{playerDept}</strong>
          {studentRegNo ? <> &middot; Register No: <strong>{studentRegNo}</strong></> : null}
        </p>
      </div>

      {error ? (
        <div style={{ padding: "40px" }}>
          <ErrorState onRetry={loadData} />
        </div>
      ) : (
        <>
          <div className="nec-stats-grid">
            <StatCard title={t.mySquad || "My Squad"} value={myTeam ? myTeam.name : "Loading..."} subtext={`${playerDept} Department Squad`} icon={Users} color="navy" />
            <StatCard title={t.nextMatchFixture || "Next Match Fixture"} value={nextMatch ? nextMatch.date : "TBD"} subtext={nextMatch ? `${nextMatch.time} at ${nextMatch.venue}` : "Check Schedule"} icon={Calendar} color="gold" />
            <StatCard title={t.myAttendanceRate || "My Attendance Rate"} value={`${myPlayerInfo?.attendancePct || 95}%`} subtext="Verified Athlete Eligibility" icon={Trophy} color="success" />
          </div>

          <div className="nec-admin-main-grid" style={{ marginTop: "20px" }}>
            <Card title="Quick Links">
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <Button variant="primary" onClick={() => onNavigate && onNavigate("player_performance")} style={{ justifyContent: "space-between" }}>
                  <span>Digital Sports Portfolio & Performance Report</span> <ArrowRight size={16} />
                </Button>
                <Button variant="outline" onClick={() => onNavigate && onNavigate("player_team")} style={{ justifyContent: "space-between" }}>
                  <span>My Squad Roster</span> <ArrowRight size={16} />
                </Button>
                <Button variant="outline" onClick={() => onNavigate && onNavigate("player_matches")} style={{ justifyContent: "space-between" }}>
                  <span>My Match Schedule & Results</span> <ArrowRight size={16} />
                </Button>
                <Button variant="outline" onClick={() => onNavigate && onNavigate("notifications")} style={{ justifyContent: "space-between" }}>
                  <span>Inbox & Official Circulars</span> <ArrowRight size={16} />
                </Button>
              </div>
            </Card>

            {/* ── My OD Letters ── */}
            <Card title="My OD Letters">
              {myOd.length === 0 ? (
                <div style={{ textAlign: "center", padding: "20px", color: "var(--nec-text-muted)", fontSize: "0.85rem" }}>
                  <FileText size={32} style={{ opacity: 0.25, marginBottom: "8px" }} />
                  <p style={{ margin: 0 }}>No OD requests found.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {myOd.slice(0, 5).map(od => {
                    const matchDate = od.from_date
                      ? new Date(od.from_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                      : "-";
                    return (
                      <div key={od.request_id} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "10px 14px",
                        background: od.approval_status === "Approved" ? "#ecfdf5" : od.approval_status === "Rejected" ? "#fef2f2" : "#fffbeb",
                        border: `1px solid ${od.approval_status === "Approved" ? "#a7f3d0" : od.approval_status === "Rejected" ? "#fecaca" : "#fde68a"}`,
                        borderRadius: "8px"
                      }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{od.tournament_name}</div>
                          <div style={{ fontSize: "0.78rem", color: "var(--nec-text-muted)" }}>
                            {od.sport_name ? od.sport_name + " · " : ""}{matchDate}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          {od.approval_status === "Approved" && (
                            <Badge status="success"><CheckCircle2 size={11} style={{ verticalAlign: "middle", marginRight: 3 }} />Approved</Badge>
                          )}
                          {od.approval_status === "Pending" && (
                            <Badge status="warning"><Clock size={11} style={{ verticalAlign: "middle", marginRight: 3 }} />Pending</Badge>
                          )}
                          {od.approval_status === "Rejected" && (
                            <Badge status="danger"><XCircle size={11} style={{ verticalAlign: "middle", marginRight: 3 }} />Rejected</Badge>
                          )}
                          {od.approval_status === "Approved" && (
                            <button
                              onClick={() => {
                                const fromDate = new Date(od.from_date).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
                                const approvedDate = od.approved_at ? new Date(od.approved_at).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) : new Date().toLocaleDateString("en-IN");
                                const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>OD Letter</title><style>body{font-family:"Times New Roman",serif;font-size:13pt;margin:40px 60px}h2{text-align:center}hr{border:1.5px solid #000;margin:8px 0 24px}.meta{display:flex;justify-content:space-between;margin-bottom:20px}table{width:100%;border-collapse:collapse;margin:16px 0}td{padding:6px 10px}td:first-child{width:200px;font-weight:bold}.sign{margin-top:60px;text-align:right}</style></head><body><h2>NATIONAL ENGINEERING COLLEGE</h2><div style="text-align:center;font-size:11pt;color:#444">Kovilpatti, 628 503, Thoothukudi District, Tamil Nadu</div><hr/><div class="meta"><span>Ref: NEC/DPE/OD/${od.request_id}/${new Date().getFullYear()}</span><span>Date: ${approvedDate}</span></div><p><strong>TO WHOM IT MAY CONCERN</strong></p><p>This is to certify that the following student has been deputed to participate in <strong>${od.tournament_name}</strong>${od.sport_name ? " (" + od.sport_name + ")" : ""} on official duty.</p><table><tr><td>Student Name</td><td>: ${od.student_name}</td></tr><tr><td>Register Number</td><td>: ${od.register_number}</td></tr><tr><td>Department</td><td>: ${od.department_name}</td></tr><tr><td>Period of OD</td><td>: ${fromDate} (${od.total_days} day)</td></tr></table><p>Kindly treat the absence as <strong>On Duty (OD)</strong> for attendance purposes.</p><div class="sign"><div style="border-top:1px solid #000;display:inline-block;width:200px;margin-bottom:4px"></div><br/><strong>Director of Physical Education</strong><br/>National Engineering College</div></body></html>`;
                                const blob = new Blob([html], { type: "text/html" });
                                const url = URL.createObjectURL(blob);
                                window.open(url, "_blank");
                              }}
                              title="Download OD Letter"
                              style={{ background: "none", border: "none", cursor: "pointer", color: "#2563eb", display: "flex", alignItems: "center", gap: "3px", fontSize: "0.78rem", fontWeight: 600 }}
                            >
                              <Download size={13} /> Letter
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {myOd.length > 5 && (
                    <div style={{ textAlign: "center", fontSize: "0.8rem", color: "var(--nec-text-muted)" }}>
                      +{myOd.length - 5} more (view in notifications)
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>

          {/* ── Recent Match History Row ── */}
          <div style={{ marginTop: "20px" }}>
            <Card
              title="Recent Match History"
              headerAction={
                <Button variant="outline" size="sm" onClick={() => onNavigate && onNavigate("player_matches")}>
                  Full Schedule & Results <ArrowRight size={14} style={{ marginLeft: 4 }} />
                </Button>
              }
            >
              {matchHistory.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px", color: "var(--nec-text-muted)", fontSize: "0.85rem" }}>
                  <Calendar size={32} style={{ opacity: 0.3, marginBottom: "8px" }} />
                  <p style={{ margin: 0 }}>No match fixtures recorded.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {matchHistory.slice(0, 5).map((m, idx) => {
                    const isWin = (m.winner_team_id && myTeam && m.winner_team_id === (myTeam.id || myTeam.team_id)) || (m.winner && myTeam && m.winner === myTeam.name);
                    const isCompleted = m.status === "Completed";
                    return (
                      <div key={m.id || m.match_id || idx} style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "12px 16px",
                        borderRadius: "8px",
                        border: "1px solid var(--nec-border)",
                        background: "var(--nec-surface-raised)"
                      }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>
                            {m.teamA || m.team_a_name} vs {m.teamB || m.team_b_name}
                          </div>
                          <div style={{ fontSize: "0.78rem", color: "var(--nec-text-muted)", marginTop: 2 }}>
                            {m.sport || m.sport_name || "Match"} &middot; {m.date ? new Date(m.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : m.time || "Scheduled"} &middot; {m.venue || "Campus Ground"}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          {isCompleted ? (
                            <>
                              <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>
                                {m.scoreA !== undefined && m.scoreB !== undefined ? `${m.scoreA} - ${m.scoreB}` : m.score || "Completed"}
                              </span>
                              <Badge status={isWin ? "success" : "neutral"}>
                                {isWin ? "Won" : "Played"}
                              </Badge>
                            </>
                          ) : (
                            <Badge status="warning">
                              {m.status || "Scheduled"}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
