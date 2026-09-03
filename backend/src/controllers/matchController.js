import { updateMatchScore, getAllMatches } from '../models/sql/matchSqlModel.js';
import pool from '../config/db.js';

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
