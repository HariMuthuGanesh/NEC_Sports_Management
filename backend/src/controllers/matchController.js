import { createMatch as createMatchSql, deleteMatch as deleteMatchSql, updateMatchScore, getAllMatches } from '../models/sql/matchSqlModel.js';
import pool from '../config/db.js';
import { assertTeamAccess } from '../services/accessScope.js';
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

        // Fixtures are built from team IDs, or bracket placeholders for upcoming elimination rounds
        const idA = Number(team_a_id) || null, idB = Number(team_b_id) || null;
        const placeholderA = req.body.placeholder_a || null;
        const placeholderB = req.body.placeholder_b || null;

        if (!idA && !placeholderA && !idB && !placeholderB) {
            return res.status(400).json({ success: false, error: { code: 'TEAM_IDS_REQUIRED', message: 'Team A and Team B (or bracket placeholders) must be provided.' } });
        }

        const teamIdsToValidate = [idA, idB].filter(Boolean);
        let teamRows = [];
        if (teamIdsToValidate.length > 0) {
            const [rows] = await pool.execute(
                `SELECT team_id, sport_id, tournament_id, status, name FROM teams WHERE team_id IN (${teamIdsToValidate.map(() => '?').join(',')})`,
                teamIdsToValidate
            );
            teamRows = rows;
            if (teamRows.length !== teamIdsToValidate.length) {
                return res.status(404).json({ success: false, error: { code: 'TEAM_NOT_FOUND', message: 'One or both teams do not exist.' } });
            }
        }

        const sportIdNum = Number(sport_id) || (teamRows[0]?.sport_id ? Number(teamRows[0].sport_id) : null);
        for (const t of teamRows) {
            if (tournament_id && Number(t.tournament_id) !== Number(tournament_id)) return res.status(400).json({ success: false, error: { message: 'Both teams must be registered in this tournament.' } });
            if (t.status !== 'Approved') {
                return res.status(400).json({ success: false, error: { code: 'TEAM_NOT_APPROVED', message: `Team "${t.name}" is not approved yet.` } });
            }
            if (sportIdNum && Number(t.sport_id) !== sportIdNum) {
                return res.status(400).json({ success: false, error: { code: 'SPORT_MISMATCH', message: `Team "${t.name}" does not play the selected sport.` } });
            }
        }

        if (req.user.role === 'Coordinator') {
            if (idA) await assertTeamAccess(req.user, idA);
            if (idB) await assertTeamAccess(req.user, idB);
        }
        if (sportIdNum) {
            const [[sportFormat]] = await pool.execute('SELECT sport_type FROM sports WHERE sport_id=?', [sportIdNum]);
            if (sportFormat?.sport_type === 'Individual') return res.status(400).json({ success: false, error: { message: 'Use event competitions for individual sports.' } });
        }
        if (teamRows.length === 2 && Number(teamRows[0].sport_id) !== Number(teamRows[1].sport_id)) {
            return res.status(400).json({ success: false, error: { message: 'Both teams must play the same sport.' } });
        }

        const matchId = await createMatchSql({
            tournament_id: tournament_id || null,
            event_id: req.body.event_id || req.body.eventId || null,
            sport_id: sportIdNum,
            sport_name: sport_name || sport || null,
            team_a_id: idA,
            team_b_id: idB,
            team_a_name: team_a_name || teamA || null,
            team_b_name: team_b_name || teamB || null,
            venue_id: venue_id || null,
            venue_name: venue_name || venue || null,
            scheduled_time,
            duration_minutes: Number(req.body.duration_minutes || req.body.durationMinutes) || 60,
            pool: req.body.pool || 'Pool A',
            round: round || 'League',
            next_match_id: req.body.next_match_id || null,
            next_match_slot: req.body.next_match_slot || null,
            match_number: req.body.match_number || null,
            placeholder_a: placeholderA,
            placeholder_b: placeholderB,
            bracket_round: req.body.bracket_round || null
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
 * Only Admin and Score Updater may call this (enforced in route middleware).
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
        const rawScorers = req.body.scorers;

        if (rawA === undefined || rawB === undefined) {
            return res.status(400).json({ success: false, error: { code: 'MISSING_SCORES', message: 'scoreA and scoreB are required.' } });
        }

        const a = Number(rawA);
        const b = Number(rawB);
        const detailScore = rawDetail !== undefined && rawDetail !== null ? String(rawDetail) : '';
        const scorers = rawScorers ? (typeof rawScorers === 'object' ? JSON.stringify(rawScorers) : String(rawScorers)) : null;
        const isFinal = Boolean(rawFinal);

        if (isNaN(a) || isNaN(b) || a < 0 || b < 0) {
            return res.status(400).json({ success: false, error: { code: 'INVALID_SCORES', message: 'Scores must be non-negative numbers.' } });
        }

        // Fetch the current match to get team IDs and bracket linkage
        const [[match]] = await pool.execute(
            'SELECT match_id, team_a_id, team_b_id, status, next_match_id, next_match_slot, loser_next_match_id, loser_next_match_slot FROM matches WHERE match_id = ?',
            [matchId]
        );
        if (!match) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: `Match ${matchId} not found.` } });
        }

        if (req.user.role === 'Score Updater' && match.status !== 'Ongoing') return res.status(409).json({ success: false, error: { message: 'Scores can only be updated for ongoing matches.' } });

        // Server-side winner & loser resolution - frontend never decides this
        let winnerTeamId = null;
        let loserTeamId = null;
        let winnerLabel = null;

        if (isFinal) {
            if (a > b) {
                winnerTeamId = match.team_a_id;
                loserTeamId = match.team_b_id;
                winnerLabel = 'Team A';
            } else if (b > a) {
                winnerTeamId = match.team_b_id;
                loserTeamId = match.team_a_id;
                winnerLabel = 'Team B';
            } else {
                winnerTeamId = null; // Draw - no winner FK, handled by winnerLabel
                loserTeamId = null;
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
            scorers,
            status,
            winnerTeamId,
            winnerLabel,
            updatedBy: req.user.id
        });

        if (!updated) {
            return res.status(500).json({ success: false, error: { code: 'UPDATE_FAILED', message: 'Failed to update match score.' } });
        }

        if (isFinal) {
            // Auto-advance winner in knockout tournament bracket if next_match_id is configured
            if (winnerTeamId && match.next_match_id && match.next_match_slot) {
                try {
                    const slotCol = match.next_match_slot.toUpperCase() === 'A' ? 'team_a_id' : 'team_b_id';
                    await pool.execute(
                        `UPDATE matches SET ${slotCol} = ? WHERE match_id = ?`,
                        [winnerTeamId, match.next_match_id]
                    );
                } catch (advErr) {
                    console.warn('[updateScore] Winner bracket advancement error:', advErr.message);
                }
            }

            // Auto-advance loser in stepladder / double elimination bracket if loser_next_match_id is configured
            if (loserTeamId && match.loser_next_match_id && match.loser_next_match_slot) {
                try {
                    const loserSlotCol = match.loser_next_match_slot.toUpperCase() === 'A' ? 'team_a_id' : 'team_b_id';
                    await pool.execute(
                        `UPDATE matches SET ${loserSlotCol} = ? WHERE match_id = ?`,
                        [loserTeamId, match.loser_next_match_id]
                    );
                } catch (advErr) {
                    console.warn('[updateScore] Loser bracket advancement error:', advErr.message);
                }
            }

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

/**
 * POST /api/matches/generate-bracket
 * Generates an end-to-end single-elimination tournament knockout bracket.
 * Supports:
 * - 3 teams: 1 Semi-Final (T1 vs T2), Team 3 receives a Bye straight to Final (Winner M1 vs Team 3).
 * - 4 teams: 2 Semi-Finals (T1 vs T2, T3 vs T4), Final (Winner M1 vs Winner M2).
 * - N teams: Power-of-2 elimination bracket with automatic byes and round linkages.
 */
export const generateBracketFixtures = async (req, res, next) => {
    try {
        const {
            tournament_id,
            sport_id,
            event_id = null,
            venue_id = null,
            date,
            start_time = '09:00',
            duration_minutes = 60,
            interval_hours = 2,
            team_ids = []
        } = req.body;

        if (!tournament_id || !sport_id) {
            return res.status(400).json({ success: false, error: { message: 'tournament_id and sport_id are required.' } });
        }
        if (!date) {
            return res.status(400).json({ success: false, error: { message: 'A start date is required.' } });
        }

        // Fetch eligible approved teams
        let teamsToBracket = [];
        if (Array.isArray(team_ids) && team_ids.length >= 2) {
            const [rows] = await pool.execute(
                `SELECT team_id, name, department_id FROM teams WHERE team_id IN (${team_ids.map(() => '?').join(',')}) AND status = 'Approved'`,
                team_ids
            );
            const rowMap = new Map(rows.map(r => [r.team_id, r]));
            teamsToBracket = team_ids.map(id => rowMap.get(id)).filter(Boolean);
        } else {
            let q = 'SELECT team_id, name, department_id FROM teams WHERE sport_id = ? AND status = "Approved"';
            const params = [sport_id];
            if (event_id) {
                q += ' AND event_id = ?';
                params.push(event_id);
            } else if (tournament_id) {
                q += ' AND (tournament_id = ? OR tournament_id IS NULL)';
                params.push(tournament_id);
            }
            q += ' ORDER BY team_id ASC';
            const [rows] = await pool.execute(q, params);
            teamsToBracket = rows;
        }

        if (teamsToBracket.length < 2) {
            return res.status(400).json({
                success: false,
                error: { message: `At least 2 approved teams are required. Found ${teamsToBracket.length}.` }
            });
        }

        const numTeams = teamsToBracket.length;
        const dur = Number(duration_minutes) || 60;
        const stepHours = Number(interval_hours) || 2;

        const getMatchDateTime = (matchIndex) => {
            const [sh = 9, sm = 0] = String(start_time || '09:00').split(':').map(Number);
            const totalMinutesOffset = matchIndex * (stepHours * 60);
            const baseDate = new Date(`${date}T${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}:00`);
            baseDate.setMinutes(baseDate.getMinutes() + totalMinutesOffset);
            
            const yyyy = baseDate.getFullYear();
            const mm = String(baseDate.getMonth() + 1).padStart(2, '0');
            const dd = String(baseDate.getDate()).padStart(2, '0');
            const hh = String(baseDate.getHours()).padStart(2, '0');
            const min = String(baseDate.getMinutes()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd} ${hh}:${min}:00`;
        };

        const createdMatches = [];

        // ── 3 Teams Scenario (Stepladder / Page-Playoff Format) ──
        // Match 1: Qualifier 1 (Team 1 vs Team 2)
        //          Winner -> Championship Final (Match 3, Slot A)
        //          Loser  -> Qualifier 2 / Eliminator (Match 2, Slot A)
        // Match 2: Qualifier 2 (Eliminator) (Loser Match 1 vs Team 3)
        //          Winner -> Championship Final (Match 3, Slot B)
        //          Loser  -> 3rd Place (Bronze)
        // Match 3: Championship Final (Winner Match 1 vs Winner Match 2)
        //          Winner -> 1st Place (Champion)
        //          Loser  -> 2nd Place (Runner-up)
        if (numTeams === 3) {
            const [t1, t2, t3] = teamsToBracket;

            // Match 1: Qualifier 1 (T1 vs T2)
            const m1Time = getMatchDateTime(0);
            const m1Id = await createMatchSql({
                tournament_id, sport_id, event_id, venue_id,
                team_a_id: t1.team_id, placeholder_a: t1.name,
                team_b_id: t2.team_id, placeholder_b: t2.name,
                scheduled_time: m1Time, duration_minutes: dur,
                round: 'Qualifier 1', pool: 'Playoffs',
                match_number: 1, bracket_round: 1
            });

            // Match 2: Qualifier 2 (Eliminator) (Loser M1 vs T3)
            const m2Time = getMatchDateTime(1);
            const m2Id = await createMatchSql({
                tournament_id, sport_id, event_id, venue_id,
                team_a_id: null, placeholder_a: 'Loser of Match #1',
                team_b_id: t3.team_id, placeholder_b: t3.name,
                scheduled_time: m2Time, duration_minutes: dur,
                round: 'Qualifier 2 (Eliminator)', pool: 'Playoffs',
                match_number: 2, bracket_round: 2
            });

            // Match 3: Championship Final (Winner M1 vs Winner M2)
            const m3Time = getMatchDateTime(2);
            const m3Id = await createMatchSql({
                tournament_id, sport_id, event_id, venue_id,
                team_a_id: null, placeholder_a: 'Winner of Match #1',
                team_b_id: null, placeholder_b: 'Winner of Match #2',
                scheduled_time: m3Time, duration_minutes: dur,
                round: 'Championship Final', pool: 'Championship',
                match_number: 3, bracket_round: 3
            });

            // Link Match 1:
            // Winner -> Match 3 Slot A
            // Loser  -> Match 2 Slot A
            await pool.execute(
                'UPDATE matches SET next_match_id = ?, next_match_slot = ?, loser_next_match_id = ?, loser_next_match_slot = ? WHERE match_id = ?',
                [m3Id, 'A', m2Id, 'A', m1Id]
            );

            // Link Match 2:
            // Winner -> Match 3 Slot B
            // Loser  -> Out (Finishes in 3rd Place)
            await pool.execute(
                'UPDATE matches SET next_match_id = ?, next_match_slot = ? WHERE match_id = ?',
                [m3Id, 'B', m2Id]
            );

            createdMatches.push({ match_id: m1Id, match_number: 1, round: 'Qualifier 1', teamA: t1.name, teamB: t2.name, scheduled_time: m1Time });
            createdMatches.push({ match_id: m2Id, match_number: 2, round: 'Qualifier 2 (Eliminator)', teamA: 'Loser of Match #1', teamB: t3.name, scheduled_time: m2Time });
            createdMatches.push({ match_id: m3Id, match_number: 3, round: 'Championship Final', teamA: 'Winner of Match #1', teamB: 'Winner of Match #2', scheduled_time: m3Time });

            return res.status(201).json({
                success: true,
                data: {
                    message: 'Successfully generated 3-team Stepladder bracket (Match 1: Qualifier 1, Match 2: Qualifier 2 / Eliminator, Match 3: Championship Final).',
                    totalMatches: 3,
                    matches: createdMatches
                }
            });
        }

        // ── 4 Teams Scenario (2 Semi-Finals + 1 Final) ──
        if (numTeams === 4) {
            const [t1, t2, t3, t4] = teamsToBracket;

            // Match 1: SF 1 (T1 vs T2)
            const m1Time = getMatchDateTime(0);
            const m1Id = await createMatchSql({
                tournament_id, sport_id, event_id, venue_id,
                team_a_id: t1.team_id, team_b_id: t2.team_id,
                scheduled_time: m1Time, duration_minutes: dur,
                round: 'Semi-Final', pool: 'Pool A',
                match_number: 1, bracket_round: 1
            });

            // Match 2: SF 2 (T3 vs T4)
            const m2Time = getMatchDateTime(1);
            const m2Id = await createMatchSql({
                tournament_id, sport_id, event_id, venue_id,
                team_a_id: t3.team_id, team_b_id: t4.team_id,
                scheduled_time: m2Time, duration_minutes: dur,
                round: 'Semi-Final', pool: 'Pool B',
                match_number: 2, bracket_round: 1
            });

            // Match 3: Final (Winner M1 vs Winner M2)
            const m3Time = getMatchDateTime(2);
            const m3Id = await createMatchSql({
                tournament_id, sport_id, event_id, venue_id,
                team_a_id: null, placeholder_a: 'Winner of Match #1',
                team_b_id: null, placeholder_b: 'Winner of Match #2',
                scheduled_time: m3Time, duration_minutes: dur,
                round: 'Final', pool: 'Championship',
                match_number: 3, bracket_round: 2
            });

            // Link SFs to Final
            await pool.execute('UPDATE matches SET next_match_id = ?, next_match_slot = ? WHERE match_id = ?', [m3Id, 'A', m1Id]);
            await pool.execute('UPDATE matches SET next_match_id = ?, next_match_slot = ? WHERE match_id = ?', [m3Id, 'B', m2Id]);

            createdMatches.push({ match_id: m1Id, match_number: 1, round: 'Semi-Final', teamA: t1.name, teamB: t2.name, scheduled_time: m1Time });
            createdMatches.push({ match_id: m2Id, match_number: 2, round: 'Semi-Final', teamA: t3.name, teamB: t4.name, scheduled_time: m2Time });
            createdMatches.push({ match_id: m3Id, match_number: 3, round: 'Final', teamA: 'Winner of Match #1', teamB: 'Winner of Match #2', scheduled_time: m3Time });

            return res.status(201).json({
                success: true,
                data: {
                    message: 'Successfully generated 4-team knockout bracket (2 Semi-Finals + 1 Final).',
                    totalMatches: 3,
                    matches: createdMatches
                }
            });
        }

        // ── General Knockout Bracket for N Teams (Power of 2 with Byes) ──
        const power = Math.pow(2, Math.ceil(Math.log2(numTeams)));
        const numByes = power - numTeams;

        const getRoundTitle = (teamsInRound) => {
            if (teamsInRound === 2) return 'Final';
            if (teamsInRound === 4) return 'Semi-Final';
            if (teamsInRound === 8) return 'Quarter-Final';
            if (teamsInRound === 16) return 'Round of 16';
            return `Round of ${teamsInRound}`;
        };

        const byeTeams = teamsToBracket.slice(0, numByes);
        const round1Teams = teamsToBracket.slice(numByes);

        let matchIndexCounter = 0;
        let matchNumberCounter = 1;

        // Create Round 1 matches
        const r1MatchIds = [];
        for (let i = 0; i < round1Teams.length; i += 2) {
            const tA = round1Teams[i];
            const tB = round1Teams[i + 1];
            const mTime = getMatchDateTime(matchIndexCounter++);
            const mNum = matchNumberCounter++;
            const roundName = getRoundTitle(power);

            const mId = await createMatchSql({
                tournament_id, sport_id, event_id, venue_id,
                team_a_id: tA.team_id, team_b_id: tB.team_id,
                scheduled_time: mTime, duration_minutes: dur,
                round: roundName, pool: `Pool ${String.fromCharCode(65 + r1MatchIds.length)}`,
                match_number: mNum, bracket_round: 1
            });
            r1MatchIds.push({ id: mId, match_number: mNum, name: `Winner of Match #${mNum}` });
            createdMatches.push({ match_id: mId, match_number: mNum, round: roundName, teamA: tA.name, teamB: tB.name, scheduled_time: mTime });
        }

        let currentRoundEntrants = [
            ...byeTeams.map(t => ({ team_id: t.team_id, name: `${t.name} (Bye)`, fromMatchId: null })),
            ...r1MatchIds.map(m => ({ team_id: null, name: m.name, fromMatchId: m.id }))
        ];

        let currentRoundNumber = 2;
        let entrantsInRound = power / 2;

        while (currentRoundEntrants.length > 1) {
            const nextRoundEntrants = [];
            const roundName = getRoundTitle(entrantsInRound);

            for (let i = 0; i < currentRoundEntrants.length; i += 2) {
                const entA = currentRoundEntrants[i];
                const entB = currentRoundEntrants[i + 1];
                const mTime = getMatchDateTime(matchIndexCounter++);
                const mNum = matchNumberCounter++;

                const mId = await createMatchSql({
                    tournament_id, sport_id, event_id, venue_id,
                    team_a_id: entA.team_id || null,
                    placeholder_a: entA.team_id ? null : entA.name,
                    team_b_id: entB.team_id || null,
                    placeholder_b: entB.team_id ? null : entB.name,
                    scheduled_time: mTime, duration_minutes: dur,
                    round: roundName, pool: `Pool ${String.fromCharCode(65 + Math.floor(i / 2))}`,
                    match_number: mNum, bracket_round: currentRoundNumber
                });

                if (entA.fromMatchId) {
                    await pool.execute('UPDATE matches SET next_match_id = ?, next_match_slot = ? WHERE match_id = ?', [mId, 'A', entA.fromMatchId]);
                }
                if (entB.fromMatchId) {
                    await pool.execute('UPDATE matches SET next_match_id = ?, next_match_slot = ? WHERE match_id = ?', [mId, 'B', entB.fromMatchId]);
                }

                nextRoundEntrants.push({ team_id: null, name: `Winner of Match #${mNum}`, fromMatchId: mId });
                createdMatches.push({ match_id: mId, match_number: mNum, round: roundName, teamA: entA.name, teamB: entB.name, scheduled_time: mTime });
            }

            currentRoundEntrants = nextRoundEntrants;
            currentRoundNumber++;
            entrantsInRound = entrantsInRound / 2;
        }

        return res.status(201).json({
            success: true,
            data: {
                message: `Successfully generated ${numTeams}-team knockout bracket (${createdMatches.length} matches across ${currentRoundNumber - 1} rounds).`,
                totalMatches: createdMatches.length,
                matches: createdMatches
            }
        });
    } catch (err) {
        next(err);
    }
};
