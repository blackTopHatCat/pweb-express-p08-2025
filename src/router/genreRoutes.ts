// src/router/genreRoutes.ts

import { Router } from 'express';
import {
  createGenre,
  getAllGenre,
  getGenreDetail,
  updateGenre,
  deleteGenre,
} from '../controllers/genreController';
import { authenticateJWT } from '../middleware/authMiddleware';

const router = Router();

// Endpoint Genre (Diasumsikan hanya admin yang dapat memodifikasi, tetapi semua dapat melihat)

// READ ALL (Public)
router.get('/', getAllGenre);
// READ DETAIL (Public)
router.get('/:genre_id', getGenreDetail);

// CREATE, UPDATE, DELETE (Hanya boleh diakses user terotentikasi, asumsikan ini role admin)
router.post('/', authenticateJWT, createGenre as any);
router.patch('/:genre_id', authenticateJWT, updateGenre as any);
router.delete('/:genre_id', authenticateJWT, deleteGenre as any);

export default router;
