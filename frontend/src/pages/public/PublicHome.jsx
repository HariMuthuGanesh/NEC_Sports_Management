import React, { useEffect, useState } from "react";
import { matchesApi, leaderboardApi, announcementsApi } from "../../services/api/apiServices";
import { useAuth, ROLES } from "../../context/AuthContext";
import { Card, StatCard } from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import PublicInfoCard from "../../components/common/PublicInfoCard";
import { Trophy, Users, Radio, Calendar, Megaphone, ArrowRight, LogIn } from "lucide-react";
import "./PublicPortal.css";

export default function PublicHome({ onNavigate }) {
  const { t, currentUser } = useAuth();
  
  const [liveMatches, setLiveMatches] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [matches, board, anns] = await Promise.all([
        matchesApi.getMatches(),
        leaderboardApi.getLeaderboard(),
        announcementsApi.getAll()
      ]);
      setLiveMatches(matches.filter(m => m.status === "Live"));
      setLeaderboard(board.slice(0, 5));
      setAnnouncements(anns.slice(0, 3));
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="nec-portal-page">
      {/* Hero Section */}
      <section className="nec-portal-hero">
        <div className="nec-hero-content">
          <div className="nec-hero-badge">
            <Trophy size={16} className="nec-gold-icon" />
            <span>Lakshmi Ammal Sports Academy</span>
          </div>
          <h1 className="nec-hero-title">
            {t.heroTitle}
          </h1>
          <p className="nec-hero-subtitle">
            {t.heroSubtitle}
          </p>
          <div className="nec-hero-actions">
            {liveMatches.length > 0 ? (
              <Button variant="secondary" icon={Radio} onClick={() => onNavigate("public_live")}>
                🟢 {liveMatches.length} Matches Live Now
              </Button>
            ) : (
              <Button variant="secondary" icon={Radio} onClick={() => onNavigate("public_live")}>
                ⚪ No Live Matches Right Now
              </Button>
            )}
            <Button variant="white" icon={Calendar} onClick={() => onNavigate("public_fixtures")}>
              📅 View Tournament Schedules
            </Button>
            {currentUser.role === ROLES.PUBLIC ? (
              <Button variant="primary" icon={LogIn} onClick={() => onNavigate("login")}>
                {t.login || "Portal Sign In"}
              </Button>
            ) : (
              <Button variant="primary" onClick={() => onNavigate(currentUser.role === ROLES.ADMIN ? "admin_dash" : currentUser.role === ROLES.COORDINATOR ? "coord_dash" : "player_dash")}>
                Go to Dashboard
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      {(error || (!loading && liveMatches.length === 0 && leaderboard.length === 0 && announcements.length === 0)) ? (
        <div style={{ padding: "40px" }}>
          <PublicInfoCard
            icon={Trophy}
            title="Campus Sports Activities"
            message="There are currently no ongoing sports activities. Upcoming tournaments, match schedules, announcements, and results will appear here as they become available."
            actionText="View Sports Gallery"
            onAction={() => onNavigate("public_gallery")}
          />
        </div>
      ) : loading ? (
        <p style={{ textAlign: 'center', padding: '40px' }}>Loading sports information...</p>
      ) : (
        <>
          {/* Public Dashboard Statistics */}
          <div className="nec-home-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px" }}>
            <StatCard title="Sports" value="8+" icon={Trophy} subtext="Active Disciplines" color="gold" onClick={() => onNavigate("public_leaderboard")} />
            <StatCard title="Athletes" value="500+" icon={Users} subtext="Registered Players" color="navy" onClick={() => onNavigate("login")} />
            <StatCard title="Live Matches" value={liveMatches.length} icon={Radio} subtext="Currently Playing" color="navy" trend={liveMatches.length > 0 ? "+ Active" : undefined} onClick={() => onNavigate("public_live")} />
            <StatCard title="Announcements" value={announcements.length} icon={Megaphone} subtext="Recent Notices" color="navy" onClick={() => onNavigate("public_announcements")} />
          </div>

          {/* Live Matches Section */}
          <div className="nec-section-block">
            <div className="nec-section-header">
              <div className="nec-section-title">
                <Radio size={20} className="nec-icon-live-spin" />
                <h3>{t.liveActionCampus}</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onNavigate("public_live")}>
                {t.viewAllLiveMatches} <ArrowRight size={14} />
              </Button>
            </div>

            {liveMatches.length === 0 ? (
              <PublicInfoCard 
                icon={Radio}
                title="No Live Matches Today" 
                message="There are currently no live matches being played on campus. Live scores will automatically appear here once a match begins." 
                variant="flat"
                actionText="View Fixtures"
                onAction={() => onNavigate("public_fixtures")}
              />
            ) : (
              <div className="nec-live-cards-grid">
                {liveMatches.map(m => (
                  <Card key={m.id} className="nec-live-match-card">
                    <div className="nec-live-card-head">
                      <span className="nec-sport-tag">{m.sport} • {m.round}</span>
                      <Badge status="live">{t.live}</Badge>
                    </div>
                    <div className="nec-score-display">
                      <div className="nec-team-col">
                        <span className="nec-team-code">{m.deptA}</span>
                        <span className="nec-team-name">{m.teamA}</span>
                      </div>
                      <div className="nec-score-val">{m.scoreA} - {m.scoreB}</div>
                      <div className="nec-team-col text-right">
                        <span className="nec-team-code">{m.deptB}</span>
                        <span className="nec-team-name">{m.teamB}</span>
                      </div>
                    </div>
                    <div className="nec-live-card-sub">
                      <span>📍 {m.venue}</span>
                      <span className="nec-detail-score">{m.detailScore}</span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="nec-home-grid-2col">
            {/* Medals Tally Snippet */}
            <div className="nec-section-block">
              <div className="nec-section-header">
                <div className="nec-section-title">
                  <Trophy size={20} className="nec-gold-icon" />
                  <h3>{t.topDepartments}</h3>
                </div>
                <Button variant="ghost" size="sm" onClick={() => onNavigate("public_leaderboard")}>
                  Full Leaderboard <ArrowRight size={14} />
                </Button>
              </div>
              
              {leaderboard.length === 0 ? (
                <PublicInfoCard
                  icon={Trophy}
                  title="Rankings Not Available Yet"
                  message="Leaderboards will be published after competitions begin."
                  variant="flat"
                />
              ) : (
                <div className="nec-tally-mini-list">
                  {leaderboard.slice(0, 5).map((dept, idx) => (
                    <div key={dept.id} className="nec-tally-mini-item">
                      <div className="nec-tally-rank">#{idx + 1}</div>
                      <div className="nec-tally-dept">{dept.name}</div>
                      <div className="nec-tally-pts">{dept.total_points} PTS</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Announcements Snippet */}
            <div className="nec-section-block">
              <div className="nec-section-header">
                <div className="nec-section-title">
                  <Megaphone size={20} className="nec-navy-icon" />
                  <h3>{t.latestAnnouncements}</h3>
                </div>
                <Button variant="ghost" size="sm" onClick={() => onNavigate("public_announcements")}>
                  All News <ArrowRight size={14} />
                </Button>
              </div>

              {announcements.length === 0 ? (
                <PublicInfoCard
                  icon={Megaphone}
                  title="No Announcements"
                  message="There are no new sports announcements at this time."
                  variant="flat"
                />
              ) : (
                <div className="nec-ann-mini-list">
                  {announcements.slice(0, 3).map((ann, idx) => {
                    const isImp = ann.isImportant || ann.priority === 'HIGH' || ann.priority === 'CRITICAL';
                    const rawDate = ann.postedDate || ann.created_at;
                    const dateStr = rawDate ? new Date(rawDate).toLocaleDateString() : 'Recent';
                    return (
                      <div key={ann.id || ann.announcement_id || idx} className="nec-ann-mini-item">
                        <Badge status={isImp ? "danger" : "info"}>
                          {isImp ? "IMPORTANT" : "NOTICE"}
                        </Badge>
                        <h4 className="nec-ann-mini-title">{ann.title}</h4>
                        <span className="nec-ann-mini-date">{dateStr}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
