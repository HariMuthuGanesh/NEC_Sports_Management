import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { apiFetch } from '../../services/api/apiServices';
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
  Trash2
} from 'lucide-react';
import './CompetitionWorkspace.css';

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
  const [editingComp, setEditingComp] = useState(null);
  const [editCategories, setEditCategories] = useState([]);
  const [deletingComp, setDeletingComp] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');

  const [form, setForm] = useState({
    eventId: '',
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

  const load = useCallback(async () => {
    try {
      const rows = await apiFetch(`/competitions${tournamentId ? `?tournamentId=${tournamentId}` : ''}`);
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
  }, [selected, tournamentId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (manager) {
      apiFetch('/events')
        .then((rows) => {
          const list = Array.isArray(rows) ? rows : [];
          setEvents(list.filter((e) => !tournamentId || Number(e.tournament_id || e.tournamentId) === Number(tournamentId)));
        })
        .catch((e) => setError(e.message));
    }
  }, [manager, tournamentId]);

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

  const selectEvent = async (id) => {
    setForm((prev) => ({ ...prev, eventId: id, categoryId: '' }));
    setCategories([]);
    const event = events.find((e) => String(e.event_id || e.id).replace('ev_', '') === id);
    if (event) {
      try {
        const cats = await apiFetch(`/sports/${event.sport_id || event.sportId}/categories`);
        if (Array.isArray(cats) && cats.length > 0) {
          setCategories(cats);
        } else {
          setCategories([{ category_id: 1, name: 'Open' }]);
        }
      } catch (e) {
        setError(e.message);
      }
    }
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

    if (comp.sport_id) {
      try {
        const cats = await apiFetch(`/sports/${comp.sport_id}/categories`);
        setEditCategories(Array.isArray(cats) && cats.length > 0 ? cats : [{ category_id: 1, name: 'Open' }]);
      } catch {
        setEditCategories([{ category_id: 1, name: 'Open' }]);
      }
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    await run(async () => {
      await apiFetch('/competitions', 'POST', form);
      setCreating(false);
      setForm({
        eventId: '',
        categoryId: '',
        name: '',
        round: 'Final',
        entrySize: 1,
        scoring: 'Time',
        unit: 'seconds',
        scheduledTime: ''
      });
    });
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

  const openDeleteConfirm = (comp) => {
    setDeletingComp(comp);
  };

  const handleDeleteConfirm = async () => {
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

  // KPI Calculations
  const counts = useMemo(() => {
    const list = Array.isArray(competitions) ? competitions : [];
    return {
      all: list.length,
      scheduled: list.filter((c) => c.status === 'Scheduled').length,
      ongoing: list.filter((c) => c.status === 'Ongoing').length,
      completed: list.filter((c) => c.status === 'Completed').length
    };
  }, [competitions]);

  // Filtered List
  const filteredCompetitions = useMemo(() => {
    if (statusFilter === 'All') return competitions;
    return competitions.filter((c) => c.status === statusFilter);
  }, [competitions, statusFilter]);

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
    if (status === 'Ongoing') return <Badge status="warning">Ongoing</Badge>;
    if (status === 'Completed') return <Badge status="success">Completed</Badge>;
    return <Badge status="info">Scheduled</Badge>;
  };

  const tableColumns = [
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
    },
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
            title="View"
            onClick={() => {
              setDetails(null);
              setSelected(id);
            }}
          >
            View
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
              onClick={() => openDeleteConfirm(row)}
            >
              Delete
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <section className="nec-comp-workspace">
      {/* ── Top Header ────────────────────────────────────────── */}
      <div className="nec-comp-header">
        <div className="nec-comp-header-title-wrap">
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
            />
          )}
          <div className="nec-comp-icon-badge">
            <Trophy size={24} />
          </div>
          <div>
            <h2 className="nec-comp-title">
              {details?.name || 'Event Competitions'}
            </h2>
            <p className="nec-comp-subtitle">
              Track multi-event athletic competitions, heats, timed trials, and ranked results
            </p>
          </div>
        </div>

        <div className="nec-comp-header-actions">
          {manager && !selected && (
            <Button
              variant="primary"
              icon={Plus}
              title="Create"
              onClick={() => {
                setError('');
                setCreating(true);
              }}
            >
              Create
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

      {/* ── Main View (No Competition Selected) ───────────────── */}
      {!selected && (
        <>
          {/* KPI Metrics */}
          <div className="nec-comp-stats-grid">
            <div className="nec-comp-stat-card">
              <div className="nec-comp-stat-icon total">
                <Trophy size={20} />
              </div>
              <div>
                <div className="nec-comp-stat-val">{counts.all}</div>
                <div className="nec-comp-stat-lbl">Total Competitions</div>
              </div>
            </div>
            <div className="nec-comp-stat-card">
              <div className="nec-comp-stat-icon scheduled">
                <Clock size={20} />
              </div>
              <div>
                <div className="nec-comp-stat-val">{counts.scheduled}</div>
                <div className="nec-comp-stat-lbl">Scheduled</div>
              </div>
            </div>
            <div className="nec-comp-stat-card">
              <div className="nec-comp-stat-icon ongoing">
                <Activity size={20} />
              </div>
              <div>
                <div className="nec-comp-stat-val">{counts.ongoing}</div>
                <div className="nec-comp-stat-lbl">Ongoing</div>
              </div>
            </div>
            <div className="nec-comp-stat-card">
              <div className="nec-comp-stat-icon completed">
                <Check size={20} />
              </div>
              <div>
                <div className="nec-comp-stat-val">{counts.completed}</div>
                <div className="nec-comp-stat-lbl">Completed</div>
              </div>
            </div>
          </div>

          {/* Filtering Toolbar */}
          <div className="nec-comp-toolbar">
            <div className="nec-comp-filter-tabs">
              <button
                type="button"
                className={`nec-comp-tab-btn ${statusFilter === 'All' ? 'active' : ''}`}
                onClick={() => setStatusFilter('All')}
              >
                All <span className="nec-comp-tab-count">{counts.all}</span>
              </button>
              <button
                type="button"
                className={`nec-comp-tab-btn ${statusFilter === 'Scheduled' ? 'active' : ''}`}
                onClick={() => setStatusFilter('Scheduled')}
              >
                Scheduled <span className="nec-comp-tab-count">{counts.scheduled}</span>
              </button>
              <button
                type="button"
                className={`nec-comp-tab-btn ${statusFilter === 'Ongoing' ? 'active' : ''}`}
                onClick={() => setStatusFilter('Ongoing')}
              >
                Ongoing <span className="nec-comp-tab-count">{counts.ongoing}</span>
              </button>
              <button
                type="button"
                className={`nec-comp-tab-btn ${statusFilter === 'Completed' ? 'active' : ''}`}
                onClick={() => setStatusFilter('Completed')}
              >
                Completed <span className="nec-comp-tab-count">{counts.completed}</span>
              </button>
            </div>
          </div>

          {/* Table or Empty State */}
          {filteredCompetitions.length === 0 ? (
            <div className="nec-comp-empty-state">
              <div className="nec-comp-empty-icon">
                <Trophy size={28} />
              </div>
              <h3 className="nec-comp-empty-title">No Competitions Found</h3>
              <p className="nec-comp-empty-desc">
                {statusFilter === 'All'
                  ? 'There are currently no scheduled competitions. Click Create to schedule a new track, field, or athletics event.'
                  : `There are currently no competitions with status "${statusFilter}".`}
              </p>
              {manager && statusFilter === 'All' && (
                <Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>
                  Schedule Competition
                </Button>
              )}
            </div>
          ) : (
            <div style={{ background: 'var(--nec-surface)', borderRadius: 14, border: '1px solid var(--nec-border)', padding: 14 }}>
              <Table
                data={filteredCompetitions}
                columns={tableColumns}
                pageSize={10}
                searchPlaceholder="Search competitions, categories, or events..."
              />
            </div>
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
                      onClick={() => openDeleteConfirm(details)}
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

      {/* ── Creation Modal ────────────────────────────────────── */}
      <Modal
        isOpen={creating && !selected}
        onClose={() => setCreating(false)}
        title="Schedule Event Competition"
        maxWidth="720px"
      >
        <form onSubmit={handleCreateSubmit}>
          <div className="nec-comp-form-grid">
            {/* Event Dropdown */}
            <div className="nec-comp-field">
              <label htmlFor="comp-event">
                Event <span className="required-star">*</span>
              </label>
              <select
                id="comp-event"
                name="Event"
                aria-label="Event"
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

            {/* Category Dropdown */}
            <div className="nec-comp-field">
              <label htmlFor="comp-category">
                Category <span className="required-star">*</span>
              </label>
              <select
                id="comp-category"
                name="Category"
                aria-label="Category"
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
                name="Name"
                aria-label="Name"
                className="nec-comp-input"
                required
                maxLength={120}
                placeholder="e.g. 100m Dash Final or 4x100m Relay Heats"
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
                name="Round"
                aria-label="Round"
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
                name="Athletes per entry"
                aria-label="Athletes per entry"
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
                name="Result type"
                aria-label="Result type"
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
                name="Unit"
                aria-label="Unit"
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
                name="Scheduled"
                aria-label="Scheduled"
                className="nec-comp-input"
                type="datetime-local"
                required
                value={form.scheduledTime}
                onChange={(e) => field('scheduledTime', e.target.value)}
              />
            </div>
          </div>

          <div className="nec-comp-modal-actions">
            <Button
              type="button"
              variant="ghost"
              title="Cancel"
              onClick={() => setCreating(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              title="Save"
              loading={busy}
            >
              Save
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Edit Competition Modal ────────────────────────────── */}
      <Modal
        isOpen={Boolean(editingComp)}
        onClose={() => setEditingComp(null)}
        title="Edit Competition"
        maxWidth="720px"
      >
        <form onSubmit={handleEditSubmit}>
          <div className="nec-comp-form-grid">
            {/* Category Dropdown */}
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

            {/* Competition Name */}
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

            {/* Round */}
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

            {/* Athletes per entry */}
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

            {/* Scoring Type */}
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

            {/* Unit */}
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

            {/* Scheduled Date/Time */}
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
            <Button
              type="button"
              variant="ghost"
              title="Cancel"
              onClick={() => setEditingComp(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              title="Save Changes"
              loading={busy}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Delete Confirmation Modal ─────────────────────────── */}
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
            <Button
              type="button"
              variant="ghost"
              title="Cancel"
              onClick={() => setDeletingComp(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              icon={Trash2}
              title="Delete Competition"
              loading={busy}
              onClick={handleDeleteConfirm}
            >
              Delete Competition
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
