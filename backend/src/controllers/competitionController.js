import pool from '../config/db.js';
import { assertDepartmentAccess } from '../services/accessScope.js';

const fail = (message, statusCode = 400) => { throw Object.assign(new Error(message), { statusCode }); };
const managers = ['Admin', 'Sports President', 'President'];

export function rankEntries(entries, scoring) {
    const finished = entries.filter(e => e.result_status === 'Finished').sort((a,b) =>
        scoring === 'Time' ? Number(a.result_value)-Number(b.result_value) : Number(b.result_value)-Number(a.result_value));
    let rank = 0;
    return [...finished.map((entry, index) => {
        if (index === 0 || Number(entry.result_value) !== Number(finished[index-1].result_value)) rank = index+1;
        return { ...entry, rank };
    }), ...entries.filter(e => e.result_status !== 'Finished').map(e => ({ ...e, rank: null }))];
}

async function checkScope(user, departmentId, sportId, connection = pool) {
    assertDepartmentAccess(user, departmentId);
    if (user.role === 'Captain') {
        const [[assignment]] = await connection.execute("SELECT id FROM department_sport_captains WHERE user_id=? AND department_id=? AND sport_id=? AND status='Active'", [user.id, departmentId, sportId]);
        if (!assignment) fail('This entry is outside your assigned sport and department.', 403);
    }
}

export const listCompetitions = async (req,res,next) => {
    try {
        const [rows] = await pool.execute(`SELECT c.*, e.name event_name,e.sport_id,e.tournament_id,s.name sport_name,sc.name category_name
            FROM sport_competitions c JOIN events e ON e.event_id=c.event_id JOIN sports s ON s.sport_id=e.sport_id
            JOIN sport_categories sc ON sc.category_id=c.category_id
            WHERE (? IS NULL OR e.tournament_id=?) ORDER BY c.scheduled_time,c.competition_id`, [req.query.tournamentId || null, req.query.tournamentId || null]);
        res.json({ success:true, data:rows });
    } catch(err) { next(err); }
};

export const createCompetition = async (req,res,next) => {
    try {
        const { eventId,categoryId,name,round='Final',entrySize=1,scoring,unit,scheduledTime } = req.body;
        if (!String(name || '').trim() || String(name).length>120 || !['Time','Distance','Points'].includes(scoring) || !Number.isInteger(Number(entrySize)) || Number(entrySize)<1 || Number(entrySize)>30 || !unit || String(unit).length>20 || !scheduledTime || Number.isNaN(Date.parse(scheduledTime)) || String(round).length>60) fail('Enter valid competition details.');
        const [[event]] = await pool.execute(`SELECT e.event_id FROM events e JOIN sport_categories sc ON sc.sport_id=e.sport_id WHERE e.event_id=? AND sc.category_id=?`, [Number(eventId),Number(categoryId)]);
        if (!event) fail('Select a category belonging to the event sport.');
        const [result] = await pool.execute(`INSERT INTO sport_competitions (event_id,category_id,name,round,entry_size,scoring,unit,scheduled_time) VALUES (?,?,?,?,?,?,?,?)`, [Number(eventId),Number(categoryId),name.trim(),round,Number(entrySize),scoring,unit,String(scheduledTime).replace('T',' ')]);
        res.status(201).json({ success:true,data:{ competition_id:result.insertId } });
    } catch(err) { next(err); }
};

export const competitionDetails = async (req,res,next) => {
    try {
        const [[competition]] = await pool.execute('SELECT * FROM sport_competitions WHERE competition_id=?', [req.params.id]);
        if (!competition) fail('Competition not found.',404);
        let [entries] = await pool.execute(`SELECT ce.*,d.code department_code,GROUP_CONCAT(CONCAT(s.student_name,' (',s.register_number,')') ORDER BY s.student_name SEPARATOR ', ') athletes
            FROM competition_entries ce JOIN departments d ON d.id=ce.department_id
            JOIN competition_entry_members cm ON cm.entry_id=ce.entry_id JOIN students s ON s.student_id=cm.student_id
            WHERE ce.competition_id=? GROUP BY ce.entry_id,d.code`, [req.params.id]);
        entries = rankEntries(entries,competition.scoring);
        if (req.user.role === 'Coordinator') entries=entries.filter(e => Number(e.department_id)===Number(req.user.dept_id));
        if (req.user.role === 'Captain') {
            const [assignments] = await pool.execute("SELECT c.department_id FROM department_sport_captains c JOIN events e ON e.sport_id=c.sport_id WHERE e.event_id=? AND c.user_id=? AND c.status='Active'", [competition.event_id,req.user.id]);
            entries=entries.filter(e => assignments.some(a => Number(a.department_id)===Number(e.department_id)));
        }
        res.json({ success:true,data:{...competition,entries} });
    } catch(err) { next(err); }
};

