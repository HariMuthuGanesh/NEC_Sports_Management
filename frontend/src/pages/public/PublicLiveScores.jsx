import React, { useCallback } from "react";
import { matchesApi } from "../../services/api/apiServices";
import { useAuth } from "../../context/AuthContext";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";
import { Card } from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import SkeletonLoader from "../../components/common/SkeletonLoader";
import PublicInfoCard from "../../components/common/PublicInfoCard";
import { Trophy, Calendar } from "lucide-react";
import "./PublicPortal.css";

// Helper for formatting date strings cleanly
function formatMatchDate(val) {
  if (!val) return "Recent";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  } catch {
    return String(val);
  }
}

// Sport icon helper
function getSportIcon(sportName = "") {
  const s = String(sportName).toLowerCase();
  if (s.includes("cricket")) return "🏏";
  if (s.includes("football") || s.includes("soccer")) return "⚽";
  if (s.includes("badminton")) return "🏸";
  if (s.includes("volleyball")) return "🏐";
  if (s.includes("basketball")) return "🏀";
  if (s.includes("kabaddi")) return "🤼";
  if (s.includes("chess")) return "♟️";
  if (s.includes("table tennis")) return "🏓";
  if (s.includes("athletic") || s.includes("track")) return "🏃";
  return "🏆";
}

export default function PublicLiveScores({ onNavigate }) {
  const { t } = useAuth();
  
  const fetchMatches = useCallback(async () => {
    const res = await matchesApi.getMatches();
    return Array.isArray(res) ? res : [];
  }, []);

  const { data: matchesData, loading, error } = useAutoRefresh(fetchMatches, { interval: 15000 });
  const matches = matchesData || [];

  const liveList = matches.filter(m => m.status === "Ongoing");
  const recentList = matches.filter(m => m.status === "Completed");

  return (
    <div className="nec-portal-page">
      <div className="nec-page-header">
        <h2 className="nec-page-title">{t.liveScores || "Campus Live Scores & Results"}</h2>
      </div>

      <div className="nec-portal-section">
        <h3 className="nec-sub-title">🔴 {liveList.length} Live Matches in Progress</h3>
        {loading ? (
          <SkeletonLoader rows={2} type="cards" />
        ) : (error || liveList.length === 0) ? (
          <PublicInfoCard
            icon={Trophy}
            title="No Live Matches"
            message="No matches currently in progress."
            actionText="View Fixtures"
            onAction={() => onNavigate && onNavigate("public_fixtures")}
          />
        ) : (
          <div className="nec-matches-grid">
            {liveList.map(m => (
              <Card key={m.id} className="nec-score-card live">
                <div className="nec-score-head">
                  <span>{getSportIcon(m.sport)} {m.sport} • {m.round}</span>
                  <Badge status="live">{t.live || "LIVE SCORE"}</Badge>
                </div>
                <div className="nec-score-main">
                  <div className="nec-score-team">
                    <span className="nec-st-dept">{m.deptA}</span>
                    <span className="nec-st-name">{m.teamA}</span>
                  </div>
                  <div className="nec-score-badge">{m.scoreA} - {m.scoreB}</div>
                  <div className="nec-score-team text-right">
                    <span className="nec-st-dept">{m.deptB}</span>
                    <span className="nec-st-name">{m.teamB}</span>
                  </div>
                </div>
                <div className="nec-score-foot">
                  <span>📍 {m.venue}</span>
                  <span>{m.detailScore}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="nec-portal-section">
        <h3 className="nec-sub-title">🏆 Recent Completed Match Results</h3>
        {loading ? (
          <SkeletonLoader rows={2} />
        ) : (error || recentList.length === 0) ? (
          <PublicInfoCard
            icon={Calendar}
            title="No Completed Matches"
            message="No completed match records."
            variant="flat"
          />
        ) : (
          <div className="nec-completed-grid">
            {recentList.map(m => (
              <Card key={m.id} className="nec-score-card completed medium-box">
                <div className="nec-score-head">
                  <span>{getSportIcon(m.sport)} {m.sport} • {formatMatchDate(m.date)}</span>
                  <Badge status="success">Completed</Badge>
                </div>
                <div className="nec-score-main">
                  <div className="nec-score-team">
                    <span className="nec-st-dept">{m.deptA || "TEAM"}</span>
                    <span className="nec-st-name">{m.teamA}</span>
                  </div>
                  <div className="nec-score-badge dark">{m.scoreA} - {m.scoreB}</div>
                  <div className="nec-score-team text-right">
                    <span className="nec-st-dept">{m.deptB || "TEAM"}</span>
                    <span className="nec-st-name">{m.teamB}</span>
                  </div>
                </div>
                <div className="nec-winner-banner">
                  Winner: <strong>{m.winner}</strong> {m.detailScore ? `(${m.detailScore})` : ""}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
