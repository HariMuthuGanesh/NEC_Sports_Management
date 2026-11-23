import React, { useState } from "react";
import { publicApi } from "../../services/api/apiServices";
import { useAuth, ROLES } from "../../context/AuthContext";
import { Card, StatCard } from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import ErrorState from "../../components/common/ErrorState";
import SkeletonLoader from "../../components/common/SkeletonLoader";
import PublicInfoCard from "../../components/common/PublicInfoCard";
import {
  Trophy, Users, Radio, Calendar, Megaphone, ArrowRight, FileCheck,
  Award, MapPin, Building, Clock, ChevronRight, Image as ImageIcon,
  CheckCircle, Globe, Shield, ExternalLink
} from "lucide-react";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";
import "./PublicPortal.css";

function formatDate(dateStr) {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  } catch {
    return dateStr;
  }
}

function formatTime(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? "" : d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  } catch {
    return "";
  }
}

export default function PublicHome({ onNavigate }) {
  const { t, currentUser } = useAuth();
  const [scope, setScope] = useState("ALL"); // 'ALL', 'Intramural', 'Inter-Collegiate'

  const fetchHomeSummary = async () => {
    return await publicApi.getHomeSummary({ scope });
  };

  const { data: homeData, loading, error, refetch } = useAutoRefresh(
    fetchHomeSummary,
    { interval: 15000, deps: [scope] }
  );

  const stats = homeData?.stats || {
    sportsCount: "0",
    athletesCount: "0",
    tournamentsCount: "0",
    intramuralCount: "0",
    interCollegiateCount: "0",
    liveMatchesCount: "0",
    completedMatchesCount: "0"
  };

  const liveMatches = homeData?.liveMatches || [];
  const featuredTournaments = homeData?.featuredTournaments || [];
  const upcomingMatches = homeData?.upcomingMatches || [];
  const recentResults = homeData?.recentResults || [];
  const announcements = homeData?.announcements || [];
  const recentPhotos = homeData?.recentPhotos || [];

  return (
    <div className="nec-portal-page nec-guest-home nec-public-home">
      {/* Institutional Hero Banner */}
      <section className="nec-portal-hero" style={{
        background: "linear-gradient(112deg, rgba(8, 25, 52, 0.98) 0%, rgba(10, 48, 82, 0.94) 55%, rgba(16, 92, 117, 0.88) 100%)",
        color: "#fff",
        padding: "40px",
        borderRadius: "20px",
        position: "relative",
        boxShadow: "0 20px 40px rgba(0,0,0,0.25)"
      }}>
        <div className="nec-hero-content" style={{ maxWidth: "780px" }}>
          <div className="nec-hero-kicker" style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(245, 196, 81, 0.15)",
            padding: "4px 12px",
            borderRadius: "20px",
            color: "#f5c451",
            fontWeight: 800,
            fontSize: "0.78rem",
            marginBottom: "16px",
            border: "1px solid rgba(245, 196, 81, 0.3)"
          }}>
            <span className="nec-hero-kicker-dot" style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: liveMatches.length > 0 ? "#ef4444" : "#10b981",
              boxShadow: liveMatches.length > 0 ? "0 0 8px #ef4444" : "none"
            }} />
            NATIONAL ENGINEERING COLLEGE • SPORTS DIRECTORATE
          </div>

          <h1 className="nec-hero-title" style={{
            fontSize: "clamp(2rem, 3.6vw, 3rem)",
            fontWeight: 800,
            lineHeight: 1.15,
            margin: "0 0 14px",
            fontFamily: "var(--nec-font-display)",
            letterSpacing: "-0.5px"
          }}>
            Institutional Sports & Athletics Portal
          </h1>

          <p className="nec-hero-subtitle" style={{
            fontSize: "1.05rem",
            lineHeight: 1.6,
            color: "rgba(255,255,255,0.88)",
            margin: "0 0 24px"
          }}>
            Experience collegiate sporting excellence. Live scores, comprehensive match fixtures, tournament brackets, and official standings across Intra College championships and Inter College invitation meets.
          </p>

          {/* Scope Filter Switcher inside Hero */}
          <div style={{
            display: "inline-flex",
            flexWrap: "wrap",
            background: "rgba(0,0,0,0.35)",
            padding: "4px",
            borderRadius: "12px",
            gap: "4px",
            marginBottom: "20px",
            border: "1px solid rgba(255,255,255,0.15)"
          }}>
            {[
              { id: "ALL", label: "All" },
              { id: "Intramural", label: "Intra College" },
              { id: "Inter-Collegiate", label: "Inter College" }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setScope(tab.id)}
                style={{
                  padding: "8px 16px",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  background: scope === tab.id ? "#f5c451" : "transparent",
                  color: scope === tab.id ? "#0d233a" : "rgba(255,255,255,0.9)"
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="nec-hero-actions" style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            <Button
              variant={liveMatches.length > 0 ? "secondary" : "white"}
              icon={Radio}
              onClick={() => onNavigate("public_live")}
              style={{ fontWeight: 700 }}
            >
              {liveMatches.length > 0 ? `🟢 ${liveMatches.length} Matches Live Now` : "Live Score Center"}
            </Button>
            <Button
              variant="white"
              icon={Calendar}
              onClick={() => onNavigate("public_fixtures")}
              style={{ fontWeight: 700 }}
            >
              Match Fixtures & Schedule
            </Button>
            <Button
              variant="secondary"
              icon={Trophy}
              onClick={() => onNavigate("public_tournaments")}
              style={{ fontWeight: 700 }}
            >
              Tournaments Catalog
            </Button>
            {currentUser.role !== ROLES.PUBLIC && (
              <Button
                variant="primary"
                onClick={() => onNavigate(currentUser.role === ROLES.ADMIN ? "admin_dash" : currentUser.role === ROLES.COORDINATOR ? "coord_dash" : "player_dash")}
                style={{ fontWeight: 700 }}
              >
                Management Portal
              </Button>
            )}
          </div>
        </div>

        <div className="nec-hero-mark" aria-hidden="true">
          <img src="/assets/logo.jpg" alt="NEC Emblem" />
        </div>
      </section>

      {/* Quick Navigation Strip */}
      <nav className="nec-guest-quicknav" aria-label="Guest portal shortcuts" style={{
        background: "var(--nec-surface)",
        borderRadius: "12px",
        overflow: "hidden",
        border: "1px solid var(--nec-border)"
      }}>
        <button type="button" onClick={() => onNavigate("public_tournaments")}>
          <Trophy size={16} style={{ color: "var(--nec-gold)" }} /> Tournaments & Meets <ArrowRight size={14} />
        </button>
        <button type="button" onClick={() => onNavigate("public_live")}>
          <Radio size={16} style={{ color: "#ef4444" }} /> Live Scores <span>{stats.liveMatchesCount}</span>
        </button>
        <button type="button" onClick={() => onNavigate("public_fixtures")}>
          <Calendar size={16} style={{ color: "#3b82f6" }} /> Match Fixtures <ArrowRight size={14} />
        </button>
        <button type="button" onClick={() => onNavigate("public_leaderboard")}>
          <Award size={16} style={{ color: "#eab308" }} /> Rankings & Tally <ArrowRight size={14} />
        </button>
        <button type="button" onClick={() => onNavigate("public_od_list")}>
          <FileCheck size={16} style={{ color: "#10b981" }} /> OD Verification <ArrowRight size={14} />
        </button>
        <button type="button" onClick={() => onNavigate("public_gallery")}>
          <ImageIcon size={16} style={{ color: "#8b5cf6" }} /> Event Gallery <ArrowRight size={14} />
        </button>
      </nav>

      {/* High-Level Institutional Statistics Grid */}
      <div className="nec-guest-stats-grid">
        <StatCard
          title="Sports Catalog"
          value={stats.sportsCount}
          icon={Trophy}
          subtext="Active Disciplines"
          color="gold"
          onClick={() => onNavigate("public_tournaments")}
        />
        <StatCard
          title="Student Athletes"
          value={stats.athletesCount}
          icon={Users}
          subtext="Registered Competitors"
          color="navy"
          onClick={() => onNavigate("public_leaderboard")}
        />
        <StatCard
          title="Athletic Meets"
          value={stats.tournamentsCount}
          icon={Calendar}
          subtext={`${stats.intramuralCount} Intra College • ${stats.interCollegiateCount} Inter College`}
          color="navy"
          onClick={() => onNavigate("public_tournaments")}
        />
        <StatCard
          title="Live Score Action"
          value={stats.liveMatchesCount}
          icon={Radio}
          subtext={`${stats.completedMatchesCount} Matches Completed`}
          color="navy"
          trend={Number(stats.liveMatchesCount) > 0 ? "🟢 LIVE" : undefined}
          onClick={() => onNavigate("public_live")}
        />
      </div>

      {/* Live Matches Highlight Section */}
      <div className="nec-section-block">
        <div className="nec-section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <div className="nec-section-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Radio size={20} style={{ color: liveMatches.length > 0 ? "#ef4444" : "var(--nec-text-muted)" }} className={liveMatches.length > 0 ? "nec-icon-live-spin" : ""} />
            <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "var(--nec-text-main)" }}>
              {liveMatches.length > 0 ? "Live Matches In Progress" : "Campus Live Center"}
            </h3>
          </div>
          <Button variant="outline" size="sm" onClick={() => onNavigate("public_live")}>
            Full Live Center <ArrowRight size={14} style={{ marginLeft: "4px" }} />
          </Button>
        </div>

        {liveMatches.length === 0 ? (
          <PublicInfoCard
            icon={Radio}
            title="No Live Matches Currently in Progress"
            message="No matches are currently active right now. View the fixtures schedule for today's upcoming matches or switch to tournament results."
            variant="flat"
            actionText="Browse Scheduled Fixtures"
            onAction={() => onNavigate("public_fixtures")}
          />
        ) : (
          <div className="nec-matches-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "16px" }}>
            {liveMatches.map(m => (
              <Card key={m.match_id} style={{
                borderRadius: "14px",
                border: "2px solid #ef4444",
                boxShadow: "0 4px 14px rgba(239, 68, 68, 0.15)",
                padding: "16px",
                overflow: "hidden"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <Badge variant="primary" style={{ background: "#1e3a8a", color: "#fff", fontSize: "0.72rem", fontWeight: 700 }}>
                      {m.sport_name}
                    </Badge>
                    <span style={{ fontSize: "0.78rem", color: "var(--nec-text-muted)", fontWeight: 600 }}>
                      {m.round}
                    </span>
                  </div>
                  <Badge variant="success" style={{ background: "#ef4444", color: "#fff", fontWeight: 800, fontSize: "0.72rem" }}>
                    🔴 LIVE
                  </Badge>
                </div>

                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "var(--nec-surface-raised)",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  margin: "8px 0"
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--nec-text-main)" }}>
                      {m.team_a_name}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--nec-text-muted)" }}>
                      {m.dept_a_code || m.team_a_institution}
                    </div>
                  </div>

                  <div style={{ textAlign: "center", padding: "0 14px" }}>
                    <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--nec-blue-accent)", letterSpacing: "1px" }}>
                      {m.score_a} - {m.score_b}
                    </div>
                    {m.detail_score && (
                      <div style={{ fontSize: "0.72rem", color: "var(--nec-text-muted)", fontWeight: 600 }}>
                        {m.detail_score}
                      </div>
                    )}
                  </div>

                  <div style={{ flex: 1, textAlign: "right" }}>
                    <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--nec-text-main)" }}>
                      {m.team_b_name}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--nec-text-muted)" }}>
                      {m.dept_b_code || m.team_b_institution}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.78rem", color: "var(--nec-text-muted)", marginTop: "10px" }}>
                  <span>📍 {m.venue_name || "Campus Ground"}</span>
                  <button
                    type="button"
                    onClick={() => onNavigate("public_live")}
                    style={{ border: "none", background: "none", color: "var(--nec-blue-accent)", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                  >
                    Match Details <ArrowRight size={12} />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Featured Tournaments Section */}
      <div className="nec-section-block">
        <div className="nec-section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <div className="nec-section-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Trophy size={20} style={{ color: "var(--nec-gold)" }} />
            <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "var(--nec-text-main)" }}>
              Featured Tournaments & Athletic Meets
            </h3>
          </div>
          <Button variant="outline" size="sm" onClick={() => onNavigate("public_tournaments")}>
            All Tournaments <ArrowRight size={14} style={{ marginLeft: "4px" }} />
          </Button>
        </div>

        {featuredTournaments.length === 0 ? (
          <PublicInfoCard
            icon={Trophy}
            title="Tournaments Catalog"
            message="No active tournaments found for the selected scope."
            variant="flat"
          />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
            {featuredTournaments.map(t => {
              const isInter = t.scope === "Inter-Collegiate";
              return (
                <Card key={t.tournament_id} style={{
                  padding: "16px",
                  borderRadius: "12px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  border: "1px solid var(--nec-border)"
                }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <Badge style={{
                        background: isInter ? "#1e3a8a" : "#4338ca",
                        color: "#fff",
                        fontSize: "0.72rem",
                        fontWeight: 700
                      }}>
                        {isInter ? "🌐 Inter College" : "🏛️ Intra College"}
                      </Badge>
                      <Badge variant={t.status === "Ongoing" ? "success" : "default"} style={{ fontSize: "0.72rem" }}>
                        {t.status}
                      </Badge>
                    </div>
                    <h4 style={{ margin: "0 0 6px", fontSize: "1.05rem", fontWeight: 800, color: "var(--nec-text-main)" }}>
                      {t.name}
                    </h4>
                    <div style={{ fontSize: "0.8rem", color: "var(--nec-text-muted)", marginBottom: "10px" }}>
                      📅 {formatDate(t.start_date)} – {formatDate(t.end_date)}
                    </div>
                    {t.venue && (
                      <div style={{ fontSize: "0.8rem", color: "var(--nec-text-muted)", marginBottom: "6px" }}>
                        📍 {t.venue}
                      </div>
                    )}
                  </div>
                  <div style={{
                    borderTop: "1px solid var(--nec-border)",
                    paddingTop: "10px",
                    marginTop: "10px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--nec-text-muted)" }}>
                      <strong>{t.total_events || 0}</strong> Events • <strong>{t.total_matches || 0}</strong> Matches
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => onNavigate("public_tournaments")} style={{ fontWeight: 700 }}>
                      Explore <ChevronRight size={14} />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Dual Column: Upcoming Fixtures & Recent Results */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 460px), 1fr))", gap: "20px" }}>
        {/* Upcoming Fixtures */}
        <div className="nec-section-block">
          <div className="nec-section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <div className="nec-section-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Calendar size={18} style={{ color: "#3b82f6" }} />
              <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "var(--nec-text-main)" }}>
                Upcoming Fixtures
              </h3>
            </div>
            <Button variant="outline" size="sm" onClick={() => onNavigate("public_fixtures")}>
              Full Schedule <ArrowRight size={13} style={{ marginLeft: "4px" }} />
            </Button>
          </div>

          {upcomingMatches.length === 0 ? (
            <PublicInfoCard
              icon={Calendar}
              title="No Upcoming Matches"
              message="No future matches are currently scheduled for this selection."
              variant="flat"
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {upcomingMatches.map(m => (
                <div
                  key={m.match_id}
                  style={{
                    padding: "12px 16px",
                    borderRadius: "10px",
                    border: "1px solid var(--nec-border)",
                    background: "var(--nec-surface)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--nec-text-muted)", fontWeight: 700, marginBottom: "3px" }}>
                      {m.sport_name} • {m.round} • {formatDate(m.scheduled_time)} {formatTime(m.scheduled_time)}
                    </div>
                    <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--nec-text-main)" }}>
                      {m.team_a_name} <span style={{ color: "var(--nec-text-muted)", fontWeight: 400 }}>vs</span> {m.team_b_name}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--nec-text-muted)" }}>
                      📍 {m.venue_name || "Campus Ground"}
                    </div>
                  </div>
                  <Badge variant="primary" style={{ fontSize: "0.72rem" }}>
                    Scheduled
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Results with Resolved Winner */}
        <div className="nec-section-block">
          <div className="nec-section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <div className="nec-section-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Award size={18} style={{ color: "#16a34a" }} />
              <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "var(--nec-text-main)" }}>
                Recent Match Results
              </h3>
            </div>
            <Button variant="outline" size="sm" onClick={() => onNavigate("public_live")}>
              All Results <ArrowRight size={13} style={{ marginLeft: "4px" }} />
            </Button>
          </div>

          {recentResults.length === 0 ? (
            <PublicInfoCard
              icon={Award}
              title="No Completed Matches Yet"
              message="Completed match results and scores will be updated here automatically."
              variant="flat"
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {recentResults.map(m => (
                <div
                  key={m.match_id}
                  style={{
                    padding: "12px 16px",
                    borderRadius: "10px",
                    border: "1px solid var(--nec-border)",
                    background: "var(--nec-surface)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--nec-text-muted)", fontWeight: 700, marginBottom: "3px" }}>
                      {m.sport_name} • {m.round} • {formatDate(m.scheduled_time)}
                    </div>
                    <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--nec-text-main)" }}>
                      {m.team_a_name} ({m.score_a}) - ({m.score_b}) {m.team_b_name}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "#16a34a", fontWeight: 700, marginTop: "2px" }}>
                      🏆 Winner: {m.winner_name || m.winner_team_name || "Match Completed"}
                    </div>
                  </div>
                  <Badge variant="default" style={{ fontSize: "0.72rem" }}>
                    Final Score
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dual Column: Announcements & Event Photos Preview */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 460px), 1fr))", gap: "20px" }}>
        {/* Official Announcements */}
        <div className="nec-section-block">
          <div className="nec-section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <div className="nec-section-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Megaphone size={18} style={{ color: "#d97706" }} />
              <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "var(--nec-text-main)" }}>
                Institutional Announcements
              </h3>
            </div>
            <Button variant="outline" size="sm" onClick={() => onNavigate("public_announcements")}>
              All Bulletins <ArrowRight size={13} style={{ marginLeft: "4px" }} />
            </Button>
          </div>

          {announcements.length === 0 ? (
            <PublicInfoCard
              icon={Megaphone}
              title="No Announcements"
              message="No public bulletins or notices posted at this time."
              variant="flat"
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {announcements.map((ann, idx) => {
                const isUrgent = ann.priority === "Urgent" || ann.priority === "High";
                return (
                  <div
                    key={ann.announcement_id || idx}
                    style={{
                      padding: "12px 16px",
                      borderRadius: "10px",
                      border: "1px solid var(--nec-border)",
                      background: "var(--nec-surface)"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <Badge variant={isUrgent ? "danger" : "default"} style={{ fontSize: "0.7rem", fontWeight: 700 }}>
                        {isUrgent ? "⚠️ High Priority" : ann.category || "Notice"}
                      </Badge>
                      <span style={{ fontSize: "0.75rem", color: "var(--nec-text-muted)" }}>
                        {formatDate(ann.created_at || ann.published_at)}
                      </span>
                    </div>
                    <h4 style={{ margin: "4px 0", fontSize: "0.95rem", fontWeight: 700, color: "var(--nec-text-main)" }}>
                      {ann.title}
                    </h4>
                    <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--nec-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {ann.content}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Event Photos Preview */}
        <div className="nec-section-block">
          <div className="nec-section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <div className="nec-section-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <ImageIcon size={18} style={{ color: "#8b5cf6" }} />
              <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "var(--nec-text-main)" }}>
                Athletic Gallery & Media
              </h3>
            </div>
            <Button variant="outline" size="sm" onClick={() => onNavigate("public_gallery")}>
              View All Photos <ArrowRight size={13} style={{ marginLeft: "4px" }} />
            </Button>
          </div>

          {recentPhotos.length === 0 ? (
            <PublicInfoCard
              icon={ImageIcon}
              title="Media Gallery"
              message="Tournament and event action photographs will appear here."
              variant="flat"
            />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
              {recentPhotos.slice(0, 6).map((photo, idx) => (
                <div
                  key={photo.id || idx}
                  onClick={() => onNavigate("public_gallery")}
                  style={{
                    aspectRatio: "1/1",
                    borderRadius: "8px",
                    overflow: "hidden",
                    cursor: "pointer",
                    position: "relative",
                    background: "#0d233a"
                  }}
                >
                  <img
                    src={photo.url || "/assets/logo.jpg"}
                    alt={photo.title || "Event photo"}
                    style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.2s" }}
                    onError={(e) => { e.currentTarget.src = "/assets/logo.jpg"; }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Institutional Footer */}
      <footer style={{
        marginTop: "30px",
        padding: "36px 30px",
        background: "linear-gradient(135deg, #091728 0%, #0d233a 100%)",
        color: "#fff",
        borderRadius: "16px",
        border: "1px solid rgba(255,255,255,0.1)"
      }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "24px", marginBottom: "24px" }}>
          <div style={{ maxWidth: "420px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <img src="/assets/logo.jpg" alt="NEC Logo" style={{ width: "40px", height: "40px", borderRadius: "50%" }} />
              <div>
                <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "#f5c451" }}>NATIONAL ENGINEERING COLLEGE</div>
                <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.7)" }}>An Autonomous Institution • Affiliated to Anna University</div>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: "0.82rem", color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>
              Department of Physical Education & Sports Directorate. Nurturing athletic discipline, teamwork, and championship sportsmanship since 1984.
            </p>
          </div>

          <div style={{ display: "flex", gap: "40px", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#f5c451", marginBottom: "10px" }}>PORTAL NAVIGATION</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.82rem" }}>
                <span style={{ cursor: "pointer", color: "rgba(255,255,255,0.8)" }} onClick={() => onNavigate("public_tournaments")}>Tournaments Catalog</span>
                <span style={{ cursor: "pointer", color: "rgba(255,255,255,0.8)" }} onClick={() => onNavigate("public_live")}>Live Score Center</span>
                <span style={{ cursor: "pointer", color: "rgba(255,255,255,0.8)" }} onClick={() => onNavigate("public_fixtures")}>Match Schedules</span>
                <span style={{ cursor: "pointer", color: "rgba(255,255,255,0.8)" }} onClick={() => onNavigate("public_leaderboard")}>Department Rankings</span>
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#f5c451", marginBottom: "10px" }}>VERIFICATION & NOTICES</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.82rem" }}>
                <span style={{ cursor: "pointer", color: "rgba(255,255,255,0.8)" }} onClick={() => onNavigate("public_od_list")}>Official OD Letter Verification</span>
                <span style={{ cursor: "pointer", color: "rgba(255,255,255,0.8)" }} onClick={() => onNavigate("public_announcements")}>Sports Announcements</span>
                <span style={{ cursor: "pointer", color: "rgba(255,255,255,0.8)" }} onClick={() => onNavigate("public_gallery")}>Event Photos</span>
                <span style={{ cursor: "pointer", color: "rgba(255,255,255,0.8)" }} onClick={() => onNavigate("login")}>Authorized Portal Sign-In</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.1)",
          paddingTop: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
          fontSize: "0.78rem",
          color: "rgba(255,255,255,0.6)"
        }}>
          <div>© {new Date().getFullYear()} National Engineering College, K.R. Nagar, Kovilpatti - 628 503. All rights reserved.</div>
          <div>Public Guest Portal • Read-Only Access</div>
        </div>
      </footer>
    </div>
  );
}
