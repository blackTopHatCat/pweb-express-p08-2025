// src/middleware/authMiddleware.ts

import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import crypto from 'crypto';

// Use a strong secret or asymmetric keys
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

// Definisikan tipe untuk Request yang sudah diautentikasi
// Kita menambahkan properti user ke Request Express
export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
        username: string;
    };
}

export const authenticateJWT = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // 1. Ambil token dari header Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ success: false, message: 'Authorization header missing.' });
    }

    // Format: "Bearer <token>"
    const token = authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Bearer token missing.' });
    }

    // 2. Verifikasi token
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

        // Cek apakah payload memiliki data user yang kita butuhkan
        if (!decoded.id || !decoded.email || !decoded.username) {
             return res.status(403).json({ success: false, message: 'Invalid token structure.' });
        }
        
        // 3. Tambahkan data user ke objek request
        req.user = {
            id: decoded.id,
            email: decoded.email,
            username: decoded.username,
        };
        
        // Lanjut ke handler rute berikutnya
        next();
    } catch (error: any) {
        // Handle JWT errors (expired, signature mismatch, etc.)
        if (error.name === 'TokenExpiredError') {
             return res.status(401).json({ success: false, message: 'Token has expired.' });
        }
        if (error.name === 'JsonWebTokenError') {
             return res.status(403).json({ success: false, message: 'Invalid token.' });
        }
        
        console.error("JWT Authentication Error:", error);
        return res.status(500).json({ success: false, message: 'Failed to authenticate token.' });
    }
};
