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
            from,
            to,
            search
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

        if (selectedTournamentId && selectedTournamentId !== 'ALL') {
            conditions.push('(g.tournament_id = ? OR e.tournament_id = ?)');
            params.push(Number(selectedTournamentId), Number(selectedTournamentId));
        }

        if (selectedEventId && selectedEventId !== 'ALL') {
            conditions.push('g.event_id = ?');
            params.push(Number(selectedEventId));
        }

        if (selectedSportId && selectedSportId !== 'ALL') {
            conditions.push('(g.sport_id = ? OR e.sport_id = ?)');
            params.push(Number(selectedSportId), Number(selectedSportId));
        }

        if (selectedDepartmentId && selectedDepartmentId !== 'ALL') {
            conditions.push('g.department_id = ?');
            params.push(Number(selectedDepartmentId));
        }

        if (selectedAcademicYear && selectedAcademicYear !== 'ALL') {
            conditions.push('(g.academic_year = ? OR t.academic_year = ?)');
            params.push(selectedAcademicYear, selectedAcademicYear);
        }

        if (selectedMediaType && selectedMediaType !== 'all' && selectedMediaType !== 'ALL') {
            const mType = selectedMediaType.toLowerCase() === 'video' ? 'Video' : 'Image';
            conditions.push('g.media_type = ?');
            params.push(mType);
        }

        if (selectedStatus && selectedStatus !== 'ALL') {
            conditions.push('g.publication_status = ?');
            params.push(selectedStatus);
        }

        if (from) {
            conditions.push('COALESCE(g.captured_at, DATE(g.created_at)) >= ?');
            params.push(from);
        }

        if (to) {
            conditions.push('COALESCE(g.captured_at, DATE(g.created_at)) <= ?');
            params.push(to);
        }

        if (search && search.trim()) {
            conditions.push('(g.title LIKE ? OR g.caption LIKE ? OR t.name LIKE ? OR e.name LIKE ?)');
            const s = `%${search.trim()}%`;
            params.push(s, s, s, s);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const [rows] = await db.execute(`
            SELECT g.gallery_id as id,
                   g.media_url as url,
                   g.title,
                   g.caption,
                   g.media_type,
                   g.created_at as date,
                   g.created_at,
                   g.captured_at,
                   COALESCE(g.academic_year, t.academic_year) as academic_year,
                   g.publication_status,
                   COALESCE(g.tournament_id, e.tournament_id) as tournament_id,
                   t.name as tournament_name,
                   g.event_id,
                   e.name as event_name,
                   COALESCE(g.sport_id, e.sport_id) as sport_id,
                   COALESCE(s.name, 'Campus Sports') as sport,
                   g.department_id,
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
            ORDER BY COALESCE(g.captured_at, g.created_at) DESC, g.gallery_id DESC
        `, params);

        if (!rows || rows.length === 0) {
            return res.json({ success: true, data: [] });
        }

        // Map to format expected by frontend
        const mappedData = rows.map(item => ({
            id: item.id,
            url: item.url,
            media_url: item.url,
            title: item.title || ('Campus Sports ' + (item.media_type === 'Video' ? 'Video' : 'Photo')),
            caption: item.caption || '',
            academic_year: item.academic_year || null,
            tournament_id: item.tournament_id || null,
            tournament_name: item.tournament_name || null,
            event_id: item.event_id || null,
            event_name: item.event_name || null,
            sport_id: item.sport_id || null,
            sport: item.sport || 'Campus Sports',
            department_id: item.department_id || null,
            department_name: item.department_name || null,
            department_code: item.department_code || null,
            captured_at: item.captured_at ? new Date(item.captured_at).toISOString().slice(0, 10) : null,
            publication_status: item.publication_status || 'Published',
            date: item.captured_at 
                ? new Date(item.captured_at).toLocaleDateString() 
                : (item.date ? new Date(item.date).toLocaleDateString() : 'Recent'),
            created_at: item.created_at,
            type: (item.media_type || 'image').toLowerCase(),
            media_type: (item.media_type || 'image').toLowerCase(),
            uploadedBy: item.uploadedBy || 'Sports Office',
            is_public: item.publication_status === 'Published'
        }));

        res.json({ success: true, data: mappedData });
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
        const capturedAt = req.body?.captured_at ? String(req.body.captured_at).trim() : null;
        const publicationStatus = ['Draft', 'Published', 'Archived'].includes(req.body?.publication_status)
            ? req.body.publication_status
            : 'Published';

        // Auto-derive tournament_id and sport_id if event_id is provided
        if (eventId && (!tournamentId || !sportId)) {
            const [evRows] = await db.execute('SELECT tournament_id, sport_id FROM events WHERE event_id = ?', [eventId]);
            if (evRows && evRows.length > 0) {
                if (!tournamentId) tournamentId = evRows[0].tournament_id || null;
                if (!sportId) sportId = evRows[0].sport_id || null;
            }
        }

        const [result] = await db.execute(
            `INSERT INTO gallery 
                (title, caption, media_type, media_url, uploaded_by, event_id, tournament_id, sport_id, department_id, academic_year, captured_at, publication_status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [title, caption, mediaType, mediaUrl, userId, eventId, tournamentId, sportId, departmentId, academicYear, capturedAt, publicationStatus]
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
                academic_year: academicYear,
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
            academic_year,
            captured_at,
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
        const newCapturedAt = captured_at !== undefined ? (captured_at ? String(captured_at).trim() : null) : current.captured_at;
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
                department_id = ?, academic_year = ?, captured_at = ?, publication_status = ? 
             WHERE gallery_id = ?`,
            [newTitle, newCaption, eventId, newTournamentId, newSportId, newDeptId, newYear, newCapturedAt, newStatus, id]
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
                academic_year: newYear,
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
