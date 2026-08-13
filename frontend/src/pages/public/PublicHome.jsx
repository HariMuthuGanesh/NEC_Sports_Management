import React, { useEffect, useState } from "react";
import { Radio, Calendar, Trophy, Megaphone, ArrowRight, ShieldCheck } from "lucide-react";
import { matchesApi, leaderboardApi, announcementsApi } from "../../services/api/apiServices";
import { Card, StatCard } from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import "./PublicHome.css";

export default function PublicHome({ onNavigate }) {
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
            <span>Official NEC Campus Sports Portal</span>
          </div>
          <h2 className="nec-hero-title">National Engineering College Sports & Games</h2>
          <p className="nec-hero-subtitle">
            Promoting excellence, teamwork, and athletic mastery across all departments and Lakshmi Ammal Sports Academy.
          </p>
          <div className="nec-hero-actions">
            <Button variant="secondary" icon={Radio} onClick={() => onNavigate("public_live")}>
              Watch Live Scores ({liveMatches.length})
            </Button>
            <Button variant="white" icon={Calendar} onClick={() => onNavigate("public_fixtures")}>
              View Fixtures & Schedule
            </Button>
          </div>
        </div>
      </div>

      {/* Live Matches Section */}
      <div className="nec-section-block">
        <div className="nec-section-header">
          <div className="nec-section-title">
            <Radio size={20} className="nec-icon-live-spin" />
            <h3>Live Action on Campus</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onNavigate("public_live")}>
            View All Live Matches <ArrowRight size={14} />
          </Button>
        </div>

        {liveMatches.length === 0 ? (
          <Card className="nec-no-live-card">
            <p>No matches currently live. Check the fixture schedule for upcoming games today!</p>
          </Card>
        ) : (
          <div className="nec-live-cards-grid">
            {liveMatches.map(m => (
              <Card key={m.id} className="nec-live-match-card">
                <div className="nec-live-card-head">
                  <span className="nec-sport-tag">{m.sport} • {m.round}</span>
                  <Badge status="live">LIVE</Badge>
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
            title="Inter-Department Medal Tally"
            subtitle="Current Leaderboard Standings 2025-2026"
            headerAction={
              <Button variant="ghost" size="sm" onClick={() => onNavigate("public_leaderboard")}>
                Full Tally <ArrowRight size={14} />
              </Button>
            }
          >
            <div className="nec-tally-table-wrapper">
              <table className="nec-mini-tally">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Department</th>
                    <th>🥇 Gold</th>
                    <th>🥈 Silver</th>
                    <th>🥉 Bronze</th>
                    <th>Points</th>
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
            title="Official Sports Bulletin"
            subtitle="Latest Campus Notices & Announcements"
            headerAction={
              <Button variant="ghost" size="sm" onClick={() => onNavigate("public_announcements")}>
                All News <ArrowRight size={14} />
              </Button>
            }
          >
            <div className="nec-bulletin-list">
              {announcements.map(ann => (
                <div key={ann.id} className="nec-bulletin-item">
                  <div className="nec-bulletin-date">{ann.date}</div>
                  <div className="nec-bulletin-title">{ann.title}</div>
                  <div className="nec-bulletin-desc">{ann.content}</div>
                  <div className="nec-bulletin-by">Issued by {ann.author}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
