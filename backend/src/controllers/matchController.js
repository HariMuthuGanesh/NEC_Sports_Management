import { createMatch as createMatchSql, deleteMatch as deleteMatchSql, updateMatchScore, getAllMatches } from '../models/sql/matchSqlModel.js';
import pool from '../config/db.js';

/**
 * POST /api/matches
 * Schedule a new match. Admin/Coordinator only.
 */
export const createMatch = async (req, res, next) => {
    try {
        const {
            sport, sport_id, sport_name,
            teamA, teamB, team_a_id, team_b_id, team_a_name, team_b_name,
            venue, venue_id, venue_name,
            date, time, round, tournament_id
        } = req.body;

        // Build a combined datetime string from separate date and time fields if needed
        let scheduled_time = req.body.scheduled_time || null;
        if (!scheduled_time && date) {
            // Combine date + time into a MySQL-compatible DATETIME
            const timeStr = time || '00:00';
            // Try to parse time like "04:00 PM" or "16:00"
            let t = timeStr.trim();
            if (t.match(/\d{1,2}:\d{2}\s*(AM|PM)/i)) {
                const [hm, ampm] = t.split(/\s+/);
                let [h, m] = hm.split(':').map(Number);
                if (ampm.toUpperCase() === 'PM' && h !== 12) h += 12;
                if (ampm.toUpperCase() === 'AM' && h === 12) h = 0;
                t = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
            } else {
                t = t.length === 5 ? `${t}:00` : t; // HH:MM -> HH:MM:00
            }
            scheduled_time = `${date} ${t}`;
        }

        if (!scheduled_time) {
            return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'scheduled_time or date is required.' } });
        }

        const matchId = await createMatchSql({
            tournament_id: tournament_id || null,
            sport_id: sport_id || null,
            sport_name: sport_name || sport || null,
            team_a_id: team_a_id || null,
            team_b_id: team_b_id || null,
            team_a_name: team_a_name || teamA || null,
            team_b_name: team_b_name || teamB || null,
            venue_id: venue_id || null,
            venue_name: venue_name || venue || null,
            scheduled_time,
            round: round || 'League'
        });

        return res.status(201).json({ success: true, data: { match_id: matchId, scheduled_time, round } });
    } catch (err) {
        next(err);
    }
};

/**
 * DELETE /api/matches/:id
 * Remove a scheduled match. Admin only.
 */
export const deleteMatch = async (req, res, next) => {
    try {
        const matchId = parseInt(req.params.id, 10);
        if (isNaN(matchId)) {
            return res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Match ID must be a number.' } });
        }
        const deleted = await deleteMatchSql(matchId);
        if (!deleted) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: `Match ${matchId} not found.` } });
        }
        return res.json({ success: true, data: { message: 'Match deleted successfully.' } });
    } catch (err) {
        next(err);
    }
};

/**
 * PUT /api/matches/:id/score
 * Accepts: { scoreA, scoreB, detailScore, isFinal }
 * Server determines winner from team_a_id / team_b_id stored in the match row.
 * Only Admin and Coordinator may call this (enforced in route middleware).
 */
export const updateScore = async (req, res, next) => {
    try {
        const matchId = parseInt(req.params.id, 10);
        if (isNaN(matchId)) {
            return res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Match ID must be a number.' } });
        }

        const { scoreA, scoreB, detailScore = '', isFinal = false } = req.body;

        if (scoreA === undefined || scoreB === undefined) {
            return res.status(400).json({ success: false, error: { code: 'MISSING_SCORES', message: 'scoreA and scoreB are required.' } });
        }

        const a = Number(scoreA);
        const b = Number(scoreB);
        if (isNaN(a) || isNaN(b) || a < 0 || b < 0) {
            return res.status(400).json({ success: false, error: { code: 'INVALID_SCORES', message: 'Scores must be non-negative numbers.' } });
        }

        // Fetch the current match to get team IDs
        const [[match]] = await pool.execute(
            'SELECT match_id, team_a_id, team_b_id FROM matches WHERE match_id = ?',
            [matchId]
        );
        if (!match) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: `Match ${matchId} not found.` } });
        }

        // Server-side winner resolution — frontend never decides this
        let winnerTeamId = null;
        let winnerLabel = null;

        if (isFinal) {
            if (a > b) {
                winnerTeamId = match.team_a_id;
                winnerLabel = 'Team A';
            } else if (b > a) {
                winnerTeamId = match.team_b_id;
                winnerLabel = 'Team B';
            } else {
                winnerTeamId = null; // Draw — no winner FK, handled by winnerLabel
                winnerLabel = 'Draw';
            }
        }

        // Map isFinal to DB status enum: Scheduled | Ongoing | Completed | Postponed
        const status = isFinal ? 'Completed' : 'Ongoing';

        const updated = await updateMatchScore({
            matchId,
            scoreA: a,
            scoreB: b,
            detailScore: String(detailScore),
            status,
            winnerTeamId,
            updatedBy: req.user?.id || null
        });

        if (!updated) {
            return res.status(500).json({ success: false, error: { code: 'UPDATE_FAILED', message: 'Score update failed. Match may not exist.' } });
        }

        return res.json({
            success: true,
            data: {
                matchId,
                scoreA: a,
                scoreB: b,
                detailScore,
                status,
                winner: winnerLabel,
                winnerTeamId,
                isFinal
            }
        });
    } catch (err) {
        next(err);
    }
};
