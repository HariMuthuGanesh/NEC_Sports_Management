import pool from '../../config/db.js';
import { addAuditEntry } from '../../services/auditStore.js';

// Auto-transition scheduled and expired announcements
export const autoTransitionAnnouncements = async () => {
    try {
        // Transition Scheduled -> Published when scheduled_publish_time <= NOW()
        await pool.execute(`
            UPDATE announcements 
            SET status = 'Published', 
                published_at = COALESCE(published_at, NOW()) 
            WHERE status = 'Scheduled' 
              AND scheduled_publish_time IS NOT NULL 
              AND scheduled_publish_time <= NOW()
        `);

        // Transition Published -> Expired when expires_at <= NOW()
        await pool.execute(`
            UPDATE announcements 
            SET status = 'Expired' 
            WHERE status = 'Published' 
              AND expires_at IS NOT NULL 
              AND expires_at <= NOW()
        `);
    } catch (err) {
        console.warn('[Announcements] Auto-transition check error:', err.message);
    }
};

// Periodic self-healing check every 60 seconds
if (typeof setInterval !== 'undefined') {
    setInterval(autoTransitionAnnouncements, 60 * 1000).unref?.();
}

export const getAllAnnouncements = async (filters = {}) => {
    // Run self-healing transition first so query sees fresh state
    await autoTransitionAnnouncements();

    const {
        status,
        category,
        priority,
        tournamentId,
        tournament_id,
        eventId,
        event_id,
        academicYear,
        academic_year,
        targetAudience,
        target_audience,
        search,
        userRole = 'Admin'
    } = filters;

    const selTournamentId = tournamentId || tournament_id;
    const selEventId = eventId || event_id;
    const selAcademicYear = academicYear || academic_year;
    const selAudience = targetAudience || target_audience;

    const conditions = [];
    const params = [];

    // Public / non-admin users should only see Published items
    if (userRole !== 'Admin') {
        conditions.push("a.status = 'Published'");
    } else if (status && status !== 'ALL') {
        conditions.push("a.status = ?");
        params.push(status);
    }

    if (category && category !== 'ALL') {
        conditions.push("a.category = ?");
        params.push(category);
    }

    if (priority && priority !== 'ALL') {
        conditions.push("a.priority = ?");
        params.push(priority);
    }

    if (selTournamentId && selTournamentId !== 'ALL') {
        conditions.push("a.tournament_id = ?");
        params.push(Number(selTournamentId));
    }

    if (selEventId && selEventId !== 'ALL') {
        conditions.push("a.event_id = ?");
        params.push(Number(selEventId));
    }

    if (selAcademicYear && selAcademicYear !== 'ALL') {
        conditions.push("a.academic_year = ?");
        params.push(selAcademicYear);
    }

    if (selAudience && selAudience !== 'ALL') {
        conditions.push("(a.target_audience = ? OR a.target_audience = 'All')");
        params.push(selAudience);
    }

    if (search && search.trim()) {
        conditions.push("(a.title LIKE ? OR a.content LIKE ? OR t.name LIKE ? OR e.name LIKE ?)");
        const s = `%${search.trim()}%`;
        params.push(s, s, s, s);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
        SELECT 
            a.announcement_id AS id,
            a.announcement_id,
            a.title,
            a.content,
            a.priority,
            a.category,
            a.target_audience,
            a.academic_year,
            a.tournament_id,
            t.name AS tournament_name,
            a.event_id,
            e.name AS event_name,
            a.target_department_id,
            d.name AS department_name,
            d.code AS department_code,
            a.scheduled_publish_time,
            a.published_at,
            a.expires_at,
            a.status,
            (a.priority = 'High' OR a.priority = 'Urgent' OR a.priority = 'CRITICAL' OR a.priority = 'IMPORTANT') AS isImportant,
            COALESCE(a.published_at, a.created_at) AS postedDate,
            a.created_at,
            u.username AS author_name,
            u.username AS author
        FROM announcements a
        LEFT JOIN users u ON a.author_user_id = u.id
        LEFT JOIN tournaments t ON a.tournament_id = t.tournament_id
        LEFT JOIN events e ON a.event_id = e.event_id
        LEFT JOIN departments d ON a.target_department_id = d.id
        ${whereClause}
        ORDER BY 
            CASE a.status
                WHEN 'Scheduled' THEN 1
                WHEN 'Published' THEN 2
                WHEN 'Draft' THEN 3
                ELSE 4
            END ASC,
            COALESCE(a.published_at, a.scheduled_publish_time, a.created_at) DESC,
            a.announcement_id DESC
    `;
    const [rows] = await pool.execute(sql, params);
    return rows.map(r => ({
        ...r,
        date: r.postedDate ? new Date(r.postedDate).toLocaleDateString() : 'Recent'
    }));
};

export const createAnnouncement = async (data) => {
    const {
        title,
        content,
        priority = 'Medium',
        category = 'General',
        target_department_id = null,
        tournament_id = null,
        event_id = null,
        academic_year = null,
        target_audience = 'All',
        scheduled_publish_time = null,
        expires_at = null,
        status: requestedStatus = null,
        author_user_id = 1
    } = data;

    let finalStatus = requestedStatus || 'Published';
    let publishedAt = null;

    if (finalStatus === 'Scheduled' && scheduled_publish_time) {
        const schedTime = new Date(scheduled_publish_time).getTime();
        if (schedTime <= Date.now()) {
            finalStatus = 'Published';
            publishedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
        }
    } else if (finalStatus === 'Published') {
        publishedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    }

    const sql = `
        INSERT INTO announcements 
            (title, content, priority, category, target_department_id, author_user_id, 
             tournament_id, event_id, academic_year, target_audience, scheduled_publish_time, 
             published_at, expires_at, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.execute(sql, [
        title,
        content,
        priority,
        category,
        target_department_id ? Number(target_department_id) : null,
        author_user_id ? Number(author_user_id) : 1,
        tournament_id ? Number(tournament_id) : null,
        event_id ? Number(event_id) : null,
        academic_year ? String(academic_year).trim() : null,
        target_audience || 'All',
        scheduled_publish_time || null,
        publishedAt,
        expires_at || null,
        finalStatus
    ]);

    addAuditEntry({
        event_category: 'ADMINISTRATIVE_MUTATION',
        eventType: 'ANNOUNCEMENT_CREATE',
        event: 'ANNOUNCEMENT_CREATE',
        module: 'Announcements',
        operation: `Created announcement '${title}' [${finalStatus}]`,
        userId: author_user_id,
        tournament_id,
        event_id,
        outcome: 'SUCCESS',
        statusCode: 201
    });

    return result.insertId;
};

export const updateAnnouncement = async (id, data) => {
    const {
        title,
        content,
        priority,
        category,
        target_department_id,
        tournament_id,
        event_id,
        academic_year,
        target_audience,
        scheduled_publish_time,
        expires_at,
        status: newStatus
    } = data;

    const [existing] = await pool.execute('SELECT * FROM announcements WHERE announcement_id = ?', [id]);
    if (!existing || existing.length === 0) {
        return false;
    }

    const current = existing[0];
    let statusToSet = newStatus !== undefined ? newStatus : current.status;
    let publishedAt = current.published_at;

    if (statusToSet === 'Scheduled' && (scheduled_publish_time || current.scheduled_publish_time)) {
        const schedTime = new Date(scheduled_publish_time || current.scheduled_publish_time).getTime();
        if (schedTime <= Date.now()) {
            statusToSet = 'Published';
            publishedAt = publishedAt || new Date().toISOString().slice(0, 19).replace('T', ' ');
        }
    } else if (statusToSet === 'Published' && !publishedAt) {
        publishedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    }

    const sql = `
        UPDATE announcements SET
            title = COALESCE(?, title),
            content = COALESCE(?, content),
            priority = COALESCE(?, priority),
            category = COALESCE(?, category),
            target_department_id = ?,
            tournament_id = ?,
            event_id = ?,
            academic_year = ?,
            target_audience = COALESCE(?, target_audience),
            scheduled_publish_time = ?,
            published_at = ?,
            expires_at = ?,
            status = ?
        WHERE announcement_id = ?
    `;

    await pool.execute(sql, [
        title !== undefined ? title : current.title,
        content !== undefined ? content : current.content,
        priority !== undefined ? priority : current.priority,
        category !== undefined ? category : current.category,
        target_department_id !== undefined ? (target_department_id ? Number(target_department_id) : null) : current.target_department_id,
        tournament_id !== undefined ? (tournament_id ? Number(tournament_id) : null) : current.tournament_id,
        event_id !== undefined ? (event_id ? Number(event_id) : null) : current.event_id,
        academic_year !== undefined ? (academic_year ? String(academic_year).trim() : null) : current.academic_year,
        target_audience !== undefined ? target_audience : current.target_audience,
        scheduled_publish_time !== undefined ? scheduled_publish_time : current.scheduled_publish_time,
        publishedAt,
        expires_at !== undefined ? expires_at : current.expires_at,
        statusToSet,
        id
    ]);

    addAuditEntry({
        event_category: 'ADMINISTRATIVE_MUTATION',
        eventType: 'ANNOUNCEMENT_UPDATE',
        event: 'ANNOUNCEMENT_UPDATE',
        module: 'Announcements',
        operation: `Updated announcement ID ${id} [${statusToSet}]`,
        outcome: 'SUCCESS',
        statusCode: 200
    });

    return true;
};

export const cancelAnnouncement = async (id, userId = null) => {
    const [result] = await pool.execute(
        "UPDATE announcements SET status = 'Cancelled' WHERE announcement_id = ? AND status = 'Scheduled'",
        [id]
    );

    if (result.affectedRows > 0) {
        addAuditEntry({
            event_category: 'ADMINISTRATIVE_MUTATION',
            eventType: 'ANNOUNCEMENT_CANCEL',
            event: 'ANNOUNCEMENT_CANCEL',
            module: 'Announcements',
            operation: `Cancelled scheduled announcement ID ${id}`,
            userId,
            outcome: 'SUCCESS',
            statusCode: 200
        });
        return true;
    }
    return false;
};

export const deleteAnnouncement = async (id, userId = null) => {
    const sql = `DELETE FROM announcements WHERE announcement_id = ?`;
    const [result] = await pool.execute(sql, [id]);

    if (result.affectedRows > 0) {
        addAuditEntry({
            event_category: 'ADMINISTRATIVE_MUTATION',
            eventType: 'ANNOUNCEMENT_DELETE',
            event: 'ANNOUNCEMENT_DELETE',
            module: 'Announcements',
            operation: `Deleted announcement ID ${id}`,
            userId,
            outcome: 'SUCCESS',
            statusCode: 200
        });
    }

    return result.affectedRows > 0;
};

