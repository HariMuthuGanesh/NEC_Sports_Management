import React, { useState, useEffect } from "react";
import { tournamentsApi, eventsApi, reportsApi } from "../../services/api/apiServices";
import Button from "../../components/common/Button";
import {
  FileText,
  Printer,
  Download,
  Users
} from "lucide-react";
import "./ActivityReport.css";
import "./AdminPortal.css";

const reportDate = (v) => v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function EventReport() {
  const [tournaments, setTournaments] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [selectedEventId, setSelectedEventId] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      tournamentsApi.getTournaments ? tournamentsApi.getTournaments().catch(() => []) : Promise.resolve([]),
      eventsApi.getEvents ? eventsApi.getEvents().catch(() => []) : Promise.resolve([])
    ]).then(([tData, eData]) => {
      const tArr = Array.isArray(tData) ? tData : [];
      const eArr = Array.isArray(eData) ? eData : [];
      setTournaments(tArr);
      setEvents(eArr);
      if (tArr.length > 0) setSelectedTournamentId(String(tArr[0].tournament_id));
      if (eArr.length > 0) setSelectedEventId(String(eArr[0].event_id));
    }).catch(err => {
      setError(err.message || "Failed to load events");
    });
  }, []);

  const filteredEvents = selectedTournamentId
    ? events.filter(e => Number(e.tournament_id) === Number(selectedTournamentId))
    : events;

  const handleGenerate = async (e) => {
    if (e) e.preventDefault();
    if (!selectedEventId) {
      setError("Please select an event.");
      return;
    }
    setLoading(true);
    setError("");
    setReport(null);
    try {
      const res = await reportsApi.getEventReport(selectedEventId);
      setReport(res);
    } catch (err) {
      setError(err.message || "Unable to generate event report.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadExcel = () => {
    if (!selectedEventId) return;
    const url = reportsApi.getEventReportExcelUrl(selectedEventId);
    window.open(url, "_blank");
  };

  return (
    <div className="activity-report-page">
      <form className="nec-card activity-report-controls" onSubmit={handleGenerate}>
        <label style={{ minWidth: "220px" }}>
          Tournament
          <select
            className="nec-input"
            value={selectedTournamentId}
            onChange={e => {
              const tId = e.target.value;
              setSelectedTournamentId(tId);
              const matching = events.filter(ev => Number(ev.tournament_id) === Number(tId));
              if (matching.length > 0) setSelectedEventId(String(matching[0].event_id));
            }}
          >
            <option value="">All Tournaments</option>
            {tournaments.map(t => (
              <option key={t.tournament_id} value={t.tournament_id}>{t.name}</option>
            ))}
          </select>
        </label>

        <label style={{ minWidth: "240px" }}>
          Event
          <select
            className="nec-input"
            value={selectedEventId}
            onChange={e => setSelectedEventId(e.target.value)}
          >
            {filteredEvents.map(ev => (
              <option key={ev.event_id} value={ev.event_id}>
                {ev.name} ({ev.sport_name})
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
      {loading && <p role="status">Compiling institutional event data…</p>}
      {!report && !loading && !error && (
        <div className="nec-card activity-report-empty">
          Select an event above to generate the official event-specific report.
        </div>
      )}

      {report && (
        <article className="activity-report-document">
          <header data-report-block>
            <p className="activity-report-kicker">DEPARTMENT OF PHYSICAL EDUCATION</p>
            <h2>National Engineering College</h2>
            <p>Kovilpatti, Tamil Nadu</p>
            <h3>Official Event Report</h3>
            <p>
              <strong>{report.event.name}</strong> • Sport: {report.event.sport} • Format: {report.event.format || "Knockout"}
            </p>
            <p>
              Tournament: {report.event.tournament || "General"} • Academic Year: {report.event.academic_year || "—"}
            </p>
          </header>

          {/* Overview Stats */}
          <section data-report-block>
            <h3>Event Overview</h3>
            <div className="activity-report-stats">
              <div><strong>{report.summary.total_teams}</strong><span>Registered Teams</span></div>
              <div><strong>{report.summary.total_athletes}</strong><span>Rostered Athletes</span></div>
              <div><strong>{report.summary.completed_matches}</strong><span>Completed Matches</span></div>
              <div><strong>{report.event.status}</strong><span>Event Status</span></div>
            </div>
          </section>

          {/* Team Rosters & Athletes */}
          {report.athletes && report.athletes.length > 0 && (
            <section data-report-block>
              <h3>Team Rosters & Registered Athletes</h3>
              <div className="activity-report-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Team Name</th>
                      <th>Department</th>
                      <th>Student Name</th>
                      <th>Register Number</th>
                      <th>Role</th>
                      <th>Jersey #</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.athletes.map((a, idx) => (
                      <tr key={idx}>
                        <td><strong>{a.team_name}</strong></td>
                        <td>{a.department_name}</td>
                        <td>{a.student_name}</td>
                        <td><code>{a.register_number}</code></td>
                        <td>{a.role}</td>
                        <td>{a.jersey_number || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Matches & Results */}
          {report.matches && report.matches.length > 0 && (
            <section data-report-block>
              <h3>Fixtures & Match Results</h3>
              <div className="activity-report-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date / Time</th>
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

          <footer data-report-block>
            <p>Generated: {new Date(report.generatedAt).toLocaleString('en-IN')}</p>
            <p>Director of Physical Education, National Engineering College</p>
          </footer>
        </article>
      )}
    </div>
  );
}
