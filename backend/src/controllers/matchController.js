import { createMatch as createMatchSql, deleteMatch as deleteMatchSql, updateMatchScore, getAllMatches } from '../models/sql/matchSqlModel.js';
import pool from '../config/db.js';
import { resolveTeamCaptainUserId, sendSystemNotification, notifyDepartmentCoordinator, notifyTeamMembers } from '../services/emailService.js';

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

        // Guard: a team cannot play against itself
        if (team_a_id && team_b_id && String(team_a_id) === String(team_b_id)) {
            return res.status(400).json({
                success: false,
                error: { code: 'SAME_TEAM', message: 'A team cannot play against itself.' }
            });
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

        if (team_a_id) {
            const captainA = await resolveTeamCaptainUserId(team_a_id);
            if (captainA) await sendSystemNotification({ userId: captainA, title: 'New Match Scheduled', message: `Your team ${team_a_name || 'A'} has a new match scheduled for ${scheduled_time}.`, type: 'MATCH_ALERT' });
            
            const [tA] = await pool.execute('SELECT department_id FROM teams WHERE team_id = ? LIMIT 1', [team_a_id]);
            if (tA[0]?.department_id) await notifyDepartmentCoordinator(tA[0].department_id, { title: 'New Match Scheduled', message: `Team ${team_a_name || 'A'} has a match scheduled for ${scheduled_time}.`, type: 'MATCH_ALERT' });
        }
        if (team_b_id) {
            const captainB = await resolveTeamCaptainUserId(team_b_id);
            if (captainB) await sendSystemNotification({ userId: captainB, title: 'New Match Scheduled', message: `Your team ${team_b_name || 'B'} has a new match scheduled for ${scheduled_time}.`, type: 'MATCH_ALERT' });

            const [tB] = await pool.execute('SELECT department_id FROM teams WHERE team_id = ? LIMIT 1', [team_b_id]);
            if (tB[0]?.department_id) await notifyDepartmentCoordinator(tB[0].department_id, { title: 'New Match Scheduled', message: `Team ${team_b_name || 'B'} has a match scheduled for ${scheduled_time}.`, type: 'MATCH_ALERT' });
        }

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

        const rawA = req.body.scoreA !== undefined ? req.body.scoreA : req.body.score_a;
        const rawB = req.body.scoreB !== undefined ? req.body.scoreB : req.body.score_b;
        const rawDetail = req.body.detailScore !== undefined ? req.body.detailScore : req.body.detail_score;
        const rawFinal = req.body.isFinal !== undefined ? req.body.isFinal : (req.body.is_final || false);

        if (rawA === undefined || rawB === undefined) {
            return res.status(400).json({ success: false, error: { code: 'MISSING_SCORES', message: 'scoreA and scoreB are required.' } });
        }

        const a = Number(rawA);
        const b = Number(rawB);
        const detailScore = rawDetail !== undefined && rawDetail !== null ? String(rawDetail) : '';
        const isFinal = Boolean(rawFinal);

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

        // Server-side winner resolution - frontend never decides this
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
                winnerTeamId = null; // Draw - no winner FK, handled by winnerLabel
                winnerLabel = 'Draw';
            }
        }

        // Map isFinal to DB status enum: Scheduled | Ongoing | Completed | Postponed
        const status = isFinal ? 'Completed' : 'Ongoing';

        const updated = await updateMatchScore({
            matchId,
            scoreA: a,
            scoreB: b,
            detailScore,
            status,
            winnerTeamId,
            winnerLabel,
            recordedBy: req.user.id
        });

        if (!updated) {
            return res.status(500).json({ success: false, error: { code: 'UPDATE_FAILED', message: 'Failed to update match score.' } });
        }

        if (isFinal) {
            if (match.team_a_id) {
                await notifyTeamMembers(match.team_a_id, { title: 'Match Result Finalized', message: `Match ${matchId} results are final: ${a} - ${b}.`, type: 'MATCH_ALERT' });
                const [tA] = await pool.execute('SELECT department_id FROM teams WHERE team_id = ? LIMIT 1', [match.team_a_id]);
                if (tA[0]?.department_id) await notifyDepartmentCoordinator(tA[0].department_id, { title: 'Match Result Finalized', message: `Match ${matchId} results are final.`, type: 'MATCH_ALERT' });
            }
            if (match.team_b_id) {
                await notifyTeamMembers(match.team_b_id, { title: 'Match Result Finalized', message: `Match ${matchId} results are final: ${a} - ${b}.`, type: 'MATCH_ALERT' });
                const [tB] = await pool.execute('SELECT department_id FROM teams WHERE team_id = ? LIMIT 1', [match.team_b_id]);
                if (tB[0]?.department_id) await notifyDepartmentCoordinator(tB[0].department_id, { title: 'Match Result Finalized', message: `Match ${matchId} results are final.`, type: 'MATCH_ALERT' });
            }
        }

        return res.json({
            success: true,
            data: {
                matchId,
                match_id: matchId,
                scoreA: a,
                score_a: a,
                scoreB: b,
                score_b: b,
                detailScore,
                detail_score: detailScore,
                status,
                winner: winnerLabel,
                winnerTeamId,
                winner_team_id: winnerTeamId,
                isFinal
            }
        });
    } catch (err) {
        next(err);
    }
};