export const registerCompetitionEntry = async (req,res,next) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [[competition]] = await connection.execute('SELECT c.*,e.sport_id FROM sport_competitions c JOIN events e ON e.event_id=c.event_id WHERE c.competition_id=? FOR UPDATE',[req.params.id]);
        if (!competition) fail('Competition not found.',404);
        if (competition.status !== 'Scheduled') fail('Registration is closed.',409);
        const registers = [...new Set((Array.isArray(req.body.registerNumbers) ? req.body.registerNumbers : []).map(v => String(v).trim()).filter(Boolean))];
        if (registers.length !== competition.entry_size) fail(`Select exactly ${competition.entry_size} athlete(s).`);
        const [students] = await connection.execute(`SELECT student_id,student_name,department_id FROM students WHERE register_number IN (${registers.map(()=>'?').join(',')})`, registers);
        if (students.length !== registers.length) fail('One or more register numbers were not found.');
        const departmentId = students[0].department_id;
        if (students.some(s => s.department_id !== departmentId)) fail('All athletes must belong to the same department.');
        await checkScope(req.user,departmentId,competition.sport_id,connection);
        const name = competition.entry_size === 1 ? students[0].student_name : String(req.body.name || '').trim();
        if (!name || name.length>120) fail('Enter an entry name.');
        const [result] = await connection.execute('INSERT INTO competition_entries (competition_id,department_id,name) VALUES (?,?,?)',[req.params.id,departmentId,name]);
        for (const student of students) await connection.execute('INSERT INTO competition_entry_members (entry_id,competition_id,student_id) VALUES (?,?,?)',[result.insertId,req.params.id,student.student_id]);
        await connection.commit();
        res.status(201).json({ success:true,data:{entry_id:result.insertId} });
    } catch(err) { await connection.rollback(); if(err.code==='ER_DUP_ENTRY') err=Object.assign(new Error('An athlete is already entered in this competition.'),{statusCode:409}); next(err); }
    finally { connection.release(); }
};

