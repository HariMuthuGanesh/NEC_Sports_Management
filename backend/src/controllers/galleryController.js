import db from '../config/db.js';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import crypto from 'crypto';
import { addAuditEntry } from '../services/auditStore.js';

const GALLERY_MEDIA_TYPES = new Map([
    ['image/jpeg', new Set(['.jpg', '.jpeg'])],
    ['image/png', new Set(['.png'])],
    ['image/webp', new Set(['.webp'])],
    ['image/gif', new Set(['.gif'])],
    ['video/mp4', new Set(['.mp4'])],
    ['video/webm', new Set(['.webm'])],
    ['video/quicktime', new Set(['.mov'])]
]);

const removeUploadedFile = (filePath) => {
    if (!filePath || !fs.existsSync(filePath)) return;
    try {
        fs.unlinkSync(filePath);
    } catch (error) {
        console.warn('[Gallery] Could not remove rejected upload:', error.message);
    }
};

// Multer storage setup
const getGalleryUploadsPath = () => {
    const backendPath = path.resolve(process.cwd(), 'backend', 'uploads', 'gallery');
    const directPath = path.resolve(process.cwd(), 'uploads', 'gallery');
    const target = (fs.existsSync(path.resolve(process.cwd(), 'backend')) && path.basename(process.cwd()) !== 'backend')
        ? backendPath
        : directPath;
    if (!fs.existsSync(target)) {
        fs.mkdirSync(target, { recursive: true });
    }
    return target;
};

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = getGalleryUploadsPath();
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `media-${crypto.randomUUID()}${ext}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
    fileFilter: (req, file, cb) => {
        const allowedExtensions = GALLERY_MEDIA_TYPES.get(file.mimetype);
        const extension = path.extname(file.originalname).toLowerCase();
        if (allowedExtensions?.has(extension)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only images and videos are allowed.'));
        }
    }
});

export const uploadMiddleware = upload.single('media');

function normalizeScopeInput(val) {
    if (!val || val === 'ALL' || val === 'All') return null;
    const s = String(val).trim().toLowerCase();
    return s.includes('inter') ? 'Inter-Collegiate' : 'Intramural';
}

function normalizeDepartmentsInput(val, primaryDeptId) {
    let ids = [];
    if (Array.isArray(val)) {
        ids = val.map(Number).filter(n => Number.isInteger(n) && n > 0);
    } else if (typeof val === 'string' && val.trim()) {
        try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed)) ids = parsed.map(Number).filter(n => Number.isInteger(n) && n > 0);
            else if (!isNaN(Number(val))) ids = [Number(val)];
        } catch {
            ids = val.split(',').map(s => Number(s.trim())).filter(n => Number.isInteger(n) && n > 0);
        }
    }
    if (primaryDeptId && Number.isInteger(Number(primaryDeptId)) && Number(primaryDeptId) > 0 && !ids.includes(Number(primaryDeptId))) {
        ids = [Number(primaryDeptId), ...ids];
    }
    return ids.length ? JSON.stringify(Array.from(new Set(ids))) : null;
}

function parseDateTimeString(dateStr, timeStr) {
    if (!dateStr || !String(dateStr).trim()) return null;
    const cleanDate = String(dateStr).trim();
    if (cleanDate.includes('T')) {
        const [d, t] = cleanDate.split('T');
        const cleanTime = (timeStr && String(timeStr).trim()) || t || '00:00:00';
        const formattedTime = cleanTime.length === 5 ? `${cleanTime}:00` : cleanTime.slice(0, 8);
        return `${d} ${formattedTime}`;
    }
    const cleanTime = (timeStr && String(timeStr).trim()) || '00:00:00';
    const formattedTime = cleanTime.length === 5 ? `${cleanTime}:00` : cleanTime.slice(0, 8);
    return `${cleanDate.split(' ')[0]} ${formattedTime}`;
}

async function resolveEventId(value) {
    if (value === undefined || value === null || value === '') return null;
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id < 1) {
        throw Object.assign(new Error('Select a valid event.'), { statusCode: 400 });
    }
    const [events] = await db.execute('SELECT event_id FROM events WHERE event_id=?', [id]);
    if (!events.length) throw Object.assign(new Error('Event not found.'), { statusCode: 400 });
    return id;
}

// @desc    Get all gallery items with multi-dimensional institutional filters
// @route   GET /api/gallery
// @access  Public
export const getGallery = async (req, res) => {
    try {
        const {
            tournamentId,
            tournament_id,
            eventId,
            event_id,
            sportId,
            sport_id,
            departmentId,
            department_id,
            academicYear,
            academic_year,
            mediaType,
            media_type,
            status,
            publication_status,
            scope,
            from,
            to,
            fromDate,
            from_date,
            fromTime,
            from_time,
            toDate,
            to_date,
            toTime,
            to_time,
            sortBy,
            sort_by,
            sort,
            search,
            page,
            limit
        } = req.query || {};

        const selectedTournamentId = tournamentId || tournament_id;
        const selectedEventId = eventId || event_id;
        const selectedSportId = sportId || sport_id;
        const selectedDepartmentId = departmentId || department_id;
        const selectedAcademicYear = academicYear || academic_year;
        const selectedMediaType = mediaType || media_type;
        const selectedStatus = status || publication_status;

        const conditions = [];
        const params = [];

        // 1. Scope filter
        if (scope && scope !== 'ALL' && scope !== 'all') {
            const normScope = String(scope).toLowerCase().includes('inter') ? 'Inter-Collegiate' : 'Intramural';
            conditions.push('(g.scope = ? OR (g.scope IS NULL AND (t.scope = ? OR (? = "Intramural" AND t.scope IS NULL))))');
            params.push(normScope, normScope, normScope);
        }

        // 2. Tournament filter
        if (selectedTournamentId && selectedTournamentId !== 'ALL') {
            conditions.push('(g.tournament_id = ? OR e.tournament_id = ?)');
            params.push(Number(selectedTournamentId), Number(selectedTournamentId));
        }

        // 3. Event filter
        if (selectedEventId && selectedEventId !== 'ALL') {
            conditions.push('g.event_id = ?');
            params.push(Number(selectedEventId));
        }

        // 4. Sport filter
        if (selectedSportId && selectedSportId !== 'ALL') {
            conditions.push('(g.sport_id = ? OR e.sport_id = ?)');
            params.push(Number(selectedSportId), Number(selectedSportId));
        }

        // 5. Department filter (matches primary department_id OR JSON_CONTAINS associated_departments)
        if (selectedDepartmentId && selectedDepartmentId !== 'ALL') {
            const deptNum = Number(selectedDepartmentId);
            conditions.push('(g.department_id = ? OR JSON_CONTAINS(COALESCE(g.associated_departments, "[]"), CAST(? AS JSON)))');
            params.push(deptNum, deptNum);
        }

        // 6. Academic Year filter
        if (selectedAcademicYear && selectedAcademicYear !== 'ALL') {
            conditions.push('(g.academic_year = ? OR t.academic_year = ?)');
            params.push(selectedAcademicYear, selectedAcademicYear);
        }

        // 7. Media Type filter
        if (selectedMediaType && selectedMediaType !== 'all' && selectedMediaType !== 'ALL') {
            const mType = selectedMediaType.toLowerCase() === 'video' ? 'Video' : 'Image';
            conditions.push('g.media_type = ?');
            params.push(mType);
        }

        // 8. Publication Status rule:
        // Authenticated staff may filter by status; anonymous visitors are strictly limited to 'Published'
        const isStaff = req.user && ['Admin', 'Coordinator', 'Sports President', 'President'].includes(req.user.role);
        if (!isStaff) {
            conditions.push('g.publication_status = "Published"');
        } else if (selectedStatus && selectedStatus !== 'ALL') {
            conditions.push('g.publication_status = ?');
            params.push(selectedStatus);
        }

        // 9. Custom Date & Time Range with institutional validation
        let fromDateTime = null;
        const rawFromDate = fromDate || from_date || from;
        const rawFromTime = fromTime || from_time;
        if (rawFromDate && String(rawFromDate).trim()) {
            fromDateTime = parseDateTimeString(rawFromDate, rawFromTime || '00:00:00');
        }

        let toDateTime = null;
        const rawToDate = toDate || to_date || to;
        const rawToTime = toTime || to_time;
        if (rawToDate && String(rawToDate).trim()) {
            toDateTime = parseDateTimeString(rawToDate, rawToTime || '23:59:59');
        }

        if (fromDateTime && toDateTime && new Date(fromDateTime).getTime() > new Date(toDateTime).getTime()) {
            return res.status(400).json({
                success: false,
                error: { message: 'Ending date and time cannot be earlier than starting date and time.' }
            });
        }

        if (fromDateTime) {
            conditions.push('COALESCE(g.captured_at, g.created_at) >= ?');
            params.push(fromDateTime);
        }

        if (toDateTime) {
            conditions.push('COALESCE(g.captured_at, g.created_at) <= ?');
            params.push(toDateTime);
        }

        // 10. Search query
        if (search && search.trim()) {
            conditions.push('(g.title LIKE ? OR g.caption LIKE ? OR t.name LIKE ? OR e.name LIKE ?)');
            const s = `%${search.trim()}%`;
            params.push(s, s, s, s);
        }

        // 11. Sorting
        let orderSql = 'ORDER BY COALESCE(g.captured_at, g.created_at) DESC, g.gallery_id DESC';
        const selectedSort = (sortBy || sort_by || sort || 'newest').toLowerCase();
        if (selectedSort === 'oldest') {
            orderSql = 'ORDER BY COALESCE(g.captured_at, g.created_at) ASC, g.gallery_id ASC';
        } else if (selectedSort === 'title') {
            orderSql = 'ORDER BY g.title ASC, g.gallery_id DESC';
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // 12. Optional Pagination
        let pagination = null;
        let limitClause = '';
        if (page && limit) {
            const pageNum = Math.max(1, parseInt(page, 10) || 1);
            const limitNum = Math.max(1, parseInt(limit, 10) || 20);
            const offset = (pageNum - 1) * limitNum;

            const [countRows] = await db.execute(`
                SELECT COUNT(*) as total
                FROM gallery g
                LEFT JOIN events e ON e.event_id = g.event_id
                LEFT JOIN tournaments t ON t.tournament_id = COALESCE(g.tournament_id, e.tournament_id)
                LEFT JOIN sports s ON s.sport_id = COALESCE(g.sport_id, e.sport_id)
                LEFT JOIN departments d ON d.id = g.department_id
                ${whereClause}
            `, params);

            const total = countRows[0]?.total || 0;
            pagination = {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum)
            };
            limitClause = `LIMIT ${limitNum} OFFSET ${offset}`;
        }

        const [rows] = await db.execute(`
            SELECT g.gallery_id as id,
                   g.media_url as url,
                   g.title,
                   g.caption,
                   g.media_type,
                   COALESCE(g.scope, t.scope, 'Intramural') as scope,
                   g.created_at as date,
                   g.created_at,
                   g.captured_at,
                   IF(g.captured_at IS NOT NULL, 'captured_at', 'created_at') as date_source,
                   COALESCE(g.academic_year, t.academic_year) as academic_year,
                   g.publication_status,
                   COALESCE(g.tournament_id, e.tournament_id) as tournament_id,
                   t.name as tournament_name,
                   COALESCE(t.scope, 'Intramural') as tournament_scope,
                   g.event_id,
                   e.name as event_name,
                   COALESCE(g.sport_id, e.sport_id) as sport_id,
                   COALESCE(s.name, 'Campus Sports') as sport,
                   g.department_id,
                   g.associated_departments,
                   d.name as department_name,
                   d.code as department_code,
                   u.username as uploadedBy
            FROM gallery g
            LEFT JOIN events e ON e.event_id = g.event_id
            LEFT JOIN tournaments t ON t.tournament_id = COALESCE(g.tournament_id, e.tournament_id)
            LEFT JOIN sports s ON s.sport_id = COALESCE(g.sport_id, e.sport_id)
            LEFT JOIN departments d ON d.id = g.department_id
            LEFT JOIN users u ON g.uploaded_by = u.id
            ${whereClause}
            ${orderSql}
            ${limitClause}
        `, params);

        if (!rows || rows.length === 0) {
            return res.json({ success: true, data: [], ...(pagination ? { pagination } : {}) });
        }

        // Map to format expected by frontend
        const mappedData = rows.map(item => {
            const isInter = item.scope === 'Inter-Collegiate';
            const displayScope = isInter ? 'Inter College' : 'Intra College';
            let parsedDepts = [];
            if (item.associated_departments) {
                try {
                    parsedDepts = typeof item.associated_departments === 'string'
                        ? JSON.parse(item.associated_departments)
                        : item.associated_departments;
                } catch {
                    parsedDepts = [];
                }
            }
            if (item.department_id && !parsedDepts.includes(item.department_id)) {
                parsedDepts = [item.department_id, ...parsedDepts];
            }

            const rawDate = item.captured_at || item.created_at;
            return {
                id: item.id,
                url: item.url,
                media_url: item.url,
                title: item.title || ('Campus Sports ' + (item.media_type === 'Video' ? 'Video' : 'Photo')),
                caption: item.caption || '',
                scope: item.scope || 'Intramural',
                display_scope: displayScope,
                academic_year: item.academic_year || null,
                tournament_id: item.tournament_id || null,
                tournament_name: item.tournament_name || null,
                tournament_scope: item.tournament_scope || null,
                event_id: item.event_id || null,
                event_name: item.event_name || null,
                sport_id: item.sport_id || null,
                sport: item.sport || 'Campus Sports',
                department_id: item.department_id || null,
                associated_departments: parsedDepts,
                department_name: item.department_name || null,
                department_code: item.department_code || null,
                captured_at: item.captured_at ? new Date(item.captured_at).toISOString() : null,
                date_source: item.date_source,
                publication_status: item.publication_status || 'Published',
                date: rawDate ? new Date(rawDate).toLocaleDateString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric'
                }) : 'Recent',
                time: rawDate ? new Date(rawDate).toLocaleTimeString('en-IN', {
                    hour: '2-digit', minute: '2-digit', hour12: true
                }) : '',
                created_at: item.created_at,
                type: (item.media_type || 'image').toLowerCase(),
                media_type: (item.media_type || 'image').toLowerCase(),
                uploadedBy: item.uploadedBy || 'Sports Office',
                is_public: item.publication_status === 'Published'
            };
        });

        res.json({ success: true, data: mappedData, ...(pagination ? { pagination } : {}) });
    } catch (error) {
        console.error('Error fetching gallery from DB:', error.message || error);
        return res.status(500).json({
            success: false,
            error: { message: 'Failed to load gallery. Please check the database connection.' }
        });
    }
};

// @desc    Upload media to gallery
// @route   POST /api/gallery/upload
// @access  Protected (Admin, Coordinator, Sports President)
export const uploadMedia = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: { message: 'No media file provided.' } });
        }

        const mediaType = req.file.mimetype.startsWith('video/') ? 'Video' : 'Image';
        const mediaUrl = '/uploads/gallery/' + req.file.filename;
        const title = (req.body?.title || '').trim() || (mediaType === 'Video' ? 'Campus Sports Video' : 'Campus Sports Photo');
        const caption = (req.body?.caption || '').trim() || null;
        const userId = req.user.id;
        const eventId = await resolveEventId(req.body?.event_id);
        
        let tournamentId = req.body?.tournament_id ? Number(req.body.tournament_id) : null;
        let sportId = req.body?.sport_id ? Number(req.body.sport_id) : null;
        const departmentId = req.body?.department_id ? Number(req.body.department_id) : null;
        const academicYear = req.body?.academic_year ? String(req.body.academic_year).trim() : null;
        const publicationStatus = ['Draft', 'Published', 'Archived'].includes(req.body?.publication_status)
            ? req.body.publication_status
            : 'Published';

        // Scope resolution
        let scope = normalizeScopeInput(req.body?.scope);

        // Auto-derive tournament_id, sport_id, and scope if event_id is provided
        if (eventId && (!tournamentId || !sportId || !scope)) {
            const [evRows] = await db.execute('SELECT e.tournament_id, e.sport_id, t.scope FROM events e LEFT JOIN tournaments t ON t.tournament_id = e.tournament_id WHERE e.event_id = ?', [eventId]);
            if (evRows && evRows.length > 0) {
                if (!tournamentId) tournamentId = evRows[0].tournament_id || null;
                if (!sportId) sportId = evRows[0].sport_id || null;
                if (!scope) scope = evRows[0].scope || 'Intramural';
            }
        }
        if (tournamentId && !scope) {
            const [tRows] = await db.execute('SELECT scope FROM tournaments WHERE tournament_id = ?', [tournamentId]);
            if (tRows && tRows.length > 0) {
                scope = tRows[0].scope || 'Intramural';
            }
        }
        if (!scope) scope = 'Intramural';

        // Multi-department normalization
        const rawDepts = req.body?.associated_departments || req.body?.associatedDepartments || req.body?.department_ids;
        const associatedDepartments = normalizeDepartmentsInput(rawDepts, departmentId);

        // Date and Time resolution
        const capturedDate = req.body?.captured_at || req.body?.capturedAt || req.body?.media_date;
        const capturedTime = req.body?.captured_time || req.body?.capturedTime;
        const capturedAt = parseDateTimeString(capturedDate, capturedTime);

        const [result] = await db.execute(
            `INSERT INTO gallery 
                (title, caption, media_type, media_url, uploaded_by, event_id, tournament_id, sport_id, department_id, associated_departments, academic_year, scope, captured_at, publication_status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [title, caption, mediaType, mediaUrl, userId, eventId, tournamentId, sportId, departmentId, associatedDepartments, academicYear, scope, capturedAt, publicationStatus]
        );

        addAuditEntry({
            event_category: 'ADMINISTRATIVE_MUTATION',
            eventType: 'GALLERY_UPLOAD',
            event: 'GALLERY_UPLOAD',
            module: 'Gallery',
            operation: `Uploaded media '${title}' [${mediaType}]`,
            userId,
            role: req.user?.role,
            tournament_id: tournamentId,
            event_id: eventId,
            outcome: 'SUCCESS',
            ipAddress: req.ip,
            route: req.originalUrl,
            method: req.method,
            statusCode: 201
        });

        res.status(201).json({
            success: true,
            message: 'Media uploaded successfully',
            data: {
                id: result.insertId,
                title,
                caption,
                event_id: eventId,
                tournament_id: tournamentId,
                sport_id: sportId,
                department_id: departmentId,
                associated_departments: associatedDepartments ? JSON.parse(associatedDepartments) : [],
                academic_year: academicYear,
                scope,
                captured_at: capturedAt,
                publication_status: publicationStatus,
                url: mediaUrl,
                type: mediaType.toLowerCase(),
                media_type: mediaType.toLowerCase()
            }
        });
    } catch (error) {
        removeUploadedFile(req.file?.path);
        console.error('Error uploading media:', error);
        res.status(error.statusCode || 500).json({ success: false, error: { message: error.statusCode === 400 ? error.message : 'Failed to upload media.' } });
    }
};

