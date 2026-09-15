import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { getGallery, uploadMedia, updateMedia, deleteMedia, uploadMiddleware } from '../controllers/galleryController.js';

const router = express.Router();

// Publicly accessible to view gallery
router.get('/', getGallery);

// Admin, Coordinator, and Sports President can manage media
router.post('/upload', protect, authorize('Admin', 'Coordinator', 'Sports President', 'President'), uploadMiddleware, uploadMedia);
router.put('/:id', protect, authorize('Admin', 'Coordinator', 'Sports President', 'President'), updateMedia);
router.delete('/:id', protect, authorize('Admin', 'Coordinator', 'Sports President', 'President'), deleteMedia);

export default router;
