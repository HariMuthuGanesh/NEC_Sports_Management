import React, { useEffect, useState } from "react";
import { Radio, Calendar, Trophy, Megaphone, ArrowRight, ShieldCheck } from "lucide-react";
import { matchesApi, leaderboardApi, announcementsApi } from "../../services/api/apiServices";
import { Card, StatCard } from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import { useAuth } from "../../context/AuthContext";
import "./PublicHome.css";

export default function PublicHome({ onNavigate }) {
  const { t } = useAuth();
  const [liveMatches, setLiveMatches] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      matchesApi.getMatches(),
      leaderboardApi.getLeaderboard(),
      announcementsApi.getAnnouncements()
    ]).then(([matches, board, anns]) => {
      setLiveMatches(matches.filter(m => m.status === "Live"));
      setLeaderboard(board.slice(0, 5));
      setAnnouncements(anns.slice(0, 3));
      setLoading(false);
    });
  }, []);

  return (
    <div className="nec-public-home">
      {/* Hero Banner with NEC Institutional Sports Theme */}
      <div className="nec-public-hero">
        <div className="nec-hero-content">
          <div className="nec-hero-badge">
            <ShieldCheck size={16} />
            <span>{t.officialPortal}</span>
          </div>
          <h2 className="nec-hero-title">{t.heroTitle}</h2>
          <p className="nec-hero-subtitle">
            {t.heroSubtitle}
          </p>
          <div className="nec-hero-actions">
            <Button variant="secondary" icon={Radio} onClick={() => onNavigate("public_live")}>
              {t.watchLiveScores} ({liveMatches.length})
            </Button>
            <Button variant="white" icon={Calendar} onClick={() => onNavigate("public_fixtures")}>
              {t.viewFixturesSchedule}
            </Button>
          </div>
        </div>
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
          <Card className="nec-no-live-card">
            <p>{t.noMatchesLive}</p>
          </Card>
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

      {/* Grid: Department Tally & Announcements */}
      <div className="nec-home-grid">
        <div className="nec-home-col">
          <Card
            title={t.interDeptTally}
            subtitle={t.currentLeaderboardStandings}
            headerAction={
              <Button variant="ghost" size="sm" onClick={() => onNavigate("public_leaderboard")}>
                {t.fullTally} <ArrowRight size={14} />
              </Button>
            }
          >
            <div className="nec-tally-table-wrapper">
              <table className="nec-mini-tally">
                <thead>
                  <tr>
                    <th>{t.rank}</th>
                    <th>{t.department}</th>
                    <th>🥇 {t.gold}</th>
                    <th>🥈 {t.silver}</th>
                    <th>🥉 {t.bronze}</th>
                    <th>{t.points}</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map(row => (
                    <tr key={row.deptCode}>
                      <td className="nec-rank-cell">#{row.rank}</td>
                      <td className="nec-dept-cell"><strong>{row.deptCode}</strong> - {row.deptName}</td>
                      <td>{row.gold}</td>
                      <td>{row.silver}</td>
                      <td>{row.bronze}</td>
                      <td><strong>{row.points}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="nec-home-col">
          <Card
            title={t.officialBulletin}
            subtitle={t.latestNotices}
            headerAction={
              <Button variant="ghost" size="sm" onClick={() => onNavigate("public_announcements")}>
                {t.allNews} <ArrowRight size={14} />
              </Button>
            }
          >
            <div className="nec-bulletin-list">
              {announcements.map(ann => (
                <div key={ann.id} className="nec-bulletin-item">
                  <div className="nec-bulletin-date">{ann.date}</div>
                  <div className="nec-bulletin-title">{ann.title}</div>
                  <div className="nec-bulletin-desc">{ann.content}</div>
                  <div className="nec-bulletin-by">{t.issuedBy} {ann.author}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
