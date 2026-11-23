import React, { useMemo, useState, useEffect } from 'react';
import { MapPin, Trophy, ArrowRight, CheckCircle2, Award } from 'lucide-react';
import './TournamentBracket.css';

// Helper for human-readable datetime
function formatMatchDateTime(val) {
  if (!val) return { dateStr: 'TBD', timeStr: '' };
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return { dateStr: String(val), timeStr: '' };
    const dateStr = d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short'
    });
    const timeStr = d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    return { dateStr, timeStr };
  } catch {
    return { dateStr: String(val), timeStr: '' };
  }
}

// Sport icon helper
function getSportEmoji(sportName) {
  const s = (sportName || '').toLowerCase();
  if (s.includes('cricket')) return '🏏';
  if (s.includes('volley')) return '🏐';
  if (s.includes('foot') || s.includes('soccer')) return '⚽';
  if (s.includes('basket')) return '🏀';
  if (s.includes('badminton') || s.includes('tennis')) return '🏸';
  if (s.includes('kabaddi')) return '🤼';
  if (s.includes('chess')) return '♟️';
  if (s.includes('table')) return '🏓';
  return '🏆';
}

export default function TournamentBracket({
  matches = [],
  selectedSportProp = null,
  onMatchClick,
  emptyMessage = 'No bracket fixtures scheduled for this selection.'
}) {
  // Extract all available sports with matches
  const availableSports = useMemo(() => {
    const map = new Map();
    matches.forEach(m => {
      const sp = m.sport_name || m.sport;
      if (sp) {
        map.set(sp, (map.get(sp) || 0) + 1);
      }
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [matches]);

  const [activeSport, setActiveSport] = useState(
    selectedSportProp && selectedSportProp !== 'ALL'
      ? selectedSportProp
      : availableSports[0]?.name || 'ALL'
  );

  useEffect(() => {
    if (selectedSportProp && selectedSportProp !== 'ALL') {
      setActiveSport(selectedSportProp);
    } else if (availableSports.length > 0 && (!activeSport || activeSport === 'ALL' || !availableSports.some(s => s.name === activeSport))) {
      setActiveSport(availableSports[0].name);
    }
  }, [selectedSportProp, availableSports, activeSport]);

  // Filter matches to the single active sport so sports are never mixed
  const sportMatches = useMemo(() => {
    if (!matches || matches.length === 0) return [];
    if (!activeSport || activeSport === 'ALL') return matches;
    return matches.filter(m => (m.sport_name || m.sport || '').toLowerCase() === activeSport.toLowerCase());
  }, [matches, activeSport]);

  // Group matches into clean sports bracket hierarchy
  const rounds = useMemo(() => {
    if (!sportMatches || sportMatches.length === 0) return [];

    const getRoundClassification = (m) => {
      const r = (m.round || '').toLowerCase();
      const isFinal = r.includes('final') && !r.includes('semi');

      if (isFinal) {
        return { rank: 10, title: m.round || 'Championship Final' };
      }
      if (m.bracket_round) {
        const rNum = Number(m.bracket_round);
        return {
          rank: rNum,
          title: m.round || (rNum === 1 ? 'Round 1' : `Round ${rNum}`)
        };
      }
      if (r.includes('qualifier 1')) {
        return { rank: 1, title: 'Qualifier 1' };
      }
      if (r.includes('qualifier 2') || r.includes('eliminator')) {
        return { rank: 2, title: 'Qualifier 2 (Eliminator)' };
      }
      if (r.includes('16') || r.includes('preliminary')) {
        return { rank: 1, title: 'Round of 16' };
      }
      if (r.includes('quarter')) {
        return { rank: 2, title: 'Quarter-Finals' };
      }
      if (r.includes('semi')) {
        return { rank: 3, title: 'Semi-Finals' };
      }
      if (r.includes('3rd') || r.includes('third') || r.includes('playoff')) {
        return { rank: 4, title: '3rd Place Playoff' };
      }
      return { rank: 1, title: m.round || 'Preliminary Round' };
    };

    const roundMap = new Map();
    sportMatches.forEach(m => {
      const { rank, title } = getRoundClassification(m);
      if (!roundMap.has(rank)) {
        roundMap.set(rank, { rank, title, matches: [] });
      }
      roundMap.get(rank).matches.push(m);
    });

    const sortedRounds = Array.from(roundMap.values()).sort((a, b) => a.rank - b.rank);
    sortedRounds.forEach(r => {
      r.matches.sort((a, b) => {
        if (a.match_number && b.match_number) return a.match_number - b.match_number;
        return new Date(a.scheduled_time || a.date || 0) - new Date(b.scheduled_time || b.date || 0);
      });
    });

    return sortedRounds;
  }, [sportMatches]);

  if (!matches || matches.length === 0) {
    return (
      <div className="nec-bracket-container" style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
        <Trophy size={36} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
        <p style={{ margin: 0, fontWeight: 600 }}>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="nec-bracket-wrapper">
      {/* ── Sport Filter Tabs ─────────────────────────────────── */}
      {availableSports.length > 1 && (
        <div className="nec-bracket-sport-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--nec-navy, #0b2c5d)' }}>
              Select Sport Bracket:
            </span>
            <div className="nec-bracket-sport-tabs">
              {availableSports.map(sp => (
                <button
                  key={sp.name}
                  type="button"
                  className={`nec-bracket-sport-btn ${activeSport === sp.name ? 'is-active' : ''}`}
                  onClick={() => setActiveSport(sp.name)}
                >
                  <span>{getSportEmoji(sp.name)}</span>
                  <span>{sp.name}</span>
                  <span className="nec-bracket-sport-badge">{sp.count}</span>
                </button>
              ))}
            </div>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Showing <strong>{activeSport}</strong> Knockout Progression
          </span>
        </div>
      )}

      {/* ── Knockout Bracket Columns Tree ─────────────────────── */}
      <div className="nec-bracket-container">
        {rounds.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 20px', color: '#64748b' }}>
            <p style={{ margin: 0, fontWeight: 600 }}>No bracket fixtures for {activeSport}.</p>
          </div>
        ) : (
          <div className="nec-bracket-tree">
            {rounds.map((roundGroup, roundIdx) => (
              <div key={roundGroup.rank || roundIdx} className="nec-bracket-round-col">
                <div className="nec-bracket-round-header">
                  <h4 className="nec-bracket-round-title">
                    {roundGroup.title.includes('Final') ? <Trophy size={14} color="#d97706" /> : <Award size={14} color="#0274be" />}
                    {roundGroup.title}
                  </h4>
                  <span className="nec-bracket-round-badge">
                    {roundGroup.matches.length} {roundGroup.matches.length === 1 ? 'Match' : 'Matches'}
                  </span>
                </div>

                <div className="nec-bracket-matches-list">
                  {roundGroup.matches.map(m => {
                    const isCompleted = m.status === 'Completed';
                    const isLive = m.status === 'Ongoing' || m.status === 'Live';
                    const { dateStr, timeStr } = formatMatchDateTime(m.scheduled_time || m.date);

                    // Team A flags
                    const isWinnerA = isCompleted && m.winner_team_id && Number(m.winner_team_id) === Number(m.team_a_id);
                    const isLoserA = isCompleted && m.winner_team_id && Number(m.winner_team_id) !== Number(m.team_a_id);
                    const isPlaceholderA = !m.team_a_id;
                    const isByeA = (m.teamA || '').includes('(Bye)') || (m.placeholder_a || '').includes('(Bye)');

                    // Team B flags
                    const isWinnerB = isCompleted && m.winner_team_id && Number(m.winner_team_id) === Number(m.team_b_id);
                    const isLoserB = isCompleted && m.winner_team_id && Number(m.winner_team_id) !== Number(m.team_b_id);
                    const isPlaceholderB = !m.team_b_id;
                    const isByeB = (m.teamB || '').includes('(Bye)') || (m.placeholder_b || '').includes('(Bye)');

                    const teamAName = m.teamA || m.team_a_name || m.placeholder_a || 'TBD (Winner of previous)';
                    const teamBName = m.teamB || m.team_b_name || m.placeholder_b || 'TBD (Winner of previous)';

                    const isChampionship = (m.round || '').toLowerCase().includes('final') && !(m.round || '').toLowerCase().includes('semi');
                    const isQualifier1 = (m.round || '').toLowerCase().includes('qualifier 1') || Boolean(m.loser_next_match_id && m.next_match_id);
                    const isEliminator = (m.round || '').toLowerCase().includes('qualifier 2') || (m.round || '').toLowerCase().includes('eliminator');

                    return (
                      <div
                        key={m.id || m.match_id}
                        className={`nec-bracket-card ${isLive ? 'is-live' : ''} ${isCompleted ? 'is-completed' : ''}`}
                        onClick={() => onMatchClick && onMatchClick(m)}
                        style={{ cursor: onMatchClick ? 'pointer' : 'default' }}
                      >
                        {/* Meta info */}
                        <div className="nec-bracket-meta-row">
                          <span className="nec-bracket-match-num">
                            {m.match_number ? `Match #${m.match_number}` : (m.round || 'Fixture')}
                          </span>
                          <span className="nec-bracket-venue-info" title={m.venue || m.venue_name || 'TBD'}>
                            <MapPin size={11} /> {m.venue || m.venue_name || 'TBD'}
                          </span>
                          <span>
                            {dateStr} {timeStr ? `• ${timeStr}` : ''}
                          </span>
                        </div>

                        {/* Team A */}
                        <div className={`nec-bracket-team-row ${isWinnerA ? 'is-winner' : ''} ${isLoserA ? 'is-loser' : ''} ${isPlaceholderA ? 'is-placeholder' : ''}`}>
                          <div className="nec-bracket-team-info">
                            {isWinnerA && <CheckCircle2 size={14} color="#15803d" />}
                            <span className="nec-bracket-team-name" title={teamAName}>
                              {teamAName}
                            </span>
                            {m.deptA && <span className="nec-bracket-dept-pill">{m.deptA}</span>}
                            {isByeA && <span className="nec-bracket-bye-pill">BYE</span>}
                            {isWinnerA && isChampionship && <span className="nec-bracket-gold-pill">🥇 Champion</span>}
                            {isLoserA && isChampionship && <span className="nec-bracket-silver-pill">🥈 Runner-Up</span>}
                            {isLoserA && isEliminator && <span className="nec-bracket-bronze-pill">🥉 3rd Place</span>}
                            {isWinnerA && !isChampionship && <span className="nec-bracket-winner-tag">WINNER</span>}
                          </div>
                          {(isCompleted || isLive || (m.scoreA !== null && m.scoreA !== undefined)) && (
                            <span className="nec-bracket-score-badge">
                              {m.scoreA ?? m.score_a ?? 0}
                            </span>
                          )}
                        </div>

                        {/* Team B */}
                        <div className={`nec-bracket-team-row ${isWinnerB ? 'is-winner' : ''} ${isLoserB ? 'is-loser' : ''} ${isPlaceholderB ? 'is-placeholder' : ''}`}>
                          <div className="nec-bracket-team-info">
                            {isWinnerB && <CheckCircle2 size={14} color="#15803d" />}
                            <span className="nec-bracket-team-name" title={teamBName}>
                              {teamBName}
                            </span>
                            {m.deptB && <span className="nec-bracket-dept-pill">{m.deptB}</span>}
                            {isByeB && <span className="nec-bracket-bye-pill">BYE</span>}
                            {isWinnerB && isChampionship && <span className="nec-bracket-gold-pill">🥇 Champion</span>}
                            {isLoserB && isChampionship && <span className="nec-bracket-silver-pill">🥈 Runner-Up</span>}
                            {isLoserB && isEliminator && <span className="nec-bracket-bronze-pill">🥉 3rd Place</span>}
                            {isWinnerB && !isChampionship && <span className="nec-bracket-winner-tag">WINNER</span>}
                          </div>
                          {(isCompleted || isLive || (m.scoreB !== null && m.scoreB !== undefined)) && (
                            <span className="nec-bracket-score-badge">
                              {m.scoreB ?? m.score_b ?? 0}
                            </span>
                          )}
                        </div>

                        {/* Footer / Bracket Advancement */}
                        <div className="nec-bracket-footer">
                          <span style={{
                            color: isCompleted ? '#15803d' : isLive ? '#16a34a' : '#64748b',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            {isCompleted ? '✓ Completed' : isLive ? '🔴 Live in Play' : '📅 Scheduled'}
                          </span>
                          {isChampionship ? (
                            <span className="nec-bracket-trophy-badge" title="Championship Final: Decides 1st & 2nd Place">
                              <Trophy size={12} color="#d97706" /> Champion Decider
                            </span>
                          ) : isQualifier1 ? (
                            <span className="nec-bracket-advance-badge" title="Winner to Final, Loser to Match 2">
                              <ArrowRight size={12} /> Winner &rarr; Final &bull; Loser &rarr; M2
                            </span>
                          ) : isEliminator ? (
                            <span className="nec-bracket-advance-badge" title="Winner to Final, Loser takes 3rd Place">
                              <ArrowRight size={12} /> Winner &rarr; Final &bull; Loser &rarr; 3rd
                            </span>
                          ) : m.next_match_id ? (
                            <span className="nec-bracket-advance-badge" title="Winner advances to next round">
                              <ArrowRight size={12} /> Next Round
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