// @desc    Update media details
// @route   PUT /api/gallery/:id
// @access  Protected (Admin, Coordinator, Sports President)
export const updateMedia = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            title,
            caption,
            tournament_id,
            sport_id,
            department_id,
            associated_departments,
            associatedDepartments,
            department_ids,
            academic_year,
            scope,
            captured_at,
            captured_time,
            publication_status
        } = req.body || {};

        const [rows] = await db.execute('SELECT * FROM gallery WHERE gallery_id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: { message: 'Media item not found.' } });
        }

        const current = rows[0];
        let eventId = current.event_id;
        if (Object.hasOwn(req.body || {}, 'event_id')) {
            eventId = await resolveEventId(req.body.event_id);
        }

        let newTournamentId = tournament_id !== undefined ? (tournament_id ? Number(tournament_id) : null) : current.tournament_id;
        let newSportId = sport_id !== undefined ? (sport_id ? Number(sport_id) : null) : current.sport_id;
        const newDeptId = department_id !== undefined ? (department_id ? Number(department_id) : null) : current.department_id;
        const newYear = academic_year !== undefined ? (academic_year ? String(academic_year).trim() : null) : current.academic_year;

        let newScope = scope !== undefined ? normalizeScopeInput(scope) : current.scope;
        if (!newScope && newTournamentId) {
            const [tRows] = await db.execute('SELECT scope FROM tournaments WHERE tournament_id = ?', [newTournamentId]);
            if (tRows.length) newScope = tRows[0].scope;
        }

        const rawDepts = associated_departments !== undefined ? associated_departments : (associatedDepartments !== undefined ? associatedDepartments : department_ids);
        let newAssociatedDepts = current.associated_departments;
        if (rawDepts !== undefined) {
            newAssociatedDepts = normalizeDepartmentsInput(rawDepts, newDeptId);
        }

        let newCapturedAt = current.captured_at;
        if (captured_at !== undefined) {
            newCapturedAt = parseDateTimeString(captured_at, captured_time);
        }

        const newStatus = ['Draft', 'Published', 'Archived'].includes(publication_status) ? publication_status : current.publication_status;
        const newTitle = title !== undefined ? String(title).trim() : current.title;
        const newCaption = caption !== undefined ? String(caption).trim() : current.caption;

        if (eventId && (!newTournamentId || !newSportId)) {
            const [evRows] = await db.execute('SELECT tournament_id, sport_id FROM events WHERE event_id = ?', [eventId]);
            if (evRows && evRows.length > 0) {
                if (!newTournamentId) newTournamentId = evRows[0].tournament_id || null;
                if (!newSportId) newSportId = evRows[0].sport_id || null;
            }
        }

        await db.execute(
            `UPDATE gallery SET 
                title = ?, caption = ?, event_id = ?, tournament_id = ?, sport_id = ?, 
                department_id = ?, associated_departments = ?, academic_year = ?, scope = ?, captured_at = ?, publication_status = ? 
             WHERE gallery_id = ?`,
            [newTitle, newCaption, eventId, newTournamentId, newSportId, newDeptId, newAssociatedDepts, newYear, newScope, newCapturedAt, newStatus, id]
        );

        addAuditEntry({
            event_category: 'ADMINISTRATIVE_MUTATION',
            eventType: 'GALLERY_UPDATE',
            event: 'GALLERY_UPDATE',
            module: 'Gallery',
            operation: `Updated media ID ${id}: '${newTitle}'`,
            userId: req.user?.id,
            role: req.user?.role,
            tournament_id: newTournamentId,
            event_id: eventId,
            outcome: 'SUCCESS',
            ipAddress: req.ip,
            route: req.originalUrl,
            method: req.method,
            statusCode: 200
        });

        return res.json({
            success: true,
            data: {
                id: Number(id),
                title: newTitle,
                caption: newCaption,
                event_id: eventId,
                tournament_id: newTournamentId,
                sport_id: newSportId,
                department_id: newDeptId,
                associated_departments: newAssociatedDepts ? JSON.parse(newAssociatedDepts) : [],
                academic_year: newYear,
                scope: newScope,
                captured_at: newCapturedAt,
                publication_status: newStatus
            },
            message: 'Gallery item updated successfully.'
        });
    } catch (error) {
        console.error('Error updating media:', error);
        res.status(error.statusCode || 500).json({ success: false, error: { message: error.statusCode === 400 ? error.message : 'Failed to update media.' } });
    }
};

