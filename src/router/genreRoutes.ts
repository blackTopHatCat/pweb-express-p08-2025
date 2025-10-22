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

// Endpoint Genre (Akan digabungkan dengan prefix /genre di index.ts)

// READ ALL (GET /genre) - Public
router.get('/', getAllGenre);

// READ DETAIL (GET /genre/:genre_id) - Public
router.get('/:genre_id', getGenreDetail);

// --- ROUTES BERKREDEBIAL (Hanya Admin) ---

// CREATE (POST /genre)
router.post('/', authenticateJWT, createGenre as any); 

// UPDATE (PATCH /genre/:genre_id)
router.patch('/:genre_id', authenticateJWT, updateGenre as any);

// DELETE (DELETE /genre/:genre_id)
router.delete('/:genre_id', authenticateJWT, deleteGenre as any);

export default router;
