import { useRef, useState } from 'react';
import { Download, Printer, FileText } from 'lucide-react';
import Button from '../../components/common/Button';
import { reportsApi } from '../../services/api/apiServices';
import { exportActivityReport, mediaUrl, reportDate, countLabel } from '../../utils/activityReportExport';
import './ActivityReport.css';

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

function Photo({ photo }) {
  const [failed, setFailed] = useState(false);
  return <figure className="activity-report-photo" data-report-block>
    {failed ? <p>Photo unavailable: {photo.title}</p> : <img src={mediaUrl(photo.media_url)} alt={photo.title || 'Event photo'} onError={() => setFailed(true)} />}
    <figcaption><strong>{photo.title}</strong>{photo.caption && <span>{photo.caption}</span>}</figcaption>
  </figure>;
}

function Activity({ activity }) {
  return <section className="activity-report-activity" data-report-block>
    <h4>{activity.name}</h4>
    <p className="activity-report-meta">{reportDate(activity.scheduled_time)} · {activity.kind} · {activity.round} · {activity.status}</p>
    <p>{[activity.sport, activity.category, activity.venue, activity.tournament].filter(Boolean).join(' · ')}</p>
    {activity.kind === 'Match' && <p>
      {['Completed', 'Ongoing'].includes(activity.status) ? `Score: ${activity.score_a} – ${activity.score_b}` : 'Result pending'}
      {activity.winner ? ` · Winner: ${activity.winner}` : activity.status === 'Completed' ? ' · No winner recorded' : ''}
    </p>}
    {activity.results.length > 0 && <div className="activity-report-table-wrap"><table>
      <thead><tr><th>Place</th><th>Entry / athletes</th><th>Department</th><th>Result</th><th>Status</th></tr></thead>
      <tbody>{activity.results.map(entry => <tr key={entry.entry_id}>
        <td>{entry.rank ?? '—'}</td><td>{entry.name}<small>{entry.athletes.map(a => a.student_name).join(', ')}</small></td>
        <td>{entry.department}</td><td>{entry.result_value == null ? '—' : `${Number(entry.result_value)} ${activity.unit}`}</td><td>{entry.result_status}</td>
      </tr>)}</tbody>
    </table></div>}
    <p><strong>Recorded participants: {activity.participants.length}</strong>
      {activity.participants.length > 0 ? ` — ${activity.participants.map(p => `${p.student_name} (${p.department})`).join(', ')}` : ' · Attendance or results not recorded.'}
    </p>
  </section>;
}

export default function ActivityReport() {
  const [from, setFrom] = useState(() => `${today().slice(0, 7)}-01`);
  const [to, setTo] = useState(today);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [includePhotos, setIncludePhotos] = useState(true);
  const [error, setError] = useState('');
  const requestId = useRef(0);
  const stale = report && (report.period.from !== from || report.period.to !== to);
  const generate = async event => {
    event.preventDefault();
    if (!from || !to || from > to) { setError('Select a valid start and end date.'); return; }
    const id = ++requestId.current;
    setLoading(true); setError(''); setReport(null);
    try {
      const data = await reportsApi.getActivityReport({ from, to });
      if (id === requestId.current) setReport(data);
    } catch (err) { if (id === requestId.current) setError(err.message || 'Unable to generate report.'); }
    finally { if (id === requestId.current) setLoading(false); }
  };
  const download = async () => {
    setExporting(true); setError('');
    try { await exportActivityReport(report, includePhotos); }
    catch (err) { setError(err.message || 'Unable to export PDF.'); }
    finally { setExporting(false); }
  };
  return <div className="activity-report-page">
    <form className="nec-card activity-report-controls" onSubmit={generate}>
      <label>From<input className="nec-input" type="date" value={from} max={to || undefined} required onChange={e => setFrom(e.target.value)} /></label>
      <label>To<input className="nec-input" type="date" value={to} min={from || undefined} required onChange={e => setTo(e.target.value)} /></label>
      <label className="activity-report-checkbox"><input type="checkbox" checked={includePhotos} onChange={e => setIncludePhotos(e.target.checked)} /> Include photos</label>
      <Button type="submit" icon={FileText} loading={loading} disabled={exporting}>Generate report</Button>
      <Button variant="outline" icon={Printer} disabled={!report || stale || loading || exporting} onClick={() => window.print()}>Print report</Button>
      <Button icon={Download} disabled={!report || stale || loading} loading={exporting} onClick={download}>Export PDF</Button>
    </form>
    {error && <p role="alert" className="activity-report-error">{error}</p>}
    {stale && <p role="status">Dates changed. Generate the report to update the preview.</p>}
    {loading && <p role="status">Generating report…</p>}
    {!report && !loading && !error && <div className="nec-card activity-report-empty">Select a date range to generate your college sports report.</div>}
    {report && !stale && <article className="activity-report-document">
      <header data-report-block>
        <p className="activity-report-kicker">DEPARTMENT OF PHYSICAL EDUCATION</p>
        <h2>National Engineering College</h2>
        <p>Kovilpatti, Tamil Nadu</p>
        <h3>Sports Activity Report</h3>
        <p>{reportDate(report.period.from)} – {reportDate(report.period.to)} · {report.scope} report</p>
      </header>
      <section data-report-block>
        <h3>Period overview</h3>
        <div className="activity-report-stats">
          {[[report.summary.events, 'Events in scope'], [report.summary.matches, 'Matches'], [report.summary.competitions, 'Competitions'], [report.summary.participants, 'Recorded athletes']].map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}
        </div>
        <p>The selected period includes {countLabel(report.summary.events, 'event')}, {countLabel(report.summary.matches, 'match', 'matches')} and {countLabel(report.summary.competitions, 'competition')}.
          {' '}Completed: {report.summary.completed}. Ongoing: {report.summary.ongoing}. Scheduled or postponed: {report.summary.pending}.
          {' '}Attendance and competition results record {countLabel(report.summary.participants, 'distinct athlete')}.</p>
        {includePhotos && <p>{countLabel(report.summary.photos, 'event photo')} attached.</p>}
        {!report.summary.events && !report.summary.matches && !report.summary.competitions && <p>No sports activities recorded for this period.</p>}
      </section>
      {report.events.map((event, index) => <section className="activity-report-event" key={event.event_id}>
        <div data-report-block>
          <h3>{index + 1}. {event.name}</h3>
          <p className="activity-report-meta">{event.sport} · {event.category} · {event.tournament}</p>
          <p>{reportDate(event.start_time)}{event.end_time && ` – ${reportDate(event.end_time)}`}</p>
          <p>Completed activities: {event.completed} of {event.activities.length}. Recorded athletes: {event.participants.length}.
            {' '}Event registrations: {countLabel(event.registered_teams, 'team')}, {countLabel(event.individual_entries, 'individual entry', 'individual entries')}.</p>
        </div>
        {event.activities.map(activity => <Activity key={activity.id} activity={activity} />)}
        {!event.activities.length && <p>No matches or competitions recorded within the selected dates.</p>}
        {includePhotos && <>
          <h4>Event photos</h4>
          {event.photos.length ? <div className="activity-report-photos">{event.photos.map(photo => <Photo key={photo.gallery_id} photo={photo} />)}</div> : <p>No photos linked to this event.</p>}
        </>}
      </section>)}
      {report.otherActivities.length > 0 && <section><h3>Other matches and competitions</h3>{report.otherActivities.map(activity => <Activity key={activity.id} activity={activity} />)}</section>}
      <footer data-report-block><p>Generated: {reportDate(report.generatedAt)}</p><p>Director of Physical Education</p></footer>
    </article>}
  </div>;
}
