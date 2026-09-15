import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { doubleCsrfProtection } from '../middleware/csrfMiddleware.js';
import { getGallery, uploadMedia, updateMedia, deleteMedia, uploadMiddleware } from '../controllers/galleryController.js';

const router = express.Router();

// Publicly accessible to view gallery
router.get('/', getGallery);

// CSRF protection on all state-changing routes, matching apiRoutes.js's
// convention. NOTE: this router is mounted independently in app.js
// (`app.use('/api/gallery', galleryRoutes)`) — Express routers do not share
// `.use()` middleware across separate router instances, so apiRoutes.js's
// own `router.use(doubleCsrfProtection)` never applied here. Without this,
// POST /gallery/upload, PUT /gallery/:id, and DELETE /gallery/:id were the
// only mutating endpoints in the whole API not covered by CSRF protection
// (reads the token from the X-CSRF-Token header, so it works the same
// whether placed before or after multer's uploadMiddleware).
router.use(doubleCsrfProtection);

// Admin, Coordinator, and Sports President can manage media
router.post('/upload', protect, authorize('Admin', 'Coordinator', 'Sports President', 'President'), uploadMiddleware, uploadMedia);
router.put('/:id', protect, authorize('Admin', 'Coordinator', 'Sports President', 'President'), updateMedia);
router.delete('/:id', protect, authorize('Admin', 'Coordinator', 'Sports President', 'President'), deleteMedia);

export default router;

