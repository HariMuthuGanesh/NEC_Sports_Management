import React, { useEffect, useState } from "react";
import { matchesApi } from "../../services/api/apiServices";
import { useAuth } from "../../context/AuthContext";
import { Card } from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import SkeletonLoader from "../../components/common/SkeletonLoader";
import PublicInfoCard from "../../components/common/PublicInfoCard";
import { Trophy, Calendar } from "lucide-react";
import "./PublicPortal.css";

export default function PublicLiveScores({ onNavigate }) {
  const { t } = useAuth();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMatches = () => {
    setLoading(true);
    setError(null);
    matchesApi.getMatches().then(data => {
      setMatches(data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setError(err.message);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  const liveList = matches.filter(m => m.status === "Live");
  const recentList = matches.filter(m => m.status === "Completed");

  return (
    <div className="nec-portal-page">
      <div className="nec-page-header">
        <h2 className="nec-page-title">{t.liveScores || "Campus Live Scores & Results"}</h2>
        <p className="nec-page-desc">Real-time match scores and completed game results across all NEC sports venues.</p>
      </div>

      <div className="nec-portal-section">
        <h3 className="nec-sub-title">🔴 {liveList.length} Live Matches in Progress</h3>
        {loading ? (
          <SkeletonLoader rows={2} type="cards" />
        ) : (error || liveList.length === 0) ? (
          <PublicInfoCard
            icon={Trophy}
            title="No Live Matches Today"
            message="There are currently no live matches being played on campus. Live scores will automatically appear here once a match begins."
            actionText="View Fixtures"
            onAction={() => onNavigate && onNavigate("public_fixtures")}
          />
        ) : (
          <div className="nec-matches-grid">
            {liveList.map(m => (
              <Card key={m.id} className="nec-score-card live">
                <div className="nec-score-head">
                  <span>{m.sport} • {m.round}</span>
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
          <SkeletonLoader rows={3} />
        ) : (error || recentList.length === 0) ? (
          <PublicInfoCard
            icon={Calendar}
            title="No Completed Matches Yet"
            message="Completed match results and final scores will appear here after tournaments conclude."
            variant="flat"
          />
        ) : (
          <div className="nec-matches-grid">
            {recentList.map(m => (
              <Card key={m.id} className="nec-score-card completed">
                <div className="nec-score-head">
                  <span>{m.sport} • {m.date}</span>
                  <Badge status="success">COMPLETED</Badge>
                </div>
                <div className="nec-score-main">
                  <div className="nec-score-team">
                    <span className="nec-st-name">{m.teamA} ({m.deptA})</span>
                  </div>
                  <div className="nec-score-badge dark">{m.scoreA} - {m.scoreB}</div>
                  <div className="nec-score-team text-right">
                    <span className="nec-st-name">{m.teamB} ({m.deptB})</span>
                  </div>
                </div>
                <div className="nec-winner-banner">
                  Winner: <strong>{m.winner}</strong> ({m.detailScore})
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
