import React, { useState, useEffect } from "react";
import { tournamentsApi, reportsApi } from "../../services/api/apiServices";
import Button from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import {
  Trophy,
  FileText,
  Printer,
  Download,
  Calendar,
  Medal,
  Users
} from "lucide-react";
import "./ActivityReport.css";
import "./AdminPortal.css";

const reportDate = (v) => v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function TournamentReport() {
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    tournamentsApi.getTournaments().then(data => {
      const arr = Array.isArray(data) ? data : [];
      setTournaments(arr);
      if (arr.length > 0 && !selectedTournamentId) {
        setSelectedTournamentId(String(arr[0].tournament_id));
      }
    }).catch(err => {
      setError(err.message || "Failed to load tournaments");
    });
  }, []);

  const handleGenerate = async (e) => {
    if (e) e.preventDefault();
    if (!selectedTournamentId) {
      setError("Please select a tournament.");
      return;
    }
    setLoading(true);
    setError("");
    setReport(null);
    try {
      const res = await reportsApi.getTournamentReport(selectedTournamentId);
      setReport(res);
    } catch (err) {
      setError(err.message || "Unable to generate tournament report.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadExcel = () => {
    if (!selectedTournamentId) return;
    const url = reportsApi.getTournamentReportExcelUrl(selectedTournamentId);
    window.open(url, "_blank");
  };

  return (
    <div className="activity-report-page">
      <form className="nec-card activity-report-controls" onSubmit={handleGenerate}>
        <label style={{ minWidth: "260px" }}>
          Tournament
          <select
            className="nec-input"
            value={selectedTournamentId}
            onChange={e => setSelectedTournamentId(e.target.value)}
          >
            {tournaments.map(t => (
              <option key={t.tournament_id} value={t.tournament_id}>
                {t.name} ({t.academic_year || 'Current'})
              </option>
            ))}
          </select>
        </label>

        <Button type="submit" icon={FileText} loading={loading}>
          Generate Report
        </Button>
        <Button
          variant="outline"
          icon={Printer}
          disabled={!report || loading}
          onClick={() => window.print()}
        >
          Print Report
        </Button>
        <Button
          variant="outline"
          icon={Download}
          disabled={!report || loading}
          onClick={handleDownloadExcel}
        >
          Export Excel (.xlsx)
        </Button>
      </form>

      {error && <p role="alert" className="activity-report-error">{error}</p>}
      {loading && <p role="status">Compiling institutional tournament data…</p>}
      {!report && !loading && !error && (
        <div className="nec-card activity-report-empty">
          Select a tournament above to generate the official consolidated institutional report.
        </div>
      )}

      {report && (
        <article className="activity-report-document">
          <header data-report-block>
            <p className="activity-report-kicker">DEPARTMENT OF PHYSICAL EDUCATION</p>
            <h2>National Engineering College</h2>
            <p>Kovilpatti, Tamil Nadu</p>
            <h3>Tournament Institutional Report</h3>
            <p>
              <strong>{report.tournament.name}</strong> • Academic Year: {report.tournament.academic_year || "—"} • Tier: {report.tournament.tier || "Intramural"}
            </p>
            <p>
              Dates: {reportDate(report.tournament.start_date)} to {reportDate(report.tournament.end_date)}
            </p>
          </header>

          {/* Tournament Overview Stats */}
          <section data-report-block>
            <h3>Tournament Overview</h3>
            <div className="activity-report-stats">
              <div><strong>{report.summary.total_events}</strong><span>Total Events</span></div>
              <div><strong>{report.summary.total_teams}</strong><span>Registered Teams</span></div>
              <div><strong>{report.summary.completed_matches}</strong><span>Completed Matches</span></div>
              <div><strong>{report.summary.total_competitions}</strong><span>Competitions / Heats</span></div>
            </div>
          </section>

          {/* Department Standings Table */}
          {report.standings && report.standings.length > 0 && (
            <section data-report-block>
              <h3>Department Standings & Medal Tally</h3>
              <div className="activity-report-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Department</th>
                      <th>Gold</th>
                      <th>Silver</th>
                      <th>Bronze</th>
                      <th>Match Wins</th>
                      <th>Total Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.standings.map(st => (
                      <tr key={st.department}>
                        <td><strong>#{st.rank}</strong></td>
                        <td><strong>{st.department}</strong> ({st.code})</td>
                        <td>{st.gold}</td>
                        <td>{st.silver}</td>
                        <td>{st.bronze}</td>
                        <td>{st.wins}</td>
                        <td><strong>{st.points} pts</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Events Catalog */}
          <section data-report-block>
            <h3>Events Under This Tournament</h3>
            <div className="activity-report-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Event Title</th>
                    <th>Sport</th>
                    <th>Category</th>
                    <th>Teams</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {report.events.map(ev => (
                    <tr key={ev.event_id}>
                      <td><strong>{ev.name}</strong></td>
                      <td>{ev.sport_name}</td>
                      <td>{ev.category} ({ev.gender_category || 'Mixed'})</td>
                      <td>{ev.registered_teams} Teams</td>
                      <td>{ev.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Matches & Results */}
          {report.matches && report.matches.length > 0 && (
            <section data-report-block>
              <h3>Match Fixtures & Official Results</h3>
              <div className="activity-report-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date / Time</th>
                      <th>Sport</th>
                      <th>Round</th>
                      <th>Team A</th>
                      <th>Team B</th>
                      <th>Score</th>
                      <th>Winner</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.matches.map(m => (
                      <tr key={m.match_id}>
                        <td>{reportDate(m.scheduled_time)}</td>
                        <td>{m.sport_name}</td>
                        <td>{m.round}</td>
                        <td>{m.team_a_name} ({m.team_a_dept})</td>
                        <td>{m.team_b_name} ({m.team_b_dept})</td>
                        <td>{['Completed', 'Ongoing'].includes(m.status) ? `${m.score_a} - ${m.score_b}` : '—'}</td>
                        <td><strong>{m.winner_name || (m.status === 'Completed' ? 'Tie / Draw' : '—')}</strong></td>
                        <td>{m.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Competitions / Podiums */}
          {report.competitions && report.competitions.length > 0 && (
            <section data-report-block>
              <h3>Athletics & Individual Competitions</h3>
              <div className="activity-report-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Competition</th>
                      <th>Sport</th>
                      <th>Round</th>
                      <th>1st Place (Gold)</th>
                      <th>2nd Place (Silver)</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.competitions.map(c => (
                      <tr key={c.competition_id}>
                        <td><strong>{c.name}</strong></td>
                        <td>{c.sport_name}</td>
                        <td>{c.round}</td>
                        <td>{c.winner || '—'}</td>
                        <td>{c.runner || '—'}</td>
                        <td>{c.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <footer data-report-block>
            <p>Generated: {new Date(report.generatedAt).toLocaleString('en-IN')}</p>
            <p>Director of Physical Education, National Engineering College</p>
          </footer>
        </article>
      )}
    </div>
  );
}
