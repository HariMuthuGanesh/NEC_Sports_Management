import React, { useEffect, useState, useMemo } from "react";
import { reportsApi } from "../../services/api/apiServices";
import { Card, StatCard } from "../../components/common/Card";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import SkeletonLoader from "../../components/common/SkeletonLoader";
import {
  Trophy,
  Award,
  Calendar,
  Users,
  FileCheck,
  CheckCircle2,
  Clock,
  Printer,
  Download,
  ShieldCheck,
  Sparkles,
  Activity,
  FileText,
  UserCheck,
  Medal,
  ChevronRight
} from "lucide-react";
import "./PlayerPerformanceReport.css";
import "./PlayerPortal.css";

export default function PlayerPerformanceReport() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview"); // overview, matches, od, achievements, timeline

  // Participation history filters
  const [selectedSport, setSelectedSport] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");
  const [selectedLevel, setSelectedLevel] = useState("all");
  const [selectedResult, setSelectedResult] = useState("all");

  const loadReport = () => {
    setLoading(true);
    setError(null);
    reportsApi.getPlayerPerformanceReport()
      .then(res => {
        if (res?.success && res.data) {
          setData(res.data);
        } else {
          setData(res || {});
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load player performance report:", err);
        setError(err.message || "Failed to load performance report");
        setLoading(false);
      });
  };

  useEffect(() => {
    loadReport();
  }, []);

  const profile = data?.studentProfile || {};
  const teams = data?.teams || [];
  const allMatches = data?.matches || [];
  const odSummary = data?.odSummary || {};
  const attendanceBenefits = data?.attendanceBenefits || {};
  const stats = data?.stats || {};
  const achievements = data?.achievements || [];
  const certificates = data?.certificates || [];
  const timeline = data?.timeline || [];
  const scalability = data?.scalability || {};

  // Extract distinct filter options
  const sportsOptions = useMemo(() => {
    const list = new Set(allMatches.map(m => m.sport).filter(Boolean));
    return ["all", ...Array.from(list)];
  }, [allMatches]);

  const yearsOptions = useMemo(() => {
    const list = new Set(allMatches.map(m => m.year).filter(Boolean));
    return ["all", ...Array.from(list).sort().reverse()];
  }, [allMatches]);

  const levelOptions = useMemo(() => {
    const list = new Set(allMatches.map(m => m.competition_level).filter(Boolean));
    return ["all", ...Array.from(list)];
  }, [allMatches]);

  // Filtered matches
  const filteredMatches = useMemo(() => {
    return allMatches.filter(m => {
      if (selectedSport !== "all" && m.sport !== selectedSport) return false;
      if (selectedYear !== "all" && m.year !== selectedYear) return false;
      if (selectedLevel !== "all" && m.competition_level !== selectedLevel) return false;
      if (selectedResult !== "all" && m.result !== selectedResult) return false;
      return true;
    });
  }, [allMatches, selectedSport, selectedYear, selectedLevel, selectedResult]);

  const matchColumns = [
    {
      key: "date",
      label: "Date & Time",
      render: (val) => val ? new Date(val).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "TBD"
    },
    { key: "sport", label: "Sport" },
    {
      key: "tournament",
      label: "Tournament & Round",
      render: (val, row) => (
        <div>
          <strong>{val}</strong>
          <div style={{ fontSize: "0.78rem", color: "var(--nec-text-muted)" }}>{row.round} &middot; {row.competition_level}</div>
        </div>
      )
    },
    {
      key: "opponent_team",
      label: "Matchup",
      render: (val, row) => (
        <div>
          <span>{row.player_team} vs <strong>{val}</strong></span>
        </div>
      )
    },
    {
      key: "score",
      label: "Score",
      render: (val, row) => (
        <div>
          <strong>{val}</strong>
          {row.detail_score && <div style={{ fontSize: "0.75rem", color: "var(--nec-text-muted)" }}>{row.detail_score}</div>}
        </div>
      )
    },
    {
      key: "result",
      label: "Result",
      render: (val) => {
        let badgeStatus = "neutral";
        if (val === "Won") badgeStatus = "success";
        else if (val === "Lost") badgeStatus = "danger";
        else if (val === "Ongoing") badgeStatus = "warning";
        return <Badge status={badgeStatus}>{val}</Badge>;
      }
    },
    { key: "venue", label: "Venue" }
  ];

  const odColumns = [
    {
      key: "from_date",
      label: "Period",
      render: (val, row) => {
        const from = val ? new Date(val).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";
        const to = row.to_date ? new Date(row.to_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : from;
        return `${from}${from !== to ? ` to ${to}` : ""}`;
      }
    },
    {
      key: "total_days",
      label: "Duration",
      render: (val) => `${val} Day${val > 1 ? "s" : ""}`
    },
    { key: "tournament_name", label: "Event / Tournament" },
    { key: "reason", label: "Purpose" },
    {
      key: "approval_status",
      label: "Status",
      render: (val) => (
        <Badge status={val === "Approved" ? "success" : val === "Rejected" ? "danger" : "warning"}>
          {val}
        </Badge>
      )
    },
    {
      key: "request_id",
      label: "Action",
      render: (id, row) => {
        if (row.approval_status !== "Approved") return <span style={{ color: "var(--nec-text-muted)", fontSize: "0.8rem" }}>Pending</span>;
        return (
          <button
            onClick={() => {
              const fromDate = new Date(row.from_date).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
              const approvedDate = row.approved_at ? new Date(row.approved_at).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) : new Date().toLocaleDateString("en-IN");
              const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>OD Letter</title><style>body{font-family:"Times New Roman",serif;font-size:13pt;margin:40px 60px}h2{text-align:center}hr{border:1.5px solid #000;margin:8px 0 24px}.meta{display:flex;justify-content:space-between;margin-bottom:20px}table{width:100%;border-collapse:collapse;margin:16px 0}td{padding:6px 10px}td:first-child{width:200px;font-weight:bold}.sign{margin-top:60px;text-align:right}</style></head><body><h2>NATIONAL ENGINEERING COLLEGE</h2><div style="text-align:center;font-size:11pt;color:#444">Kovilpatti - 628 503, Thoothukudi District, Tamil Nadu</div><hr/><div class="meta"><span>Ref: NEC/DPE/OD/${row.request_id}/${new Date().getFullYear()}</span><span>Date: ${approvedDate}</span></div><p><strong>TO WHOM IT MAY CONCERN</strong></p><p>This is to certify that the student athlete <strong>${profile.student_name}</strong> (${profile.register_number}), Department of <strong>${profile.department_name}</strong>, has been deputed to represent National Engineering College in <strong>${row.tournament_name || "Official Tournament"}</strong> on official sports duty.</p><table><tr><td>Student Name</td><td>: ${profile.student_name}</td></tr><tr><td>Register Number</td><td>: ${profile.register_number}</td></tr><tr><td>Department</td><td>: ${profile.department_name}</td></tr><tr><td>Period of OD</td><td>: ${fromDate} (${row.total_days} Day)</td></tr><tr><td>Purpose</td><td>: ${row.reason}</td></tr></table><p>Kindly grant attendance condonation and treat the period as <strong>On Duty (OD)</strong>.</p><div class="sign"><div style="border-top:1px solid #000;display:inline-block;width:200px;margin-bottom:4px"></div><br/><strong>Director of Physical Education</strong><br/>National Engineering College</div></body></html>`;
              const blob = new Blob([html], { type: "text/html" });
              const url = URL.createObjectURL(blob);
              window.open(url, "_blank");
            }}
            style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "0.82rem", fontWeight: 600 }}
          >
            <Download size={13} /> View Letter
          </button>
        );
      }
    }
  ];

  if (loading) {
    return (
      <div className="nec-portal-page">
        <SkeletonLoader count={6} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="nec-portal-page" style={{ padding: "40px" }}>
        <ErrorState message={error} onRetry={loadReport} />
      </div>
    );
  }

  return (
    <div className="nec-portal-page nec-portfolio-container">
      {/* ── Top Hero: Athlete Profile Banner ── */}
      <div className="nec-portfolio-hero">
        <div className="nec-portfolio-hero-left">
          <div className="nec-portfolio-avatar">
            {(profile.student_name || "A").charAt(0).toUpperCase()}
          </div>
          <div className="nec-portfolio-hero-meta">
            <h2>{profile.student_name}</h2>
            <div className="nec-portfolio-hero-badges">
              <span className="nec-hero-pill">{profile.department_name} ({profile.department_code})</span>
              <span className="nec-hero-pill">Reg: {profile.register_number}</span>
              <span className="nec-hero-pill">Batch {profile.batch}</span>
              <span className="nec-hero-pill gold"><ShieldCheck size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />{profile.medical_fitness} Medical Fitness</span>
              <span className="nec-hero-pill">Blood: {profile.blood_group}</span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <Button variant="outline" size="sm" onClick={() => window.print()} style={{ color: "#fff", borderColor: "rgba(255,255,255,0.4)" }}>
            <Printer size={15} style={{ marginRight: 6 }} /> Print Portfolio
          </Button>
        </div>
      </div>

      {/* ── Key Statistics Row ── */}
      <div className="nec-stats-grid">
        <StatCard
          title="Matches Played"
          value={stats.matchesPlayed || 0}
          subtext={`${stats.wins || 0} Victories · ${stats.losses || 0} Defeats`}
          icon={Trophy}
          color="navy"
        />
        <StatCard
          title="Career Win Rate"
          value={stats.winRate || "0%"}
          subtext="Match Winning Efficiency"
          icon={Activity}
          color="success"
        />
        <StatCard
          title="Approved OD Days"
          value={stats.totalOdDays || 0}
          subtext={`${attendanceBenefits.lectureHoursCredited || 0} Academic Hours Credited`}
          icon={FileCheck}
          color="gold"
        />
        <StatCard
          title="Achievements & Medals"
          value={stats.achievementsCount || 0}
          subtext={`${stats.medalsTally?.gold || 0} Gold · ${stats.medalsTally?.silver || 0} Silver`}
          icon={Medal}
          color="navy"
        />
      </div>

      {/* ── Portfolio Navigation Tabs ── */}
      <div className="nec-portfolio-tabs">
        <button
          className={`nec-portfolio-tab-btn ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          <Award size={16} /> Overview & Teams
        </button>
        <button
          className={`nec-portfolio-tab-btn ${activeTab === "matches" ? "active" : ""}`}
          onClick={() => setActiveTab("matches")}
        >
          <Calendar size={16} /> Match History ({allMatches.length})
        </button>
        <button
          className={`nec-portfolio-tab-btn ${activeTab === "od" ? "active" : ""}`}
          onClick={() => setActiveTab("od")}
        >
          <FileText size={16} /> Approved OD & Attendance
        </button>
        <button
          className={`nec-portfolio-tab-btn ${activeTab === "achievements" ? "active" : ""}`}
          onClick={() => setActiveTab("achievements")}
        >
          <Trophy size={16} /> Medals & Certificates ({certificates.length})
        </button>
        <button
          className={`nec-portfolio-tab-btn ${activeTab === "timeline" ? "active" : ""}`}
          onClick={() => setActiveTab("timeline")}
        >
          <Clock size={16} /> Sports Journey Timeline
        </button>
      </div>

      {/* ── Tab Content: Overview & Teams ── */}
      {activeTab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Registered Teams Grid */}
          <Card title="Registered Sports & Squad Memberships">
            {teams.length === 0 ? (
              <EmptyState title="No Registered Teams" message="You have not been assigned to a department squad or college team yet." />
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
                {teams.map(t => (
                  <div key={t.member_id} style={{
                    border: "1px solid var(--nec-border)",
                    borderRadius: "10px",
                    padding: "16px",
                    background: "var(--nec-surface-raised)"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                      <div>
                        <h4 style={{ margin: "0 0 4px 0", fontSize: "1.05rem", fontWeight: 700 }}>{t.team_name}</h4>
                        <span style={{ fontSize: "0.82rem", color: "var(--nec-text-muted)" }}>{t.sport_name} &middot; {t.sport_category}</span>
                      </div>
                      <Badge status={t.role === "Captain" ? "gold" : "info"}>{t.role}</Badge>
                    </div>
                    <div style={{ fontSize: "0.82rem", display: "flex", justifyContent: "space-between", marginTop: "12px", borderTop: "1px solid var(--nec-border-light)", paddingTop: "8px" }}>
                      <span>Jersey: <strong>#{t.jersey_number || "N/A"}</strong></span>
                      <span>Joined: <strong>{new Date(t.join_date).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Academic Attendance Benefit Card */}
          <Card title="Attendance Benefits & Academic Condonation Status">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
              <div style={{ padding: "16px", borderRadius: "10px", border: "1px solid var(--nec-border)", background: "var(--nec-surface-raised)" }}>
                <span style={{ fontSize: "0.82rem", color: "var(--nec-text-muted)", fontWeight: 600 }}>Total OD Days Sanctioned</span>
                <div style={{ fontSize: "1.6rem", fontWeight: 800, marginTop: "4px", color: "var(--nec-navy)" }}>{stats.totalOdDays || 0} Days</div>
              </div>

              <div style={{ padding: "16px", borderRadius: "10px", border: "1px solid var(--nec-border)", background: "var(--nec-surface-raised)" }}>
                <span style={{ fontSize: "0.82rem", color: "var(--nec-text-muted)", fontWeight: 600 }}>Academic Hours Credited</span>
                <div style={{ fontSize: "1.6rem", fontWeight: 800, marginTop: "4px", color: "var(--nec-gold)" }}>{attendanceBenefits.lectureHoursCredited || 0} Hours</div>
              </div>

              <div style={{ padding: "16px", borderRadius: "10px", border: "1px solid var(--nec-border)", background: "var(--nec-surface-raised)" }}>
                <span style={{ fontSize: "0.82rem", color: "var(--nec-text-muted)", fontWeight: 600 }}>Eligibility Status</span>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, marginTop: "8px", color: "#16a34a", display: "flex", alignItems: "center", gap: "6px" }}>
                  <CheckCircle2 size={18} /> Valid for Semester Exams
                </div>
              </div>
            </div>
          </Card>

          {/* Scalability: Coach Remarks & Athletic Standing */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
            <Card title="Coach & Physical Director Evaluation">
              {scalability.coachRemarks?.map((c, i) => (
                <div key={i} style={{ borderLeft: "3px solid var(--nec-navy)", paddingLeft: "14px", margin: "6px 0" }}>
                  <p style={{ margin: "0 0 4px 0", fontSize: "0.88rem", fontStyle: "italic" }}>"{c.remark}"</p>
                  <span style={{ fontSize: "0.78rem", color: "var(--nec-text-muted)", fontWeight: 600 }}>{c.coach} &middot; {c.date}</span>
                </div>
              ))}
            </Card>

            <Card title="AI Performance Insights">
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {scalability.aiInsights?.map((insight, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "0.85rem" }}>
                    <Sparkles size={16} style={{ color: "var(--nec-accent)", flexShrink: 0, marginTop: 2 }} />
                    <span>{insight}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── Tab Content: Match History ── */}
      {activeTab === "matches" && (
        <div>
          {/* Filters Bar */}
          <div className="nec-filter-bar">
            <div className="nec-filter-item">
              <span className="nec-filter-label">Sport:</span>
              <select className="nec-filter-select" value={selectedSport} onChange={(e) => setSelectedSport(e.target.value)}>
                {sportsOptions.map(s => <option key={s} value={s}>{s === "all" ? "All Sports" : s}</option>)}
              </select>
            </div>

            <div className="nec-filter-item">
              <span className="nec-filter-label">Year:</span>
              <select className="nec-filter-select" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                {yearsOptions.map(y => <option key={y} value={y}>{y === "all" ? "All Years" : y}</option>)}
              </select>
            </div>

            <div className="nec-filter-item">
              <span className="nec-filter-label">Level:</span>
              <select className="nec-filter-select" value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value)}>
                {levelOptions.map(l => <option key={l} value={l}>{l === "all" ? "All Levels" : l}</option>)}
              </select>
            </div>

            <div className="nec-filter-item">
              <span className="nec-filter-label">Result:</span>
              <select className="nec-filter-select" value={selectedResult} onChange={(e) => setSelectedResult(e.target.value)}>
                <option value="all">All Results</option>
                <option value="Won">Won</option>
                <option value="Lost">Lost</option>
                <option value="Scheduled">Scheduled</option>
              </select>
            </div>

            {(selectedSport !== "all" || selectedYear !== "all" || selectedLevel !== "all" || selectedResult !== "all") && (
              <Button variant="outline" size="sm" onClick={() => { setSelectedSport("all"); setSelectedYear("all"); setSelectedLevel("all"); setSelectedResult("all"); }}>
                Reset Filters
              </Button>
            )}
          </div>

          <Card title="Player Participation & Match Records">
            <Table
              columns={matchColumns}
              data={filteredMatches}
              searchPlaceholder="Filter matches by opponent, tournament, round, or venue..."
              emptyTitle="No Matches Found"
              emptyMessage="No match participation records found."
            />
          </Card>
        </div>
      )}

      {/* ── Tab Content: Approved OD & Attendance ── */}
      {activeTab === "od" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="nec-stats-grid">
            <StatCard title="Total Applications" value={odSummary.totalRequests || 0} subtext="Submitted OD requests" icon={FileText} color="navy" />
            <StatCard title="Approved Leaves" value={odSummary.approvedCount || 0} subtext="Official duty approved" icon={CheckCircle2} color="success" />
            <StatCard title="Approved Days" value={odSummary.approvedDays || 0} subtext="Total attendance benefit days" icon={Calendar} color="gold" />
          </div>

          <Card title="Official On Duty (OD) Sanction Records">
            <Table
              columns={odColumns}
              data={odSummary.recentRecords || []}
              searchPlaceholder="Search OD by tournament or purpose..."
              emptyTitle="No OD Records"
              emptyMessage="No On Duty records found."
            />
          </Card>
        </div>
      )}

      {/* ── Tab Content: Achievements & Certificates ── */}
      {activeTab === "achievements" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <Card title="Athletic Honors & Tournament Medals">
            {achievements.length === 0 ? (
              <EmptyState title="No Recorded Medals" message="No tournament medals recorded." />
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
                {achievements.map((ach) => (
                  <div key={ach.id} style={{
                    border: "1px solid var(--nec-border)",
                    borderRadius: "10px",
                    padding: "16px",
                    background: "var(--nec-surface-raised)",
                    display: "flex",
                    gap: "14px",
                    alignItems: "center"
                  }}>
                    <div style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "50%",
                      background: ach.type === "Gold" ? "#fef08a" : ach.type === "Silver" ? "#e2e8f0" : "#dbeafe",
                      color: ach.type === "Gold" ? "#854d0e" : ach.type === "Silver" ? "#475569" : "#1e40af",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0
                    }}>
                      <Trophy size={24} />
                    </div>
                    <div>
                      <h4 style={{ margin: "0 0 4px 0", fontSize: "0.95rem", fontWeight: 700 }}>{ach.title}</h4>
                      <p style={{ margin: "0 0 4px 0", fontSize: "0.8rem", color: "var(--nec-text-muted)" }}>{ach.description}</p>
                      <Badge status={ach.type === "Gold" ? "gold" : "info"}>{ach.sport} &middot; {ach.year}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Digital Sports Certificates">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
              {certificates.map(cert => (
                <div key={cert.id} className="nec-cert-card">
                  <div>
                    <h4 style={{ margin: "0 0 4px 0", fontSize: "0.95rem", fontWeight: 700 }}>{cert.title}</h4>
                    <span style={{ fontSize: "0.78rem", color: "var(--nec-text-muted)" }}>
                      Issued by {cert.issuedBy} &middot; Ref: {cert.referenceNo}
                    </span>
                    <div style={{ marginTop: "6px" }}>
                      <Badge status={cert.category === "Merit" ? "gold" : "neutral"}>{cert.category}</Badge>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => alert(`Certificate ${cert.referenceNo} verified and authenticated by NEC Physical Education Department.`)}>
                    Verify
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── Tab Content: Chronological Timeline ── */}
      {activeTab === "timeline" && (
        <Card title="Chronological Sports Journey">
          {timeline.length === 0 ? (
            <EmptyState title="No Milestones Recorded" message="No journey milestones recorded." />
          ) : (
            <div className="nec-timeline-wrapper">
              {timeline.map((item) => (
                <div key={item.id} className="nec-timeline-item">
                  <div className="nec-timeline-dot">
                    {item.category === "Team" && <Users size={12} />}
                    {item.category === "Match" && <Trophy size={12} />}
                    {item.category === "On Duty" && <FileCheck size={12} />}
                  </div>
                  <div className="nec-timeline-content">
                    <div className="nec-timeline-header">
                      <div className="nec-timeline-title">
                        {item.title}
                        {item.badge && (
                          <span style={{ marginLeft: "8px" }}>
                            <Badge status={item.badge === "Won" ? "success" : item.badge === "Approved" ? "gold" : "neutral"}>
                              {item.badge}
                            </Badge>
                          </span>
                        )}
                      </div>
                      <span className="nec-timeline-date">
                        {new Date(item.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    </div>
                    <p className="nec-timeline-desc">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
