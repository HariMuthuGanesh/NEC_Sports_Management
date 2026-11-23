import React, { useMemo } from 'react';
import { Calendar, Clock, MapPin, Trophy, ArrowRight, CheckCircle2 } from 'lucide-react';
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

export default function TournamentBracket({
  matches = [],
  onMatchClick,
  emptyMessage = 'No bracket fixtures scheduled for this selection.'
}) {
  // Group matches into ordered rounds
  const rounds = useMemo(() => {
    if (!matches || matches.length === 0) return [];

    const roundRank = (m) => {
      if (m.bracket_round) return Number(m.bracket_round);
      const r = (m.round || '').toLowerCase();
      if (r.includes('16') || r.includes('round of 16')) return 1;
      if (r.includes('quarter')) return 2;
      if (r.includes('semi')) return 3;
      if (r.includes('final') && !r.includes('semi') && !r.includes('quarter')) return 4;
      return 1;
    };

    const roundMap = new Map();
    matches.forEach(m => {
      const rank = roundRank(m);
      if (!roundMap.has(rank)) {
        roundMap.set(rank, {
          rank,
          title: m.round || (rank === 4 ? 'Final' : rank === 3 ? 'Semi-Final' : rank === 2 ? 'Quarter-Final' : 'Round 1'),
          matches: []
        });
      }
      roundMap.get(rank).matches.push(m);
    });

    const sortedRounds = Array.from(roundMap.values()).sort((a, b) => a.rank - b.rank);
    // Sort matches within round by match_number or scheduled_time
    sortedRounds.forEach(r => {
      r.matches.sort((a, b) => {
        if (a.match_number && b.match_number) return a.match_number - b.match_number;
        return new Date(a.scheduled_time || a.date || 0) - new Date(b.scheduled_time || b.date || 0);
      });
    });

    return sortedRounds;
  }, [matches]);

  if (!matches || matches.length === 0) {
    return (
      <div className="nec-bracket-container" style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
        <Trophy size={36} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
        <p style={{ margin: 0, fontWeight: 600 }}>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="nec-bracket-container">
      <div className="nec-bracket-tree">
        {rounds.map((roundGroup, roundIdx) => (
          <div key={roundGroup.rank || roundIdx} className="nec-bracket-round-col">
            <div className="nec-bracket-round-header">
              <h4 className="nec-bracket-round-title">{roundGroup.title}</h4>
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
                        {isWinnerA && <CheckCircle2 size={13} color="#16a34a" />}
                        <span className="nec-bracket-team-name" title={teamAName}>
                          {teamAName}
                        </span>
                        {m.deptA && <span className="nec-bracket-dept-pill">{m.deptA}</span>}
                        {isByeA && <span className="nec-bracket-bye-pill">BYE</span>}
                      </div>
                      {(isCompleted || isLive || m.scoreA !== null && m.scoreA !== undefined) && (
                        <span className="nec-bracket-score-badge">
                          {m.scoreA ?? m.score_a ?? 0}
                        </span>
                      )}
                    </div>

                    {/* Team B */}
                    <div className={`nec-bracket-team-row ${isWinnerB ? 'is-winner' : ''} ${isLoserB ? 'is-loser' : ''} ${isPlaceholderB ? 'is-placeholder' : ''}`}>
                      <div className="nec-bracket-team-info">
                        {isWinnerB && <CheckCircle2 size={13} color="#16a34a" />}
                        <span className="nec-bracket-team-name" title={teamBName}>
                          {teamBName}
                        </span>
                        {m.deptB && <span className="nec-bracket-dept-pill">{m.deptB}</span>}
                        {isByeB && <span className="nec-bracket-bye-pill">BYE</span>}
                      </div>
                      {(isCompleted || isLive || m.scoreB !== null && m.scoreB !== undefined) && (
                        <span className="nec-bracket-score-badge">
                          {m.scoreB ?? m.score_b ?? 0}
                        </span>
                      )}
                    </div>

                    {/* Footer / Bracket Advancement */}
                    <div className="nec-bracket-footer">
                      <span style={{
                        color: isCompleted ? '#059669' : isLive ? '#16a34a' : '#64748b',
                        fontWeight: 600
                      }}>
                        {isCompleted ? '✓ Completed' : isLive ? '● Live' : 'Scheduled'}
                      </span>
                      {m.next_match_id && (
                        <span className="nec-bracket-advance-badge" title="Winner automatically advances to this match">
                          <ArrowRight size={11} /> Next: Final
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
