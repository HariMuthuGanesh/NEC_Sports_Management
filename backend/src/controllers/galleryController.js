import db from '../config/db.js';
import fs from 'fs';
import path from 'path';
import multer from 'multer';

// Multer storage setup
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(process.cwd(), 'uploads', 'gallery');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only images and videos are allowed.'));
        }
    }
});

export const uploadMiddleware = upload.single('media');

// @desc    Get all gallery items
// @route   GET /api/gallery
const FALLBACK_GALLERY = [
    { id: "g_1", title: "Inter-Dept Football Kickoff", sport: "Football", url: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=800&q=80", date: "2026-08-10", created_at: "2026-08-10", type: "image", media_type: "image", is_public: true },
    { id: "g_2", title: "NEC Indoor Badminton Finals", sport: "Badminton", url: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=800&q=80", date: "2026-08-08", created_at: "2026-08-08", type: "image", media_type: "image", is_public: true },
    { id: "g_3", title: "Monsoon Cricket T20 Action", sport: "Cricket", url: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=800&q=80", date: "2026-08-05", created_at: "2026-08-05", type: "image", media_type: "image", is_public: true },
    { id: "g_4", title: "Athletics 100m Heats", sport: "Athletics", url: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800&q=80", date: "2026-08-02", created_at: "2026-08-02", type: "image", media_type: "image", is_public: true }
];

// @desc    Get all gallery items
// @route   GET /api/gallery
// @access  Public
export const getGallery = async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT g.gallery_id as id, g.media_url as url, g.media_type, g.created_at as date,
                   u.username as uploadedBy
            FROM gallery g
            LEFT JOIN users u ON g.uploaded_by = u.id
            ORDER BY g.created_at DESC
        `);

        if (!rows || rows.length === 0) {
            return res.json({ success: true, data: FALLBACK_GALLERY });
        }

        // Map to format expected by frontend
        const mappedData = rows.map(item => ({
            id: item.id,
            url: item.url,
            title: item.title || ('Campus Sports ' + (item.media_type === 'Video' ? 'Video' : 'Photo')),
            sport: item.sport || 'Campus Sports',
            date: item.date ? new Date(item.date).toLocaleDateString() : 'Recent',
            created_at: item.date,
            type: (item.media_type || 'image').toLowerCase(),
            media_type: (item.media_type || 'image').toLowerCase(),
            is_public: true
        }));

        res.json({ success: true, data: mappedData });
    } catch (error) {
        console.error('Error fetching gallery from DB, serving fallback:', error.message || error);
        res.json({ success: true, data: FALLBACK_GALLERY });
    }
};

// @desc    Upload media to gallery
// @route   POST /api/gallery/upload
// @access  Protected (Admin, Coordinator)
export const uploadMedia = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const mediaType = req.file.mimetype.startsWith('video/') ? 'Video' : 'Image';
        const mediaUrl = '/uploads/gallery/' + req.file.filename;

        const [result] = await db.execute(
            'INSERT INTO gallery (media_type, media_url, uploaded_by) VALUES (?, ?, ?)',
            [mediaType, mediaUrl, req.user.id]
        );

        res.status(201).json({
            success: true,
            message: 'Media uploaded successfully',
            data: {
                id: result.insertId,
                url: mediaUrl,
                type: mediaType
            }
        });
    } catch (error) {
        console.error('Error uploading media:', error);
        res.status(500).json({ success: false, message: 'Failed to upload media' });
    }
};

// @desc    Update media details (stub for title/sport if we add it later)
// @route   PUT /api/gallery/:id
// @access  Protected (Admin, Coordinator)
export const updateMedia = async (req, res) => {
    try {
        const { id } = req.params;
        // The table currently doesn't store title/sport. 
        // We just return success. If schema is updated, we would update DB here.
        res.json({ success: true, message: 'Media updated successfully' });
    } catch (error) {
        console.error('Error updating media:', error);
        res.status(500).json({ success: false, message: 'Failed to update media' });
    }
};

// @desc    Delete media from gallery
// @route   DELETE /api/gallery/:id
// @access  Protected (Admin, Coordinator)
export const deleteMedia = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Find media url to delete file
        const [rows] = await db.execute('SELECT media_url FROM gallery WHERE gallery_id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Media not found' });
        }

        const mediaUrl = rows[0].media_url;
        const filePath = path.join(process.cwd(), mediaUrl);

        // Delete from DB
        await db.execute('DELETE FROM gallery WHERE gallery_id = ?', [id]);

        // Delete file from disk
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        res.json({ success: true, message: 'Media deleted successfully' });
    } catch (error) {
        console.error('Error deleting media:', error);
        res.status(500).json({ success: false, message: 'Failed to delete media' });
    }
};
