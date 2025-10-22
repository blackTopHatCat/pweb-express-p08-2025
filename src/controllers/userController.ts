// src/controllers/userController.ts

import { Request, Response } from 'express';
import prisma from '../config/prisma';

import jwt from "jsonwebtoken";
import crypto from 'crypto';
// Import type untuk AuthenticatedRequest
import { AuthenticatedRequest } from '../middleware/authMiddleware'; 

// NOTE: JWT_SECRET ini juga digunakan di authMiddleware.ts
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');


// --- REGISTER ---
export const createUser = async (req: Request, res: Response) => {
  try {
    const { email, username, password } = req.body;
    
    // Validasi input
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Email and password are required',
      });
    }

    // Cek apakah email sudah ada
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({ // 409 Conflict
        "success": false,
        "message": 'Email has already been used',
      });
    }

    // Buat user baru
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password // NOTE: Hash password terlebih dahulu untuk production
      },
      select: {
        id: true,
        email: true,
        username: true,
        created_at: true,
        updated_at: true,
      }
    });

    res.status(201).json({
      "success": true,
      "message": 'User registered successfully',
      data: user
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to register user.',
    });
  }
};

// --- LOGIN ---
export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body
    
    // Validasi input
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Email and password are required',
      });
    }

    const searchUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!searchUser) {
      return res.status(404).json({ // 404 Not Found
        success: false,
        message: 'User with this email not found.',
      });
    } 
    
    // NOTE: Dalam kasus nyata, gunakan bcrypt.compare(password, searchUser.password)
    if (searchUser.password !== password) {
      return res.status(401).json({ // 401 Unauthorized
        "success": false,
        "message": "Invalid credentials",
      });
    }
    
    // Beri token JWT
    const payload = {
      id: searchUser.id,
      email: searchUser.email,
      username: searchUser.username
    };
    
    const access_token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: '2h', // Token berlaku 2 jam
      issuer: 'secure-app',
      audience: 'secure-app-users',
      jwtid: crypto.randomUUID()
    });
    
    return res.status(200).json({
      "success": true,
      "message": "Login successful.",
      "data": {
        "id": searchUser.id,
        "email": searchUser.email,
        "username": searchUser.username,
        "access_token": access_token
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Failed to login.',
    });
  }
};


// --- GET ME (Mendapatkan Profil Pengguna) ---
// Menggunakan AuthenticatedRequest karena rute ini dilindungi oleh middleware JWT
export const getMe = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        
        if (!userId) {
            // Ini seharusnya ditangani oleh middleware, tapi sebagai fail-safe
            return res.status(401).json({ success: false, message: 'Unauthorized.' });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                username: true,
                created_at: true,
                updated_at: true,
            }
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User profile not found.' });
        }

        res.status(200).json({ success: true, data: user });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to retrieve user profile.' });
    }
}
