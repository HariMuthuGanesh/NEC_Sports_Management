import React, { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '../../services/api/apiServices';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';
import Table from '../../components/common/Table';
import { ArrowLeft, Play, Check, Plus } from 'lucide-react';

export default function CompetitionWorkspace({ tournamentId }) {
  const { currentUser } = useAuth();
  const manager = ['Admin', 'Sports President'].includes(currentUser.role);
  const scorer = manager || currentUser.role === 'Score Updater';
  const [competitions, setCompetitions] = useState([]);
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selected, setSelected] = useState(null);
  const [details, setDetails] = useState(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ eventId: '', categoryId: '', name: '', round: 'Final', entrySize: 1, scoring: 'Time', unit: 'seconds', scheduledTime: '' });
  const [entry, setEntry] = useState({ name: '', registers: '' });
  const [results, setResults] = useState({});
  const load = useCallback(async () => {
    const rows = await apiFetch(`/competitions${tournamentId ? `?tournamentId=${tournamentId}` : ''}`);
    setCompetitions(rows);
    if (selected) {
      const data = await apiFetch(`/competitions/${selected}`);
      setDetails(data);
      setResults(Object.fromEntries(data.entries.map(e => [e.entry_id, { resultValue: e.result_value ?? '', resultStatus: e.result_status === 'Pending' ? 'Finished' : e.result_status }])));
    }
  }, [selected, tournamentId]);
  useEffect(() => { load().catch(e => setError(e.message)); }, [load]);
  useEffect(() => {
    if (manager) apiFetch('/events').then(rows => setEvents(rows.filter(e => !tournamentId || Number(e.tournament_id || e.tournamentId) === Number(tournamentId)))).catch(e => setError(e.message));
  }, [manager, tournamentId]);
  const run = async (operation) => {
    setError(''); setBusy(true);
    try { await operation(); await load(); } catch(e) { setError(e.message); } finally { setBusy(false); }
  };
  const field = (key,value) => setForm(prev => ({...prev,[key]:value}));
  const selectEvent = async (id) => {
    setForm(prev => ({...prev,eventId:id,categoryId:''})); setCategories([]);
    const event = events.find(e => String(e.event_id || e.id).replace('ev_','') === id);
    if (event) try { setCategories(await apiFetch(`/sports/${event.sport_id || event.sportId}/categories`)); } catch(e) { setError(e.message); }
  };
  return <section className="nec-card" style={{ padding: 20, marginTop: 16 }}>
    <div style={{ display:'flex',gap:12,alignItems:'center',marginBottom:16 }}>
      {selected && <Button icon={ArrowLeft} title="Back" onClick={() => { setSelected(null); setDetails(null); }} />}
      <h3>{details?.name || 'Event Competitions'}</h3>
      {manager && !selected && <Button icon={Plus} title="Create" onClick={() => setCreating(!creating)} />}
    </div>
    {error && <p role="alert" className="nec-error-text">{error}</p>}
    {creating && !selected && <form onSubmit={e => { e.preventDefault(); run(async () => { await apiFetch('/competitions','POST',form); setCreating(false); }); }}>
      <div className="nec-form-grid">
        <label>Event<select className="nec-input" required value={form.eventId} onChange={e => selectEvent(e.target.value)}><option value="">Select event</option>{events.map(e => <option key={e.event_id || e.id} value={String(e.event_id || e.id).replace('ev_','')}>{e.name || e.title}</option>)}</select></label>
        <label>Category<select className="nec-input" required value={form.categoryId} onChange={e => field('categoryId',e.target.value)}><option value="">Select category</option>{categories.map(c => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}</select></label>
        <label>Name<input className="nec-input" required maxLength={120} value={form.name} onChange={e => field('name',e.target.value)} /></label>
        <label>Round<select className="nec-input" value={form.round} onChange={e => field('round',e.target.value)}>{['Heat','Qualifier','Semi-Final','Final'].map(v => <option key={v}>{v}</option>)}</select></label>
        <label>Athletes per entry<input className="nec-input" type="number" required min="1" max="30" value={form.entrySize} onChange={e => field('entrySize',Number(e.target.value))} /><small>Individual: 1 · Relay: squad size</small></label>
        <label>Result type<select className="nec-input" value={form.scoring} onChange={e => setForm(prev => ({...prev,scoring:e.target.value,unit:e.target.value==='Time'?'seconds':e.target.value==='Distance'?'metres':'points'}))}>{['Time','Distance','Points'].map(v => <option key={v}>{v}</option>)}</select></label>
        <label>Unit<input className="nec-input" required maxLength="20" value={form.unit} onChange={e => field('unit',e.target.value)} /></label>
        <label>Scheduled<input className="nec-input" type="datetime-local" required value={form.scheduledTime} onChange={e => field('scheduledTime',e.target.value)} /></label>
      </div><Button type="submit" loading={busy}>Save</Button>
    </form>}
    {!selected && <Table data={competitions} columns={[
      {key:'name',label:'Competition'}, {key:'sport_name',label:'Sport'}, {key:'category_name',label:'Category'}, {key:'round',label:'Round'}, {key:'status',label:'Status'},
      {key:'competition_id',label:'',render:(id,row) => <><Button title="View" onClick={() => { setDetails(null); setSelected(id); }}>View</Button>{manager && row.status==='Scheduled' && <Button variant="danger" title="Delete" onClick={() => { if(window.confirm(`Delete ${row.name}?`)) run(()=>apiFetch(`/competitions/${id}`,'DELETE')); }}>Delete</Button>}</>}
    ]} />}
    {details && <>
      <p>{details.round} · {details.scoring} ({details.unit}) · {details.status}</p>
      {manager && details.status!=='Completed' && <Button icon={details.status==='Scheduled'?Play:Check} loading={busy} onClick={() => run(() => apiFetch(`/competitions/${selected}`,'PATCH',{status:details.status==='Scheduled'?'Ongoing':'Completed'}))}>{details.status==='Scheduled'?'Start':'Complete'}</Button>}
      {details.status==='Scheduled' && currentUser.role!=='Score Updater' && <form style={{display:'flex',gap:12,alignItems:'end',flexWrap:'wrap',margin:'16px 0'}} onSubmit={e => { e.preventDefault(); run(async () => { await apiFetch(`/competitions/${selected}/entries`,'POST',{name:entry.name,registerNumbers:entry.registers.split(',').map(s => s.trim())}); setEntry({name:'',registers:''}); }); }}>
        {details.entry_size>1 && <label>Entry name<input className="nec-input" required value={entry.name} onChange={e => setEntry({...entry,name:e.target.value})} /></label>}
        <label>Register numbers ({details.entry_size})<input className="nec-input" required value={entry.registers} onChange={e => setEntry({...entry,registers:e.target.value})} /><small>Separate with commas</small></label>
        <Button type="submit" loading={busy}>Add</Button>
      </form>}
      <Table data={details.entries} columns={[
        {key:'name',label:'Entry'}, {key:'athletes',label:'Athletes'}, {key:'department_code',label:'Department'},
        {key:'rank',label:'Place',render:v => v===1?'Winner':v===2?'Runner-up':v || '—'},
        {key:'result_value',label:details.unit,render:(v,row) => scorer && details.status==='Ongoing' ? <input aria-label={`Result for ${row.name}`} type="number" min="0" step="0.0001" className="nec-input" value={results[row.entry_id]?.resultValue ?? ''} onChange={e => setResults({...results,[row.entry_id]:{...results[row.entry_id],resultValue:e.target.value}})} /> : v ?? '—'},
        {key:'result_status',label:'Result',render:(v,row) => scorer && details.status==='Ongoing' ? <select aria-label={`Status for ${row.name}`} className="nec-input" value={results[row.entry_id]?.resultStatus || 'Finished'} onChange={e => setResults({...results,[row.entry_id]:{...results[row.entry_id],resultStatus:e.target.value}})}>{['Finished','DNS','DNF','DQ'].map(v => <option key={v}>{v}</option>)}</select> : v},
        {key:'entry_id',label:'',render:id => scorer && details.status==='Ongoing' ? <Button loading={busy} title="Save" onClick={() => run(() => apiFetch(`/competitions/${selected}`,'PATCH',{entryId:id,...results[id]}))}>Save</Button> : details.status==='Scheduled' && currentUser.role!=='Score Updater' ? <Button variant="danger" title="Remove" onClick={()=> { if(window.confirm('Remove this entry?')) run(()=>apiFetch(`/competitions/${selected}/entries/${id}`,'DELETE')); }}>Remove</Button> : null}
      ]} />
    </>}
  </section>;
}
