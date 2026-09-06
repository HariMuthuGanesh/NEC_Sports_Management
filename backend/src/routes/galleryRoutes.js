import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { getGallery, uploadMedia, updateMedia, deleteMedia, uploadMiddleware } from '../controllers/galleryController.js';

const router = express.Router();

// Publicly accessible to view gallery
router.get('/', getGallery);

// Admin and Coordinator only for modifying
router.post('/upload', protect, authorize('Admin', 'Coordinator'), uploadMiddleware, uploadMedia);
router.put('/:id', protect, authorize('Admin', 'Coordinator'), updateMedia);
router.delete('/:id', protect, authorize('Admin', 'Coordinator'), deleteMedia);

export default router;
