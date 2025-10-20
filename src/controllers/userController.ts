import { Request, Response } from 'express';
import prisma from '../config/prisma';

import jwt from "jsonwebtoken";
import crypto from 'crypto';
import bcrypt from 'bcrypt';

// Use a strong secret or asymmetric keys
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

export const createUser = async (req: Request, res: Response) => {
  try {
    const { email, username, password } = req.body;
    
    // Validasi input
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Email and password are required',
        email,
        username,
        password
      });
    }

    // Cek apakah email sudah ada
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ 
        "success": false,
        "error": 'Email has already been used',
      });
    }

    // Buat user baru
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password // NOTE: hash password terlebih dahulu untuk real-case
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
      message: 'Something went wrong..',
    });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body
    
    const searchUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!searchUser) {
      return res.status(400).json({ 
        success: false,
        error: 'Email not listed',
      });
    } else if (searchUser.password != password) {
      return res.status(400).json({
        "success": false,
        "message": "Invalid credentials",
      });
    } else if (searchUser.password == password) {
      const payload = {
        sub: email,
      };
      const access_token = jwt.sign(payload, JWT_SECRET, {
        expiresIn: '15m',
        issuer: 'secure-app',
        audience: 'secure-app-users',
        jwtid: crypto.randomUUID()
      });
      
      return res.status(201).json({
        "success": true,
        "message": "Login successfully",
        "data": access_token,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      success: false,
      message: 'Something went wrong..',
    });
  }
};