export const updateCompetition = async (req,res,next) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [[competition]] = await connection.execute('SELECT * FROM sport_competitions WHERE competition_id=? FOR UPDATE',[req.params.id]);
        if (!competition) fail('Competition not found.',404);
        if (req.body.status) {
            if (!managers.includes(req.user.role)) fail('Only sports managers can change competition status.',403);
            const allowed = competition.status==='Scheduled' ? 'Ongoing' : competition.status==='Ongoing' ? 'Completed' : null;
            if (req.body.status!==allowed) fail('Invalid competition status transition.',409);
            const [[counts]] = await connection.execute("SELECT COUNT(*) total,SUM(result_status='Pending') pending FROM competition_entries WHERE competition_id=?",[req.params.id]);
            if (!counts.total || (req.body.status==='Completed' && Number(counts.pending)>0)) fail('Enter all results before completing the competition.',409);
            await connection.execute('UPDATE sport_competitions SET status=? WHERE competition_id=?',[req.body.status,req.params.id]);
        } else if (req.body.name || req.body.round || req.body.scheduledTime || req.body.categoryId || req.body.unit || req.body.scoring || req.body.entrySize) {
            if (!managers.includes(req.user.role)) fail('Only sports managers can update competition details.',403);
            if (competition.status !== 'Scheduled') fail('Only scheduled competitions can be edited.',409);

            const name = req.body.name !== undefined ? String(req.body.name).trim() : competition.name;
            const round = req.body.round !== undefined ? String(req.body.round).trim() : competition.round;
            const entrySize = req.body.entrySize !== undefined ? Number(req.body.entrySize) : competition.entry_size;
            const scoring = req.body.scoring !== undefined ? req.body.scoring : competition.scoring;
            const unit = req.body.unit !== undefined ? String(req.body.unit).trim() : competition.unit;
            const scheduledTime = req.body.scheduledTime ? String(req.body.scheduledTime).replace('T', ' ') : competition.scheduled_time;
            const categoryId = req.body.categoryId ? Number(req.body.categoryId) : competition.category_id;

            if (!name || name.length > 120 || !['Time','Distance','Points'].includes(scoring) || !Number.isInteger(entrySize) || entrySize < 1 || entrySize > 30 || !unit || unit.length > 20 || !scheduledTime || Number.isNaN(Date.parse(scheduledTime)) || round.length > 60) {
                fail('Enter valid competition details.');
            }

            if (req.body.categoryId) {
                const [[catCheck]] = await connection.execute(
                    'SELECT e.event_id FROM events e JOIN sport_categories sc ON sc.sport_id=e.sport_id WHERE e.event_id=? AND sc.category_id=?',
                    [competition.event_id, categoryId]
                );
                if (!catCheck) fail('Select a category belonging to the event sport.');
            }

            await connection.execute(
                'UPDATE sport_competitions SET name=?, round=?, entry_size=?, scoring=?, unit=?, scheduled_time=?, category_id=? WHERE competition_id=?',
                [name, round, entrySize, scoring, unit, scheduledTime, categoryId, req.params.id]
            );
        } else {
            if (competition.status!=='Ongoing') fail('Results can only be updated during an ongoing competition.',409);
            const { entryId,resultStatus,resultValue } = req.body;
            if (!['Finished','DNS','DNF','DQ'].includes(resultStatus)) fail('Select a result status.');
            const value = resultStatus==='Finished' ? Number(resultValue) : null;
            if (resultStatus==='Finished' && (resultValue==='' || resultValue==null || !Number.isFinite(value) || value<0 || value>=100000000 || (competition.scoring==='Time' && value===0))) fail('Enter a valid result.');
            const [updated] = await connection.execute('UPDATE competition_entries SET result_status=?,result_value=? WHERE entry_id=? AND competition_id=?',[resultStatus,value,Number(entryId),req.params.id]);
            if (!updated.affectedRows) fail('Entry not found.',404);
        }
        await connection.commit();
        res.json({ success:true,data:{competition_id:Number(req.params.id)} });
    } catch(err) { await connection.rollback(); next(err); }
    finally { connection.release(); }
};

export const deleteCompetition = async (req,res,next) => {
    try {
        const [deleted] = await pool.execute("DELETE FROM sport_competitions WHERE competition_id=? AND status='Scheduled'",[req.params.id]);
        if (!deleted.affectedRows) fail('Only scheduled competitions can be deleted.',409);
        res.json({success:true,data:{competition_id:Number(req.params.id)}});
    } catch(err) { next(err); }
};

export const removeCompetitionEntry = async (req,res,next) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [[competition]] = await connection.execute('SELECT c.*,e.sport_id FROM sport_competitions c JOIN events e ON e.event_id=c.event_id WHERE c.competition_id=? FOR UPDATE',[req.params.id]);
        if (!competition || competition.status!=='Scheduled') fail('Entries can only be removed before a competition starts.',409);
        const [[entry]] = await connection.execute('SELECT * FROM competition_entries WHERE entry_id=? AND competition_id=?',[req.params.entryId,req.params.id]);
        if (!entry) fail('Entry not found.',404);
        await checkScope(req.user,entry.department_id,competition.sport_id,connection);
        await connection.execute('DELETE FROM competition_entries WHERE entry_id=?',[entry.entry_id]);
        await connection.commit();
        res.json({success:true,data:{entry_id:entry.entry_id}});
    } catch(err) { await connection.rollback(); next(err); }
    finally { connection.release(); }
};
