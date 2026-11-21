import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { apiFetch, matchesApi } from '../../services/api/apiServices';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';
import Table from '../../components/common/Table';
import Badge from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import {
  Trophy,
  ArrowLeft,
  Play,
  Check,
  Plus,
  Calendar,
  Clock,
  Activity,
  Medal,
  AlertCircle,
  Users,
  Award,
  Edit2,
  Trash2,
  CalendarDays,
  MapPin,
  CheckCircle2,
  Shield,
  Layers
} from 'lucide-react';
import './CompetitionWorkspace.css';

export default function CompetitionWorkspace({ tournamentId, defaultEventId, onClose }) {
  const { currentUser } = useAuth();
  const manager = ['Admin', 'Sports President'].includes(currentUser.role);
  const scorer = manager || currentUser.role === 'Score Updater';

  const rawEvId = defaultEventId ? Number(String(defaultEventId).replace('ev_', '')) : null;
  const isEventScoped = Boolean(rawEvId);

  // Competitions & General State
  const [competitions, setCompetitions] = useState([]);
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selected, setSelected] = useState(null);
  const [details, setDetails] = useState(null);
  const [creating, setCreating] = useState(false);
  const [editingComp, setEditingComp] = useState(null);
  const [editCategories, setEditCategories] = useState([]);
  const [deletingComp, setDeletingComp] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');
  const [parentRegistrations, setParentRegistrations] = useState({ entries: [], teams: [] });

  // Event-Scoped Fixture State
  const [eventData, setEventData] = useState(null);
  const [matches, setMatches] = useState([]);
  const [eventTeams, setEventTeams] = useState([]);
  const [venues, setVenues] = useState([]);
  const [eventTab, setEventTab] = useState('matches'); // 'matches' | 'competitions'
  const [matchStatusFilter, setMatchStatusFilter] = useState('All');

  // Match Score Modal
  const [scoringMatch, setScoringMatch] = useState(null);
  const [matchScoreForm, setMatchScoreForm] = useState({
    scoreA: 0,
    scoreB: 0,
    detailScore: '',
    winnerTeamId: '',
    isFinal: false
  });

  // Match Delete Modal
  const [deletingMatch, setDeletingMatch] = useState(null);

  // Fixture Creation State
  const [fixtureKind, setFixtureKind] = useState('match'); // 'match' | 'competition'
  const [matchForm, setMatchForm] = useState({
    teamAId: '',
    teamBId: '',
    round: 'League',
    scheduledTime: '',
    venueId: '',
    venueName: ''
  });

  // Competition Creation Form
  const [form, setForm] = useState({
    eventId: rawEvId ? String(rawEvId) : '',
    categoryId: '',
    name: '',
    round: 'Final',
    entrySize: 1,
    scoring: 'Time',
    unit: 'seconds',
    scheduledTime: ''
  });

  const [editForm, setEditForm] = useState({
    id: '',
    name: '',
    round: 'Final',
    entrySize: 1,
    scoring: 'Time',
    unit: 'seconds',
    scheduledTime: '',
    categoryId: ''
  });

  const [entry, setEntry] = useState({ name: '', registers: '' });
  const [results, setResults] = useState({});

  // ── Load All Data ───────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      if (isEventScoped) {
        // Load event-specific fixtures, matches, teams, venues
        const [evRes, matchesRes, teamsRes, entriesRes, venuesRes] = await Promise.all([
          apiFetch(`/events/${rawEvId}`).catch(() => null),
          matchesApi.getMatches({ eventId: rawEvId }).catch(() => []),
          apiFetch(`/events/${rawEvId}/teams`).catch(() => null),
          apiFetch(`/events/${rawEvId}/entries`).catch(() => []),
          apiFetch('/venues').catch(() => [])
        ]);

        if (evRes) {
          setEventData(evRes);
          const pType = evRes.participation_type || evRes.participationType;
          if (pType === 'Individual') {
            setEventTab('competitions');
            setFixtureKind('competition');
          } else {
            setEventTab('matches');
            setFixtureKind('match');
          }
        }

        const mList = Array.isArray(matchesRes) ? matchesRes : (matchesRes?.data || []);
        setMatches(mList);

        const tList = teamsRes?.teams || (Array.isArray(teamsRes) ? teamsRes : []);
        setEventTeams(tList);

        const eList = Array.isArray(entriesRes) ? entriesRes : (entriesRes?.items || []);
        setParentRegistrations({ entries: eList, teams: tList });

        setVenues(Array.isArray(venuesRes) ? venuesRes : []);
      }

      // Load competitions for event or tournament
      const qParams = [];
      if (tournamentId) qParams.push(`tournamentId=${encodeURIComponent(tournamentId)}`);
      if (rawEvId) qParams.push(`eventId=${encodeURIComponent(rawEvId)}`);
      const qs = qParams.length ? `?${qParams.join('&')}` : '';
      const rows = await apiFetch(`/competitions${qs}`);
      setCompetitions(Array.isArray(rows) ? rows : []);

      if (selected) {
        const data = await apiFetch(`/competitions/${selected}`);
        setDetails(data);
        if (data?.entries) {
          setResults(
            Object.fromEntries(
              data.entries.map((e) => [
                e.entry_id,
                {
                  resultValue: e.result_value ?? '',
                  resultStatus: e.result_status === 'Pending' ? 'Finished' : e.result_status
                }
              ])
            )
          );
        }
      }
    } catch (e) {
      setError(e.message || 'Unable to connect to competitions service.');
    }
  }, [selected, tournamentId, rawEvId, isEventScoped]);

  useEffect(() => {
    load();
  }, [load]);

  // Load events list for global competition creation
  useEffect(() => {
    if (manager && !isEventScoped) {
      apiFetch('/events')
        .then((rows) => {
          const list = Array.isArray(rows) ? rows : [];
          const filtered = list.filter((e) => !tournamentId || Number(e.tournament_id || e.tournamentId) === Number(tournamentId));
          setEvents(filtered);
        })
        .catch((e) => setError(e.message));
    }
  }, [manager, tournamentId, isEventScoped]);

  // Load categories when event is selected in competition form
  const selectEvent = async (id) => {
    setForm((prev) => ({ ...prev, eventId: id, categoryId: '' }));
    setCategories([]);
    const event = events.find((e) => String(e.event_id || e.id).replace('ev_', '') === id);
    const sportIdToUse = event ? (event.sport_id || event.sportId) : (eventData?.sport_id || eventData?.sportId);
    if (sportIdToUse) {
      try {
        const cats = await apiFetch(`/sports/${sportIdToUse}/categories`);
        if (Array.isArray(cats) && cats.length > 0) {
          setCategories(cats);
        } else {
          setCategories([{ category_id: 1, name: 'Open' }]);
        }
      } catch (e) {
        setCategories([{ category_id: 1, name: 'Open' }]);
      }
    }
  };

  useEffect(() => {
    if (isEventScoped && eventData?.sport_id) {
      apiFetch(`/sports/${eventData.sport_id}/categories`)
        .then((cats) => {
          if (Array.isArray(cats) && cats.length > 0) {
            setCategories(cats);
            setForm((prev) => ({ ...prev, categoryId: String(cats[0].category_id) }));
          } else {
            setCategories([{ category_id: 1, name: 'Open' }]);
            setForm((prev) => ({ ...prev, categoryId: '1' }));
          }
        })
        .catch(() => {
          setCategories([{ category_id: 1, name: 'Open' }]);
          setForm((prev) => ({ ...prev, categoryId: '1' }));
        });
    }
  }, [isEventScoped, eventData?.sport_id]);

  const run = async (operation) => {
    setError('');
    setBusy(true);
    try {
      await operation();
      await load();
    } catch (e) {
      setError(e.message || 'Operation failed.');
    } finally {
      setBusy(false);
    }
  };

  const field = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const editField = (key, value) => setEditForm((prev) => ({ ...prev, [key]: value }));

  // ── Match Handlers ──────────────────────────────────────────
  const handleCreateMatchSubmit = async (e) => {
    e.preventDefault();
    if (!matchForm.teamAId || !matchForm.teamBId) {
      setError('Please select both Team A and Team B');
      return;
    }
    if (String(matchForm.teamAId) === String(matchForm.teamBId)) {
      setError('Team A and Team B cannot be the same team');
      return;
    }
    await run(async () => {
      const selectedVenue = venues.find((v) => String(v.venue_id || v.id) === String(matchForm.venueId));
      await matchesApi.createMatch({
        event_id: rawEvId,
        tournament_id: eventData?.tournament_id || Number(tournamentId),
        sport_id: eventData?.sport_id,
        team_a_id: Number(matchForm.teamAId),
        team_b_id: Number(matchForm.teamBId),
        round: matchForm.round,
        scheduled_time: matchForm.scheduledTime,
        venue_id: matchForm.venueId ? Number(matchForm.venueId) : undefined,
        venue_name: selectedVenue?.name || matchForm.venueName || undefined
      });
      setCreating(false);
      setMatchForm({
        teamAId: '',
        teamBId: '',
        round: 'League',
        scheduledTime: '',
        venueId: '',
        venueName: ''
      });
    });
  };

  const openScoreModal = (match) => {
    setScoringMatch(match);
    setMatchScoreForm({
      scoreA: match.score_a ?? match.scoreA ?? 0,
      scoreB: match.score_b ?? match.scoreB ?? 0,
      detailScore: match.detail_score || match.detailScore || '',
      winnerTeamId: match.winner_team_id ? String(match.winner_team_id) : '',
      isFinal: match.status === 'Completed'
    });
  };

  const handleSaveMatchScore = async (e) => {
    e.preventDefault();
    if (!scoringMatch) return;
    await run(async () => {
      const mId = scoringMatch.match_id || scoringMatch.id;
      await matchesApi.updateScore(
        mId,
        Number(matchScoreForm.scoreA),
        Number(matchScoreForm.scoreB),
        matchScoreForm.detailScore,
        matchScoreForm.isFinal
      );
      if (matchScoreForm.isFinal) {
        await matchesApi.updateMatchStatus(mId, 'Completed');
      } else if (scoringMatch.status === 'Scheduled') {
        await matchesApi.updateMatchStatus(mId, 'Ongoing');
      }
      setScoringMatch(null);
    });
  };

  const handleToggleMatchStatus = async (match, newStatus) => {
    await run(async () => {
      const mId = match.match_id || match.id;
      await matchesApi.updateMatchStatus(mId, newStatus);
    });
  };

  const handleDeleteMatchConfirm = async () => {
    if (!deletingMatch) return;
    await run(async () => {
      const mId = deletingMatch.match_id || deletingMatch.id;
      await matchesApi.deleteMatch(mId);
      setDeletingMatch(null);
    });
  };

  // ── Competition Handlers ────────────────────────────────────
  const handleCreateCompSubmit = async (e) => {
    e.preventDefault();
    await run(async () => {
      const payload = {
        ...form,
        eventId: isEventScoped ? String(rawEvId) : form.eventId
      };
      await apiFetch('/competitions', 'POST', payload);
      setCreating(false);
      setForm({
        eventId: isEventScoped ? String(rawEvId) : '',
        categoryId: categories[0]?.category_id ? String(categories[0].category_id) : '',
        name: '',
        round: 'Final',
        entrySize: 1,
        scoring: 'Time',
        unit: 'seconds',
        scheduledTime: ''
      });
    });
  };

  const openEditModal = async (comp) => {
    let formattedTime = '';
    if (comp.scheduled_time) {
      try {
        const d = new Date(comp.scheduled_time);
        formattedTime = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      } catch {
        formattedTime = '';
      }
    }
    setEditForm({
      id: comp.competition_id,
      name: comp.name || '',
      round: comp.round || 'Final',
      entrySize: comp.entry_size || 1,
      scoring: comp.scoring || 'Time',
      unit: comp.unit || 'seconds',
      scheduledTime: formattedTime,
      categoryId: String(comp.category_id || '')
    });
    setEditingComp(comp);

    const sId = comp.sport_id || eventData?.sport_id;
    if (sId) {
      try {
        const cats = await apiFetch(`/sports/${sId}/categories`);
        setEditCategories(Array.isArray(cats) && cats.length > 0 ? cats : [{ category_id: 1, name: 'Open' }]);
      } catch {
        setEditCategories([{ category_id: 1, name: 'Open' }]);
      }
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    await run(async () => {
      await apiFetch(`/competitions/${editForm.id}`, 'PATCH', {
        name: editForm.name,
        round: editForm.round,
        entrySize: Number(editForm.entrySize),
        scoring: editForm.scoring,
        unit: editForm.unit,
        scheduledTime: editForm.scheduledTime,
        categoryId: editForm.categoryId ? Number(editForm.categoryId) : undefined
      });
      setEditingComp(null);
    });
  };

  const handleDeleteCompConfirm = async () => {
    if (!deletingComp) return;
    await run(async () => {
      await apiFetch(`/competitions/${deletingComp.competition_id}`, 'DELETE');
      if (selected === deletingComp.competition_id) {
        setSelected(null);
        setDetails(null);
      }
      setDeletingComp(null);
    });
  };

  // ── Stats Calculations ──────────────────────────────────────
  const compCounts = useMemo(() => {
    const list = Array.isArray(competitions) ? competitions : [];
    return {
      all: list.length,
      scheduled: list.filter((c) => c.status === 'Scheduled').length,
      ongoing: list.filter((c) => c.status === 'Ongoing').length,
      completed: list.filter((c) => c.status === 'Completed').length
    };
  }, [competitions]);

  const matchCounts = useMemo(() => {
    const list = Array.isArray(matches) ? matches : [];
    return {
      all: list.length,
      scheduled: list.filter((m) => m.status === 'Scheduled').length,
      ongoing: list.filter((m) => m.status === 'Ongoing').length,
      completed: list.filter((m) => m.status === 'Completed').length
    };
  }, [matches]);

  const filteredCompetitions = useMemo(() => {
    if (statusFilter === 'All') return competitions;
    return competitions.filter((c) => c.status === statusFilter);
  }, [competitions, statusFilter]);

  const filteredMatches = useMemo(() => {
    if (matchStatusFilter === 'All') return matches;
    return matches.filter((m) => m.status === matchStatusFilter);
  }, [matches, matchStatusFilter]);

  const formatDateTime = (val) => {
    if (!val) return '-';
    try {
      const d = new Date(val);
      return d.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return String(val);
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'Ongoing' || status === 'Live') return <Badge status="warning">Live / Ongoing</Badge>;
    if (status === 'Completed') return <Badge status="success">Completed</Badge>;
    if (status === 'Cancelled') return <Badge status="danger">Cancelled</Badge>;
    return <Badge status="info">Scheduled</Badge>;
  };

  // ── Matches Table Columns ───────────────────────────────────
  const matchTableColumns = [
    {
      key: 'round',
      label: 'Fixture / Round',
      sortable: true,
      render: (v, row) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <strong style={{ fontSize: '0.94rem', color: 'var(--nec-text-primary)' }}>{v || 'Round'}</strong>
          <span style={{ fontSize: '0.78rem', color: 'var(--nec-text-muted)' }}>
            {row.pool ? `Pool: ${row.pool}` : 'Match Fixture'}
          </span>
        </div>
      )
    },
    {
      key: 'matchup',
      label: 'Teams & Score',
      sortable: false,
      render: (_, row) => {
        const teamAName = row.teamA || row.team_a_name || 'Team A';
        const teamBName = row.teamB || row.team_b_name || 'Team B';
        const deptA = row.deptA || row.dept_a_code;
        const deptB = row.deptB || row.dept_b_code;
        const scoreA = row.scoreA ?? row.score_a;
        const scoreB = row.scoreB ?? row.score_b;
        const hasScore = scoreA !== null && scoreA !== undefined && scoreB !== null && scoreB !== undefined;
        const isCompleted = row.status === 'Completed';

        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '100px' }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: isCompleted && scoreA > scoreB ? '#16a34a' : 'inherit' }}>
                {teamAName}
              </span>
              {deptA && <span style={{ fontSize: '0.72rem', color: 'var(--nec-text-muted)' }}>Dept: {deptA}</span>}
            </div>

            <div style={{ padding: '4px 10px', background: 'var(--nec-border-light, #f1f5f9)', borderRadius: '6px', fontWeight: 800, fontSize: '0.95rem' }}>
              {hasScore ? `${scoreA} - ${scoreB}` : 'VS'}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: '100px' }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: isCompleted && scoreB > scoreA ? '#16a34a' : 'inherit' }}>
                {teamBName}
              </span>
              {deptB && <span style={{ fontSize: '0.72rem', color: 'var(--nec-text-muted)' }}>Dept: {deptB}</span>}
            </div>
          </div>
        );
      }
    },
    {
      key: 'scheduled_time',
      label: 'Schedule & Venue',
      sortable: true,
      render: (v, row) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.84rem' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={13} style={{ opacity: 0.6 }} /> {formatDateTime(v || row.date)}
          </span>
          {(row.venue || row.venue_name) && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--nec-text-muted)' }}>
              <MapPin size={12} style={{ opacity: 0.6 }} /> {row.venue || row.venue_name}
            </span>
          )}
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (v) => getStatusBadge(v)
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (_, row) => {
        const mId = row.match_id || row.id;
        return (
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
            {scorer && (
              <Button
                size="sm"
                variant="primary"
                title="Enter or update match score"
                onClick={() => openScoreModal(row)}
              >
                Score / Result
              </Button>
            )}
            {manager && row.status === 'Scheduled' && (
              <Button
                size="sm"
                variant="secondary"
                icon={Play}
                title="Start Match"
                onClick={() => handleToggleMatchStatus(row, 'Ongoing')}
              >
                Start
              </Button>
            )}
            {manager && row.status === 'Ongoing' && (
              <Button
                size="sm"
                variant="success"
                icon={Check}
                title="Complete Match"
                onClick={() => handleToggleMatchStatus(row, 'Completed')}
              >
                Complete
              </Button>
            )}
            {manager && (
              <Button
                size="sm"
                variant="danger"
                icon={Trash2}
                title="Delete Fixture"
                onClick={() => setDeletingMatch(row)}
              >
                Delete
              </Button>
            )}
          </div>
        );
      }
    }
  ];

  // ── Competitions Table Columns ──────────────────────────────
  const compTableColumns = [
    {
      key: 'name',
      label: 'Competition',
      sortable: true,
      render: (v, row) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <strong style={{ fontSize: '0.94rem', color: 'var(--nec-text-primary)' }}>{v}</strong>
          <span style={{ fontSize: '0.78rem', color: 'var(--nec-text-muted)' }}>
            {row.round || 'Round'} · {row.scoring} ({row.unit})
          </span>
        </div>
      )
    },
    ...(!isEventScoped ? [
      {
        key: 'sport_name',
        label: 'Sport & Event',
        sortable: true,
        render: (v, row) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span>{v || 'Athletics'}</span>
            {row.event_name && (
              <span style={{ fontSize: '0.78rem', color: 'var(--nec-text-muted)' }}>
                {row.event_name}
              </span>
            )}
          </div>
        )
      }
    ] : []),
    {
      key: 'category_name',
      label: 'Category',
      sortable: true,
      render: (v) => <span className="nec-comp-pill">{v || 'Open'}</span>
    },
    {
      key: 'scheduled_time',
      label: 'Scheduled Time',
      sortable: true,
      render: (v) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem' }}>
          <Calendar size={13} style={{ opacity: 0.6 }} /> {formatDateTime(v)}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (v) => getStatusBadge(v)
    },
    {
      key: 'competition_id',
      label: 'Actions',
      sortable: false,
      render: (id, row) => (
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'flex-end' }}>
          <Button
            size="sm"
            variant="outline"
            title="View participants & record scores"
            onClick={() => {
              setDetails(null);
              setSelected(id);
            }}
          >
            Manage Heat
          </Button>
          {manager && row.status === 'Scheduled' && (
            <Button
              size="sm"
              variant="secondary"
              icon={Edit2}
              title="Edit"
              onClick={() => openEditModal(row)}
            >
              Edit
            </Button>
          )}
          {manager && row.status === 'Scheduled' && (
            <Button
              size="sm"
              variant="danger"
              icon={Trash2}
              title="Delete"
              onClick={() => setDeletingComp(row)}
            >
              Delete
            </Button>
          )}
        </div>
      )
    }
  ];

  const partType = eventData?.participation_type || eventData?.participationType;
  const isBoth = partType === 'Both';
  const showMatchView = isEventScoped ? (isBoth ? eventTab === 'matches' : partType !== 'Individual') : false;
  const showCompView = isEventScoped ? (isBoth ? eventTab === 'competitions' : partType === 'Individual') : true;

  return (
    <section className="nec-comp-workspace">
      {/* ── Top Header ────────────────────────────────────────── */}
      <div className="nec-comp-header">
        <div className="nec-comp-header-title-wrap">
          {onClose && !selected && (
            <Button
              variant="ghost"
              icon={ArrowLeft}
              title="Close Workspace"
              ariaLabel="Close Workspace"
              onClick={onClose}
            >
              Back
            </Button>
          )}
          {selected && (
            <Button
              variant="ghost"
              icon={ArrowLeft}
              title="Back"
              ariaLabel="Back"
              onClick={() => {
                setSelected(null);
                setDetails(null);
              }}
            >
              Back to Fixtures
            </Button>
          )}
          <div className="nec-comp-icon-badge">
            {isEventScoped ? <CalendarDays size={24} /> : <Trophy size={24} />}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 className="nec-comp-title">
                {selected
                  ? details?.name || 'Heat Details'
                  : isEventScoped
                  ? `${eventData?.name || 'Event'} · Fixtures & Results`
                  : 'Event Competitions'}
              </h2>
              {isEventScoped && partType && (
                <Badge status={partType === 'Both' ? 'warning' : 'primary'}>
                  {partType === 'Both' ? 'Both (Ind & Team)' : partType}
                </Badge>
              )}
            </div>
            <p className="nec-comp-subtitle">
              {isEventScoped
                ? `${eventData?.sport_name || 'Sport'} · ${eventData?.tournament_name || 'Tournament'} · Manage team match fixtures, individual heats, and score results`
                : 'Track multi-event athletic competitions, heats, timed trials, and ranked results'}
            </p>
          </div>
        </div>

        <div className="nec-comp-header-actions">
          {onClose && (
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          )}
          {manager && !selected && (
            <Button
              variant="primary"
              icon={Plus}
              title={isEventScoped ? 'Create Fixture' : 'Create Competition'}
              onClick={() => {
                setError('');
                if (isEventScoped) {
                  setFixtureKind(partType === 'Individual' ? 'competition' : 'match');
                }
                setCreating(true);
              }}
            >
              {isEventScoped ? 'Create Fixture' : 'Create'}
            </Button>
          )}
        </div>
      </div>

      {/* ── Error Notification Banner ─────────────────────────── */}
      {error && (
        <div className="nec-comp-alert" role="alert">
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Sub-tabs for Both Mode ─────────────────────────────── */}
      {isEventScoped && (isBoth || (matches.length > 0 && competitions.length > 0)) && !selected && (
        <div style={{ display: 'flex', gap: '10px', borderBottom: '2px solid var(--nec-border, #e2e8f0)', paddingBottom: '8px' }}>
          <button
            type="button"
            className={`nec-comp-tab-btn ${eventTab === 'matches' ? 'active' : ''}`}
            onClick={() => setEventTab('matches')}
            style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}
          >
            <Calendar size={16} /> Team Matches ({matches.length})
          </button>
          <button
            type="button"
            className={`nec-comp-tab-btn ${eventTab === 'competitions' ? 'active' : ''}`}
            onClick={() => setEventTab('competitions')}
            style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}
          >
            <Trophy size={16} /> Heats & Contests ({competitions.length})
          </button>
        </div>
      )}

      {/* ── Main View (No Single Competition Selected) ─────────── */}
      {!selected && (
        <>
          {/* VIEW A: Team Matches Fixtures */}
          {showMatchView && (
            <>
              {/* Match KPI Metrics */}
              <div className="nec-comp-stats-grid">
                <div className="nec-comp-stat-card">
                  <div className="nec-comp-stat-icon total">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <div className="nec-comp-stat-val">{matchCounts.all}</div>
                    <div className="nec-comp-stat-lbl">Total Fixtures</div>
                  </div>
                </div>
                <div className="nec-comp-stat-card">
                  <div className="nec-comp-stat-icon scheduled">
                    <Clock size={20} />
                  </div>
                  <div>
                    <div className="nec-comp-stat-val">{matchCounts.scheduled}</div>
                    <div className="nec-comp-stat-lbl">Scheduled</div>
                  </div>
                </div>
                <div className="nec-comp-stat-card">
                  <div className="nec-comp-stat-icon ongoing">
                    <Activity size={20} />
                  </div>
                  <div>
                    <div className="nec-comp-stat-val">{matchCounts.ongoing}</div>
                    <div className="nec-comp-stat-lbl">Live / Ongoing</div>
                  </div>
                </div>
                <div className="nec-comp-stat-card">
                  <div className="nec-comp-stat-icon completed">
                    <Check size={20} />
                  </div>
                  <div>
                    <div className="nec-comp-stat-val">{matchCounts.completed}</div>
                    <div className="nec-comp-stat-lbl">Completed</div>
                  </div>
                </div>
              </div>

              {/* Match Filtering Toolbar */}
              <div className="nec-comp-toolbar">
                <div className="nec-comp-filter-tabs">
                  <button
                    type="button"
                    className={`nec-comp-tab-btn ${matchStatusFilter === 'All' ? 'active' : ''}`}
                    onClick={() => setMatchStatusFilter('All')}
                  >
                    All <span className="nec-comp-tab-count">{matchCounts.all}</span>
                  </button>
                  <button
                    type="button"
                    className={`nec-comp-tab-btn ${matchStatusFilter === 'Scheduled' ? 'active' : ''}`}
                    onClick={() => setMatchStatusFilter('Scheduled')}
                  >
                    Scheduled <span className="nec-comp-tab-count">{matchCounts.scheduled}</span>
                  </button>
                  <button
                    type="button"
                    className={`nec-comp-tab-btn ${matchStatusFilter === 'Ongoing' ? 'active' : ''}`}
                    onClick={() => setMatchStatusFilter('Ongoing')}
                  >
                    Ongoing <span className="nec-comp-tab-count">{matchCounts.ongoing}</span>
                  </button>
                  <button
                    type="button"
                    className={`nec-comp-tab-btn ${matchStatusFilter === 'Completed' ? 'active' : ''}`}
                    onClick={() => setMatchStatusFilter('Completed')}
                  >
                    Completed <span className="nec-comp-tab-count">{matchCounts.completed}</span>
                  </button>
                </div>
              </div>

              {/* Matches Table or Empty State */}
              {filteredMatches.length === 0 ? (
                <div className="nec-comp-empty-state">
                  <div className="nec-comp-empty-icon">
                    <CalendarDays size={28} />
                  </div>
                  <h3 className="nec-comp-empty-title">No Match Fixtures Found</h3>
                  <p className="nec-comp-empty-desc">
                    {matchStatusFilter === 'All'
                      ? 'There are currently no team fixtures scheduled for this event. Click "+ Create Fixture" to schedule a match between registered teams.'
                      : `No fixtures with status "${matchStatusFilter}".`}
                  </p>
                  {manager && matchStatusFilter === 'All' && (
                    <Button
                      variant="primary"
                      icon={Plus}
                      onClick={() => {
                        setFixtureKind('match');
                        setCreating(true);
                      }}
                    >
                      Create First Fixture
                    </Button>
                  )}
                </div>
              ) : (
                <div style={{ background: 'var(--nec-surface)', borderRadius: 14, border: '1px solid var(--nec-border)', padding: 14 }}>
                  <Table
                    data={filteredMatches}
                    columns={matchTableColumns}
                    pageSize={10}
                    searchPlaceholder="Search fixtures, teams, or rounds..."
                  />
                </div>
              )}
            </>
          )}

          {/* VIEW B: Athletic Heats / Competitions */}
          {showCompView && (
            <>
              {/* Competition KPI Metrics */}
              <div className="nec-comp-stats-grid">
                <div className="nec-comp-stat-card">
                  <div className="nec-comp-stat-icon total">
                    <Trophy size={20} />
                  </div>
                  <div>
                    <div className="nec-comp-stat-val">{compCounts.all}</div>
                    <div className="nec-comp-stat-lbl">Total Heats / Contests</div>
                  </div>
                </div>
                <div className="nec-comp-stat-card">
                  <div className="nec-comp-stat-icon scheduled">
                    <Clock size={20} />
                  </div>
                  <div>
                    <div className="nec-comp-stat-val">{compCounts.scheduled}</div>
                    <div className="nec-comp-stat-lbl">Scheduled</div>
                  </div>
                </div>
                <div className="nec-comp-stat-card">
                  <div className="nec-comp-stat-icon ongoing">
                    <Activity size={20} />
                  </div>
                  <div>
                    <div className="nec-comp-stat-val">{compCounts.ongoing}</div>
                    <div className="nec-comp-stat-lbl">Ongoing</div>
                  </div>
                </div>
                <div className="nec-comp-stat-card">
                  <div className="nec-comp-stat-icon completed">
                    <Check size={20} />
                  </div>
                  <div>
                    <div className="nec-comp-stat-val">{compCounts.completed}</div>
                    <div className="nec-comp-stat-lbl">Completed</div>
                  </div>
                </div>
              </div>

              {/* Competition Filtering Toolbar */}
              <div className="nec-comp-toolbar">
                <div className="nec-comp-filter-tabs">
                  <button
                    type="button"
                    className={`nec-comp-tab-btn ${statusFilter === 'All' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('All')}
                  >
                    All <span className="nec-comp-tab-count">{compCounts.all}</span>
                  </button>
                  <button
                    type="button"
                    className={`nec-comp-tab-btn ${statusFilter === 'Scheduled' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('Scheduled')}
                  >
                    Scheduled <span className="nec-comp-tab-count">{compCounts.scheduled}</span>
                  </button>
                  <button
                    type="button"
                    className={`nec-comp-tab-btn ${statusFilter === 'Ongoing' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('Ongoing')}
                  >
                    Ongoing <span className="nec-comp-tab-count">{compCounts.ongoing}</span>
                  </button>
                  <button
                    type="button"
                    className={`nec-comp-tab-btn ${statusFilter === 'Completed' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('Completed')}
                  >
                    Completed <span className="nec-comp-tab-count">{compCounts.completed}</span>
                  </button>
                </div>
              </div>

              {/* Table or Empty State */}
              {filteredCompetitions.length === 0 ? (
                <div className="nec-comp-empty-state">
                  <div className="nec-comp-empty-icon">
                    <Trophy size={28} />
                  </div>
                  <h3 className="nec-comp-empty-title">No Competitions / Heats Found</h3>
                  <p className="nec-comp-empty-desc">
                    {statusFilter === 'All'
                      ? 'There are currently no scheduled heats or competitions. Click "+ Create Fixture" to schedule a new track, field, or athletics event round.'
                      : `No competitions with status "${statusFilter}".`}
                  </p>
                  {manager && statusFilter === 'All' && (
                    <Button
                      variant="primary"
                      icon={Plus}
                      onClick={() => {
                        setFixtureKind('competition');
                        setCreating(true);
                      }}
                    >
                      Schedule Heat / Contest
                    </Button>
                  )}
                </div>
              ) : (
                <div style={{ background: 'var(--nec-surface)', borderRadius: 14, border: '1px solid var(--nec-border)', padding: 14 }}>
                  <Table
                    data={filteredCompetitions}
                    columns={compTableColumns}
                    pageSize={10}
                    searchPlaceholder="Search competitions, categories, or events..."
                  />
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── Single Competition Detail View ────────────────────── */}
      {details && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Detail Hero Card */}
          <div className="nec-comp-detail-hero">
            <div className="nec-comp-detail-top">
              <div className="nec-comp-detail-title-group">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>{details.name}</h3>
                  {getStatusBadge(details.status)}
                </div>
                <div className="nec-comp-detail-meta">
                  <span className="nec-comp-pill">{details.sport_name || 'Athletics'}</span>
                  <span className="nec-comp-pill">{details.category_name || 'Category'}</span>
                  <span className="nec-comp-pill">{details.round}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {manager && details.status === 'Scheduled' && (
                  <>
                    <Button
                      variant="secondary"
                      icon={Edit2}
                      onClick={() => openEditModal(details)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      icon={Trash2}
                      onClick={() => setDeletingComp(details)}
                    >
                      Delete
                    </Button>
                    <Button
                      variant="primary"
                      icon={Play}
                      loading={busy}
                      onClick={() =>
                        run(() =>
                          apiFetch(`/competitions/${selected}`, 'PATCH', {
                            status: 'Ongoing'
                          })
                        )
                      }
                    >
                      Start Competition
                    </Button>
                  </>
                )}

                {manager && details.status === 'Ongoing' && (
                  <Button
                    variant="success"
                    icon={Check}
                    loading={busy}
                    onClick={() =>
                      run(() =>
                        apiFetch(`/competitions/${selected}`, 'PATCH', {
                          status: 'Completed'
                        })
                      )
                    }
                  >
                    Finalize & Complete
                  </Button>
                )}
              </div>
            </div>

            {/* Metrics Row */}
            <div className="nec-comp-detail-metrics-grid">
              <div className="nec-comp-metric-item">
                <span className="nec-comp-metric-label">Scoring Metric</span>
                <span className="nec-comp-metric-val">
                  {details.scoring} ({details.unit})
                </span>
              </div>
              <div className="nec-comp-metric-item">
                <span className="nec-comp-metric-label">Entry Squad Size</span>
                <span className="nec-comp-metric-val">
                  {details.entry_size === 1 ? '1 Athlete (Individual)' : `${details.entry_size} Athletes (Relay)`}
                </span>
              </div>
              <div className="nec-comp-metric-item">
                <span className="nec-comp-metric-label">Scheduled Time</span>
                <span className="nec-comp-metric-val">{formatDateTime(details.scheduled_time)}</span>
              </div>
              <div className="nec-comp-metric-item">
                <span className="nec-comp-metric-label">Registered Entries</span>
                <span className="nec-comp-metric-val">{details.entries?.length || 0}</span>
              </div>
            </div>
          </div>

          {/* Entry Registration Form (if Scheduled) */}
          {details.status === 'Scheduled' && currentUser.role !== 'Score Updater' && (
            <div className="nec-comp-registration-card">
              <div className="nec-comp-reg-header">
                <Users size={18} style={{ color: 'var(--nec-primary)' }} />
                <h4 className="nec-comp-reg-title">Register Participant / Squad</h4>
              </div>

              {/* Quick Assign from Parent Event Registrations */}
              {parentRegistrations.entries?.length > 0 && (
                <div style={{ marginBottom: "14px", padding: "10px 14px", background: "var(--nec-accent-light, #f0f7ff)", borderRadius: "8px", border: "1px solid var(--nec-border, #e2e8f0)" }}>
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--nec-accent, #0274be)", marginBottom: "6px" }}>
                    Select from Event Registrations ({parentRegistrations.entries.length} registered):
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {parentRegistrations.entries.map((reg) => {
                      const isAlreadyAdded = details.entries?.some(
                        (de) => de.name === reg.student_name || de.athletes?.includes(reg.register_number)
                      );
                      return (
                        <button
                          key={reg.entry_id || reg.register_number}
                          type="button"
                          disabled={isAlreadyAdded}
                          onClick={() => {
                            setEntry({
                              name: reg.student_name || reg.register_number,
                              registers: reg.register_number
                            });
                          }}
                          style={{
                            padding: "4px 8px",
                            fontSize: "0.75rem",
                            borderRadius: "6px",
                            border: isAlreadyAdded ? "1px solid #d1d5db" : "1px solid #93c5fd",
                            background: isAlreadyAdded ? "#f3f4f6" : "#fff",
                            color: isAlreadyAdded ? "#9ca3af" : "#1e40af",
                            cursor: isAlreadyAdded ? "not-allowed" : "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                        >
                          <span>{reg.student_name} ({reg.register_number})</span>
                          {isAlreadyAdded && <Check size={12} color="#10b981" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <form
                className="nec-comp-reg-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  run(async () => {
                    await apiFetch(`/competitions/${selected}/entries`, 'POST', {
                      name: entry.name || (details.entry_size === 1 ? entry.registers.trim() : 'Squad Entry'),
                      registerNumbers: entry.registers.split(',').map((s) => s.trim())
                    });
                    setEntry({ name: '', registers: '' });
                  });
                }}
              >
                {details.entry_size > 1 && (
                  <div className="nec-comp-reg-field">
                    <label htmlFor="reg-entry-name" style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                      Entry / Squad Name <span className="required-star">*</span>
                    </label>
                    <input
                      id="reg-entry-name"
                      className="nec-comp-input"
                      required
                      placeholder="e.g. CSE Relay A"
                      value={entry.name}
                      onChange={(e) => setEntry({ ...entry, name: e.target.value })}
                    />
                  </div>
                )}

                <div className="nec-comp-reg-field">
                  <label htmlFor="reg-numbers" style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                    Register Numbers ({details.entry_size}) <span className="required-star">*</span>
                  </label>
                  <input
                    id="reg-numbers"
                    className="nec-comp-input"
                    required
                    placeholder={details.entry_size > 1 ? 'e.g. 2114001, 2114002, 2114003, 2114004' : 'e.g. 2114012'}
                    value={entry.registers}
                    onChange={(e) => setEntry({ ...entry, registers: e.target.value })}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--nec-text-muted)' }}>
                    Separate multiple roll numbers with commas
                  </span>
                </div>

                <Button type="submit" variant="primary" icon={Plus} loading={busy}>
                  Add Entry
                </Button>
              </form>
            </div>
          )}

          {/* Results / Entries Table */}
          <div style={{ background: 'var(--nec-surface)', borderRadius: 14, border: '1px solid var(--nec-border)', padding: 16 }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 700 }}>
              {details.status === 'Completed' ? 'Final Standings & Results' : 'Participants & Leaderboard'}
            </h4>

            <Table
              data={details.entries || []}
              searchable={false}
              pageSize={15}
              emptyTitle="No Participants Registered"
              emptyMessage="Use the form above to add eligible student athletes to this competition."
              columns={[
                {
                  key: 'rank',
                  label: 'Place',
                  render: (v) => {
                    if (v === 1) {
                      return (
                        <span className="nec-comp-place-badge winner">
                          <Medal size={14} /> Winner
                        </span>
                      );
                    }
                    if (v === 2) {
                      return (
                        <span className="nec-comp-place-badge runner-up">
                          <Award size={14} /> Runner-up
                        </span>
                      );
                    }
                    if (v === 3) {
                      return (
                        <span className="nec-comp-place-badge runner-up">
                          3rd Place
                        </span>
                      );
                    }
                    return v ? `#${v}` : '-';
                  }
                },
                {
                  key: 'name',
                  label: 'Entry / Squad',
                  render: (v, row) => (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <strong>{v}</strong>
                      {row.department_code && (
                        <span style={{ fontSize: '0.76rem', color: 'var(--nec-text-muted)' }}>
                          Dept: {row.department_code}
                        </span>
                      )}
                    </div>
                  )
                },
                {
                  key: 'athletes',
                  label: 'Athletes',
                  render: (v) => (
                    <span style={{ fontSize: '0.85rem' }}>{v || '-'}</span>
                  )
                },
                {
                  key: 'result_value',
                  label: `Result (${details.unit})`,
                  render: (v, row) =>
                    scorer && details.status === 'Ongoing' ? (
                      <input
                        aria-label={`Result for ${row.name}`}
                        type="number"
                        min="0"
                        step="0.0001"
                        className="nec-comp-input"
                        style={{ maxWidth: 120, height: 36 }}
                        value={results[row.entry_id]?.resultValue ?? ''}
                        onChange={(e) =>
                          setResults({
                            ...results,
                            [row.entry_id]: {
                              ...results[row.entry_id],
                              resultValue: e.target.value
                            }
                          })
                        }
                      />
                    ) : (
                      <strong>{v ? `${v} ${details.unit}` : '-'}</strong>
                    )
                },
                {
                  key: 'result_status',
                  label: 'Result Status',
                  render: (v, row) =>
                    scorer && details.status === 'Ongoing' ? (
                      <select
                        aria-label={`Status for ${row.name}`}
                        className="nec-comp-select"
                        style={{ maxWidth: 130, height: 36 }}
                        value={results[row.entry_id]?.resultStatus || 'Finished'}
                        onChange={(e) =>
                          setResults({
                            ...results,
                            [row.entry_id]: {
                              ...results[row.entry_id],
                              resultStatus: e.target.value
                            }
                          })
                        }
                      >
                        {['Finished', 'DNS', 'DNF', 'DQ'].map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Badge
                        status={
                          v === 'Finished'
                            ? 'success'
                            : v === 'Pending'
                            ? 'neutral'
                            : 'danger'
                        }
                      >
                        {v || 'Pending'}
                      </Badge>
                    )
                },
                {
                  key: 'entry_id',
                  label: 'Actions',
                  render: (id) =>
                    scorer && details.status === 'Ongoing' ? (
                      <Button
                        size="sm"
                        variant="primary"
                        loading={busy}
                        title="Save"
                        onClick={() =>
                          run(() =>
                            apiFetch(`/competitions/${selected}`, 'PATCH', {
                              entryId: id,
                              ...results[id]
                            })
                          )
                        }
                      >
                        Save
                      </Button>
                    ) : details.status === 'Scheduled' && currentUser.role !== 'Score Updater' ? (
                      <Button
                        size="sm"
                        variant="danger"
                        title="Remove"
                        onClick={() => {
                          if (window.confirm('Remove this entry?')) {
                            run(() => apiFetch(`/competitions/${selected}/entries/${id}`, 'DELETE'));
                          }
                        }}
                      >
                        Remove
                      </Button>
                    ) : null
                }
              ]}
            />
          </div>
        </div>
      )}

      {/* ── CREATE FIXTURE / COMPETITION MODAL ────────────────── */}
      <Modal
        isOpen={creating && !selected}
        onClose={() => setCreating(false)}
        title={isEventScoped ? `Schedule Fixture · ${eventData?.name || 'Event'}` : 'Schedule Event Competition'}
        maxWidth="720px"
      >
        {/* Toggle between Team Match and Heat if event is Both */}
        {isEventScoped && isBoth && (
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', padding: '6px', background: 'var(--nec-border-light, #f1f5f9)', borderRadius: '8px' }}>
            <button
              type="button"
              className={`nec-comp-tab-btn ${fixtureKind === 'match' ? 'active' : ''}`}
              onClick={() => setFixtureKind('match')}
              style={{ flex: 1, padding: '8px', fontWeight: 700 }}
            >
              Team Match (Head-to-Head)
            </button>
            <button
              type="button"
              className={`nec-comp-tab-btn ${fixtureKind === 'competition' ? 'active' : ''}`}
              onClick={() => setFixtureKind('competition')}
              style={{ flex: 1, padding: '8px', fontWeight: 700 }}
            >
              Individual Heat / Contest
            </button>
          </div>
        )}

        {/* Form A: Team Match Scheduling */}
        {isEventScoped && fixtureKind === 'match' ? (
          <form onSubmit={handleCreateMatchSubmit}>
            <div className="nec-comp-form-grid">
              {/* Team A */}
              <div className="nec-comp-field">
                <label htmlFor="match-team-a">
                  Team A <span className="required-star">*</span>
                </label>
                <select
                  id="match-team-a"
                  className="nec-comp-select"
                  required
                  value={matchForm.teamAId}
                  onChange={(e) => setMatchForm({ ...matchForm, teamAId: e.target.value })}
                >
                  <option value="">Select Team A</option>
                  {eventTeams.map((t) => (
                    <option key={t.team_id || t.id} value={t.team_id || t.id}>
                      {t.name} {t.department_code ? `(${t.department_code})` : ''}
                    </option>
                  ))}
                </select>
                {eventTeams.length === 0 && (
                  <span className="field-hint" style={{ color: '#ef4444' }}>
                    No teams registered in this event yet.
                  </span>
                )}
              </div>

              {/* Team B */}
              <div className="nec-comp-field">
                <label htmlFor="match-team-b">
                  Team B <span className="required-star">*</span>
                </label>
                <select
                  id="match-team-b"
                  className="nec-comp-select"
                  required
                  value={matchForm.teamBId}
                  onChange={(e) => setMatchForm({ ...matchForm, teamBId: e.target.value })}
                >
                  <option value="">Select Team B</option>
                  {eventTeams
                    .filter((t) => String(t.team_id || t.id) !== String(matchForm.teamAId))
                    .map((t) => (
                      <option key={t.team_id || t.id} value={t.team_id || t.id}>
                        {t.name} {t.department_code ? `(${t.department_code})` : ''}
                      </option>
                    ))}
                </select>
              </div>

              {/* Round */}
              <div className="nec-comp-field">
                <label htmlFor="match-round">
                  Round / Stage <span className="required-star">*</span>
                </label>
                <select
                  id="match-round"
                  className="nec-comp-select"
                  value={matchForm.round}
                  onChange={(e) => setMatchForm({ ...matchForm, round: e.target.value })}
                >
                  {['League', 'Group Stage', 'Round of 16', 'Quarter-Final', 'Semi-Final', 'Final', '3rd Place Playoff'].map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* Venue */}
              <div className="nec-comp-field">
                <label htmlFor="match-venue">
                  Venue / Ground
                </label>
                <select
                  id="match-venue"
                  className="nec-comp-select"
                  value={matchForm.venueId}
                  onChange={(e) => setMatchForm({ ...matchForm, venueId: e.target.value })}
                >
                  <option value="">Select Venue (optional)</option>
                  {venues.map((v) => (
                    <option key={v.venue_id || v.id} value={v.venue_id || v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Scheduled Time */}
              <div className="nec-comp-field full-span">
                <label htmlFor="match-scheduled">
                  Date and Time <span className="required-star">*</span>
                </label>
                <input
                  id="match-scheduled"
                  type="datetime-local"
                  className="nec-comp-input"
                  required
                  value={matchForm.scheduledTime}
                  onChange={(e) => setMatchForm({ ...matchForm, scheduledTime: e.target.value })}
                />
              </div>
            </div>

            <div className="nec-comp-modal-actions">
              <Button type="button" variant="ghost" onClick={() => setCreating(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={busy} disabled={eventTeams.length < 2}>
                Save Fixture
              </Button>
            </div>
          </form>
        ) : (
          /* Form B: Athletic Heat / Competition Scheduling */
          <form onSubmit={handleCreateCompSubmit}>
            <div className="nec-comp-form-grid">
              {/* Event Dropdown (only if not event-scoped) */}
              {!isEventScoped && (
                <div className="nec-comp-field">
                  <label htmlFor="comp-event">
                    Event <span className="required-star">*</span>
                  </label>
                  <select
                    id="comp-event"
                    className="nec-comp-select"
                    required
                    value={form.eventId}
                    onChange={(e) => selectEvent(e.target.value)}
                  >
                    <option value="">Select event</option>
                    {events.map((e) => (
                      <option key={e.event_id || e.id} value={String(e.event_id || e.id).replace('ev_', '')}>
                        {e.name || e.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Category Dropdown */}
              <div className="nec-comp-field">
                <label htmlFor="comp-category">
                  Category <span className="required-star">*</span>
                </label>
                <select
                  id="comp-category"
                  className="nec-comp-select"
                  required
                  value={form.categoryId}
                  onChange={(e) => field('categoryId', e.target.value)}
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c.category_id} value={c.category_id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Competition Name */}
              <div className="nec-comp-field full-span">
                <label htmlFor="comp-name">
                  Name <span className="required-star">*</span>
                </label>
                <input
                  id="comp-name"
                  className="nec-comp-input"
                  required
                  maxLength={120}
                  placeholder="e.g. 100m Dash Heat 1 or 4x100m Relay Heats"
                  value={form.name}
                  onChange={(e) => field('name', e.target.value)}
                />
              </div>

              {/* Round */}
              <div className="nec-comp-field">
                <label htmlFor="comp-round">
                  Round <span className="required-star">*</span>
                </label>
                <select
                  id="comp-round"
                  className="nec-comp-select"
                  value={form.round}
                  onChange={(e) => field('round', e.target.value)}
                >
                  {['Heat', 'Qualifier', 'Semi-Final', 'Final'].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              {/* Athletes per entry */}
              <div className="nec-comp-field">
                <label htmlFor="comp-entry-size">
                  Athletes per entry <span className="required-star">*</span>
                </label>
                <input
                  id="comp-entry-size"
                  className="nec-comp-input"
                  type="number"
                  required
                  min="1"
                  max="30"
                  value={form.entrySize}
                  onChange={(e) => field('entrySize', Number(e.target.value))}
                />
                <span className="field-hint">Individual: 1 · Relay: squad size</span>
              </div>

              {/* Result / Scoring Type */}
              <div className="nec-comp-field">
                <label htmlFor="comp-scoring">
                  Result type <span className="required-star">*</span>
                </label>
                <select
                  id="comp-scoring"
                  className="nec-comp-select"
                  value={form.scoring}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      scoring: e.target.value,
                      unit:
                        e.target.value === 'Time'
                          ? 'seconds'
                          : e.target.value === 'Distance'
                          ? 'metres'
                          : 'points'
                    }))
                  }
                >
                  {['Time', 'Distance', 'Points'].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              {/* Unit */}
              <div className="nec-comp-field">
                <label htmlFor="comp-unit">
                  Unit <span className="required-star">*</span>
                </label>
                <input
                  id="comp-unit"
                  className="nec-comp-input"
                  required
                  maxLength={20}
                  placeholder="seconds, metres, points"
                  value={form.unit}
                  onChange={(e) => field('unit', e.target.value)}
                />
              </div>

              {/* Scheduled Date/Time */}
              <div className="nec-comp-field full-span">
                <label htmlFor="comp-scheduled">
                  Scheduled <span className="required-star">*</span>
                </label>
                <input
                  id="comp-scheduled"
                  className="nec-comp-input"
                  type="datetime-local"
                  required
                  value={form.scheduledTime}
                  onChange={(e) => field('scheduledTime', e.target.value)}
                />
              </div>
            </div>

            <div className="nec-comp-modal-actions">
              <Button type="button" variant="ghost" onClick={() => setCreating(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={busy}>
                Save Heat
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── MATCH SCORE ENTRY MODAL ───────────────────────────── */}
      <Modal
        isOpen={Boolean(scoringMatch)}
        onClose={() => setScoringMatch(null)}
        title="Enter Match Score & Result"
        size="sm"
      >
        {scoringMatch && (
          <form onSubmit={handleSaveMatchScore}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ textAlign: 'center', padding: '10px 0', borderBottom: '1px solid var(--nec-border, #e2e8f0)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--nec-text-muted)' }}>
                  {scoringMatch.round} · {scoringMatch.pool || 'Fixture'}
                </span>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '14px', marginTop: '6px' }}>
                  <span style={{ fontWeight: 800, fontSize: '1.05rem' }}>
                    {scoringMatch.teamA || scoringMatch.team_a_name}
                  </span>
                  <span style={{ opacity: 0.5, fontWeight: 700 }}>VS</span>
                  <span style={{ fontWeight: 800, fontSize: '1.05rem' }}>
                    {scoringMatch.teamB || scoringMatch.team_b_name}
                  </span>
                </div>
              </div>

              {/* Scores Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="nec-comp-field">
                  <label htmlFor="score-a">
                    {scoringMatch.teamA || 'Team A'} Score <span className="required-star">*</span>
                  </label>
                  <input
                    id="score-a"
                    type="number"
                    min="0"
                    max="9999"
                    className="nec-comp-input"
                    required
                    value={matchScoreForm.scoreA}
                    onChange={(e) => setMatchScoreForm({ ...matchScoreForm, scoreA: e.target.value })}
                  />
                </div>
                <div className="nec-comp-field">
                  <label htmlFor="score-b">
                    {scoringMatch.teamB || 'Team B'} Score <span className="required-star">*</span>
                  </label>
                  <input
                    id="score-b"
                    type="number"
                    min="0"
                    max="9999"
                    className="nec-comp-input"
                    required
                    value={matchScoreForm.scoreB}
                    onChange={(e) => setMatchScoreForm({ ...matchScoreForm, scoreB: e.target.value })}
                  />
                </div>
              </div>

              {/* Detail Score / Remarks */}
              <div className="nec-comp-field">
                <label htmlFor="score-details">Detail Score / Remarks</label>
                <input
                  id="score-details"
                  type="text"
                  className="nec-comp-input"
                  placeholder="e.g. Penalty Shootout 4-3, Half Time 1-0"
                  value={matchScoreForm.detailScore}
                  onChange={(e) => setMatchScoreForm({ ...matchScoreForm, detailScore: e.target.value })}
                />
              </div>

              {/* Finalize Checkbox */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', cursor: 'pointer', padding: '8px', background: 'var(--nec-accent-light, #f0f7ff)', borderRadius: '6px' }}>
                <input
                  type="checkbox"
                  checked={matchScoreForm.isFinal}
                  onChange={(e) => setMatchScoreForm({ ...matchScoreForm, isFinal: e.target.checked })}
                />
                <span style={{ fontWeight: 600 }}>Mark match as Completed (final result)</span>
              </label>

              <div className="nec-comp-modal-actions">
                <Button type="button" variant="ghost" onClick={() => setScoringMatch(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" loading={busy}>
                  Save Score
                </Button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* ── MATCH DELETE MODAL ────────────────────────────────── */}
      <Modal
        isOpen={Boolean(deletingMatch)}
        onClose={() => setDeletingMatch(null)}
        title="Delete Fixture"
        size="sm"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ margin: 0, fontSize: '0.94rem', color: 'var(--nec-text-primary)' }}>
            Are you sure you want to delete fixture{' '}
            <strong>
              {deletingMatch?.teamA || deletingMatch?.team_a_name} vs {deletingMatch?.teamB || deletingMatch?.team_b_name}
            </strong>?
          </p>
          <span style={{ fontSize: '0.82rem', color: 'var(--nec-text-muted)' }}>
            This fixture will be permanently removed from this event and tournament schedule.
          </span>
          <div className="nec-comp-modal-actions">
            <Button type="button" variant="ghost" onClick={() => setDeletingMatch(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              icon={Trash2}
              loading={busy}
              onClick={handleDeleteMatchConfirm}
            >
              Delete Fixture
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── EDIT COMPETITION MODAL ────────────────────────────── */}
      <Modal
        isOpen={Boolean(editingComp)}
        onClose={() => setEditingComp(null)}
        title="Edit Competition"
        maxWidth="720px"
      >
        <form onSubmit={handleEditSubmit}>
          <div className="nec-comp-form-grid">
            {editCategories.length > 0 && (
              <div className="nec-comp-field full-span">
                <label htmlFor="edit-comp-category">Category</label>
                <select
                  id="edit-comp-category"
                  className="nec-comp-select"
                  value={editForm.categoryId}
                  onChange={(e) => editField('categoryId', e.target.value)}
                >
                  {editCategories.map((c) => (
                    <option key={c.category_id} value={c.category_id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="nec-comp-field full-span">
              <label htmlFor="edit-comp-name">
                Name <span className="required-star">*</span>
              </label>
              <input
                id="edit-comp-name"
                className="nec-comp-input"
                required
                maxLength={120}
                value={editForm.name}
                onChange={(e) => editField('name', e.target.value)}
              />
            </div>

            <div className="nec-comp-field">
              <label htmlFor="edit-comp-round">Round</label>
              <select
                id="edit-comp-round"
                className="nec-comp-select"
                value={editForm.round}
                onChange={(e) => editField('round', e.target.value)}
              >
                {['Heat', 'Qualifier', 'Semi-Final', 'Final'].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div className="nec-comp-field">
              <label htmlFor="edit-comp-entry-size">Athletes per entry</label>
              <input
                id="edit-comp-entry-size"
                className="nec-comp-input"
                type="number"
                required
                min="1"
                max="30"
                value={editForm.entrySize}
                onChange={(e) => editField('entrySize', Number(e.target.value))}
              />
            </div>

            <div className="nec-comp-field">
              <label htmlFor="edit-comp-scoring">Scoring Type</label>
              <select
                id="edit-comp-scoring"
                className="nec-comp-select"
                value={editForm.scoring}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    scoring: e.target.value,
                    unit:
                      e.target.value === 'Time'
                        ? 'seconds'
                        : e.target.value === 'Distance'
                        ? 'metres'
                        : 'points'
                  }))
                }
              >
                {['Time', 'Distance', 'Points'].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div className="nec-comp-field">
              <label htmlFor="edit-comp-unit">Unit</label>
              <input
                id="edit-comp-unit"
                className="nec-comp-input"
                required
                maxLength={20}
                value={editForm.unit}
                onChange={(e) => editField('unit', e.target.value)}
              />
            </div>

            <div className="nec-comp-field full-span">
              <label htmlFor="edit-comp-scheduled">Scheduled Date and Time</label>
              <input
                id="edit-comp-scheduled"
                className="nec-comp-input"
                type="datetime-local"
                required
                value={editForm.scheduledTime}
                onChange={(e) => editField('scheduledTime', e.target.value)}
              />
            </div>
          </div>

          <div className="nec-comp-modal-actions">
            <Button type="button" variant="ghost" onClick={() => setEditingComp(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={busy}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── DELETE COMPETITION MODAL ──────────────────────────── */}
      <Modal
        isOpen={Boolean(deletingComp)}
        onClose={() => setDeletingComp(null)}
        title="Confirm Deletion"
        size="sm"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ margin: 0, fontSize: '0.94rem', color: 'var(--nec-text-primary)' }}>
            Are you sure you want to delete <strong>{deletingComp?.name}</strong>?
          </p>
          <span style={{ fontSize: '0.82rem', color: 'var(--nec-text-muted)' }}>
            This action will permanently remove the competition and any registered participant entries.
          </span>
          <div className="nec-comp-modal-actions">
            <Button type="button" variant="ghost" onClick={() => setDeletingComp(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              icon={Trash2}
              loading={busy}
              onClick={handleDeleteCompConfirm}
            >
              Delete Competition
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
