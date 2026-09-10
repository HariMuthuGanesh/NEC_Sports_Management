import React, { useState, useEffect } from "react";
import { Trophy, Users, Award, FileText, CheckCircle, Clock, Search, AlertCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import "./PresidentDashboard.css";

export default function PresidentDashboard({ onSelectNav }) {
  const { currentUser, authToken } = useAuth();
  const [stats, setStats] = useState({
    outerCollegeTeams: 0,
    totalAthletes: 0,
    activeODs: 0,
    upcomingTournaments: 0
  });
  const [odList, setOdList] = useState([]);
  const [outerTeams, setOuterTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch OD list
      const odRes = await fetch(`${apiUrl}/api/od`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const odData = await odRes.json();
      if (odData.success && Array.isArray(odData.data)) {
        setOdList(odData.data);
      }

      // Fetch Outer-College teams
      const teamsRes = await fetch(`${apiUrl}/api/teams`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const teamsData = await teamsRes.json();
      if (teamsData.success && Array.isArray(teamsData.data)) {
        const outer = teamsData.data.filter(t => t.team_type === 'Outer-College' || t.teamType === 'Outer-College');
        setOuterTeams(outer);
        setStats(prev => ({
          ...prev,
          outerCollegeTeams: outer.length,
          totalAthletes: teamsData.data.reduce((acc, t) => acc + (t.player_count || t.playerCount || 0), 0)
        }));
      }

      // Fetch Tournaments
      const tourRes = await fetch(`${apiUrl}/api/tournaments`);
      const tourData = await tourRes.json();
      if (tourData.success && Array.isArray(tourData.data)) {
        setStats(prev => ({
          ...prev,
          upcomingTournaments: tourData.data.filter(t => t.status === 'Upcoming' || t.status === 'Ongoing').length
        }));
      }
    } catch (err) {
      console.error("Error fetching president dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredODs = odList.filter(item =>
    item.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.department_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.register_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="nec-president-dashboard">
      <div className="nec-president-header">
        <div>
          <h2>Sports President Executive Portal</h2>
          <p className="nec-subtext">Overall college sports leadership, outer-college competition teams, and OD overview.</p>
        </div>
        <button className="nec-btn-primary" onClick={() => onSelectNav && onSelectNav("college_teams")}>
          <Users size={16} /> Manage Outer-College Teams
        </button>
      </div>

      {/* Metrics Row */}
      <div className="nec-metrics-grid">
        <div className="nec-metric-card primary">
          <div className="metric-icon"><Trophy size={24} /></div>
          <div className="metric-info">
            <span className="metric-label">Outer-College Teams</span>
            <span className="metric-value">{stats.outerCollegeTeams}</span>
          </div>
        </div>

        <div className="nec-metric-card success">
          <div className="metric-icon"><Users size={24} /></div>
          <div className="metric-info">
            <span className="metric-label">Active Athletes</span>
            <span className="metric-value">{stats.totalAthletes}</span>
          </div>
        </div>

        <div className="nec-metric-card warning">
          <div className="metric-icon"><FileText size={24} /></div>
          <div className="metric-info">
            <span className="metric-label">Total OD Requests</span>
            <span className="metric-value">{odList.length}</span>
          </div>
        </div>

        <div className="nec-metric-card info">
          <div className="metric-icon"><Award size={24} /></div>
          <div className="metric-info">
            <span className="metric-label">Active Tournaments</span>
            <span className="metric-value">{stats.upcomingTournaments}</span>
          </div>
        </div>
      </div>

      {/* Chain of Command Note */}
      <div className="nec-command-chain-banner">
        <AlertCircle size={18} />
        <span><strong>Chain of Command:</strong> PET Sir / Admin → <strong>Sports President</strong> → Department Coordinator → Team Captain → Player</span>
      </div>

      {/* OD Information Matrix */}
      <div className="nec-card">
        <div className="nec-card-header">
          <h3><FileText size={18} /> Department OD Notification Matrix</h3>
          <div className="nec-search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search student, register number, department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="nec-loading">Loading OD records...</div>
        ) : filteredODs.length === 0 ? (
          <div className="nec-empty">No OD notifications found.</div>
        ) : (
          <div className="nec-table-responsive">
            <table className="nec-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Reg No</th>
                  <th>Dept</th>
                  <th>Tournament / Match</th>
                  <th>Dates</th>
                  <th>Days</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredODs.slice(0, 10).map((od) => (
                  <tr key={od.id || od.od_id}>
                    <td><strong>{od.student_name || od.name || 'Student Athlete'}</strong></td>
                    <td>{od.register_number || od.reg_no || 'N/A'}</td>
                    <td><span className="nec-badge dept">{od.department_code || od.dept || 'NEC'}</span></td>
                    <td>{od.tournament_name || od.match_title || 'Inter-College Match'}</td>
                    <td>{od.from_date ? new Date(od.from_date).toLocaleDateString() : 'TBD'} - {od.to_date ? new Date(od.to_date).toLocaleDateString() : 'TBD'}</td>
                    <td>{od.total_days || 1} day(s)</td>
                    <td>
                      <span className={`nec-badge status-${(od.status || od.approval_status || 'Pending').toLowerCase()}`}>
                        {od.status || od.approval_status || 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