// @desc    Delete media from gallery
// @route   DELETE /api/gallery/:id
// @access  Protected (Admin, Coordinator, Sports President)
export const deleteMedia = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Find media url to delete file
        const [rows] = await db.execute('SELECT * FROM gallery WHERE gallery_id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: { message: 'Media not found.' } });
        }

        const mediaItem = rows[0];
        const mediaUrl = mediaItem.media_url;
        
        // Delete from DB
        await db.execute('DELETE FROM gallery WHERE gallery_id = ?', [id]);

        addAuditEntry({
            event_category: 'ADMINISTRATIVE_MUTATION',
            eventType: 'GALLERY_DELETE',
            event: 'GALLERY_DELETE',
            module: 'Gallery',
            operation: `Deleted media ID ${id}: '${mediaItem.title}'`,
            userId: req.user?.id,
            role: req.user?.role,
            tournament_id: mediaItem.tournament_id,
            event_id: mediaItem.event_id,
            outcome: 'SUCCESS',
            ipAddress: req.ip,
            route: req.originalUrl,
            method: req.method,
            statusCode: 200
        });

        // If stored in local /uploads/gallery/, remove from disk safely
        if (mediaUrl && mediaUrl.startsWith('/uploads/gallery/')) {
            const fileName = path.basename(mediaUrl);
            const uploadDir = getGalleryUploadsPath();
            const filePath = path.join(uploadDir, fileName);
            if (fs.existsSync(filePath)) {
                try {
                    fs.unlinkSync(filePath);
                } catch (unlinkErr) {
                    console.warn('[Gallery] Could not unlink file:', filePath, unlinkErr.message);
                }
            }
        }

        res.json({ success: true, message: 'Media deleted successfully' });
    } catch (error) {
        console.error('Error deleting media:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to delete media.' } });
    }
};
