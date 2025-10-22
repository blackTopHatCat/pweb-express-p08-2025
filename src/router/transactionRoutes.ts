// src/router/transactionRoutes.ts

import { Router } from 'express';
// Import middleware autentikasi JWT
import { authenticateJWT } from '../middleware/authMiddleware'; 
import {
  createTransaction,
  getAllTransactions,
  getTransactionDetail, // Ini adalah fungsi yang diperlukan
  getTransactionStatistics,
} from '../controllers/transactionController'; 

const router = Router();

// Middleware: Semua endpoint di bawah ini memerlukan JWT yang valid
// Menggunakan authenticateJWT akan menambahkan user ID ke objek req.
router.use(authenticateJWT); 

// Endpoint Transaksi
// 1. POST: Membuat transaksi baru (Checkout)
router.post('/', createTransaction as any); 

// 2. GET: Mendapatkan daftar semua transaksi untuk user yang sedang login (History)
router.get('/', getAllTransactions as any);

// 3. GET: Mendapatkan statistik transaksi (Biasanya untuk Admin/Dashboard)
router.get('/statistics', getTransactionStatistics as any);

// 4. GET: Mendapatkan detail transaksi spesifik berdasarkan ID
// Parameter :order_id digunakan untuk mencari detail transaksi tertentu.
router.get('/:order_id', getTransactionDetail as any); 


export default router;
