import { Router } from 'express';
import {
    createBook,
    getAllBook,
    getBookDetail,
    getBookByGenre,
    updateBook,
    deleteBook
} from '../controllers/bookController';
// Asumsikan Anda mengimpor middleware dengan benar
import { authenticateJWT } from '../middleware/authMiddleware'; 

const router = Router();

// Routes yang memerlukan otentikasi (CRUD)
// Kita menggunakan 'as any' untuk sementara mengatasi masalah Type Overload Express/Middleware
router.post('/', authenticateJWT, createBook as any); 
router.patch('/:book_id', authenticateJWT, updateBook as any); 
router.delete('/:book_id', authenticateJWT, deleteBook as any); 

// Routes publik (READ)
router.get('/', getAllBook);
router.get('/genre/:genre_id', getBookByGenre);
router.get('/:book_id', getBookDetail);

export default router;