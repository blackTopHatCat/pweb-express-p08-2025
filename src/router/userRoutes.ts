// src/router/userRoutes.ts

import { Router } from 'express';
import {
  createUser,
  loginUser,
  getMe // Import fungsi baru
} from '../controllers/userController';
// Asumsikan middleware otentikasi ada
import { authenticateJWT } from '../middleware/authMiddleware'; 


const router = Router();

// Endpoint Public (Tanpa Auth)
router.post("/register", createUser);
router.post("/login", loginUser);

// Endpoint Private (Dengan Auth)
// Gunakan 'as any' untuk menghindari error tipe karena middleware
router.get("/me", authenticateJWT, getMe as any); 

export default router;
