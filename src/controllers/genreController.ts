// src/controllers/genreController.ts

import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { Prisma } from '@prisma/client'; // IMPORT INI PENTING UNTUK TIPE WHERE

// --- CREATE GENRE ---
export const createGenre = async (req: Request, res: Response) => {
    try {
        const { name } = req.body;
        
        if (!name) {
            return res.status(400).json({ success: false, message: 'Genre name is required.' });
        }
        
        const genre = await prisma.genre.create({
            data: { name }
        });

        res.status(201).json({ success: true, message: 'Genre created successfully.', data: genre });
    } catch (error: any) {
        // P2002: Unique constraint failed
        if (error.code === 'P2002') return res.status(409).json({ success: false, message: 'Genre name already exists.' });
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to create genre.' });
    }
};

// --- READ ALL GENRE ---
export const getAllGenre = async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);

        // FIX TS7018: Mendefinisikan tipe secara eksplisit
        const where: Prisma.GenreWhereInput = { deleted_at: null }; 

        const totalItems = await prisma.genre.count({ where });
        const genres = await prisma.genre.findMany({
            where,
            skip: (pageNum - 1) * limitNum,
            take: limitNum,
            orderBy: { name: 'asc' }
        });

        res.status(200).json({
            success: true,
            pagination: {
                totalItems,
                totalPages: Math.ceil(totalItems / limitNum),
                currentPage: pageNum,
                itemsPerPage: limitNum,
            },
            data: genres
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to fetch genres.' });
    }
};

// --- READ GENRE DETAIL ---
export const getGenreDetail = async (req: Request, res: Response) => {
    try {
        const { genre_id } = req.params;
        const genre = await prisma.genre.findUnique({ 
            // FIX: Tidak perlu variabel 'where' terpisah jika dimasukkan langsung
            where: { id: genre_id, deleted_at: null },
            include: { books: { where: { deleted_at: null } } } // Opsional: tampilkan buku yang belum dihapus
        });
        
        if (!genre) return res.status(404).json({ success: false, message: 'Genre not found.' });
        
        res.status(200).json({ success: true, data: genre });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to fetch genre detail.' });
    }
};

// --- UPDATE GENRE ---
export const updateGenre = async (req: Request, res: Response) => {
    try {
        const { genre_id } = req.params;
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: 'New genre name is required.' });
        }
        
        const genre = await prisma.genre.update({
            where: { id: genre_id, deleted_at: null },
            data: { name }
        });

        res.status(200).json({ success: true, message: 'Genre updated successfully.', data: genre });
    } catch (error: any) {
        if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'Genre not found.' });
        if (error.code === 'P2002') return res.status(409).json({ success: false, message: 'Genre name already exists.' });
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to update genre.' });
    }
};

// --- DELETE GENRE (Soft Delete) ---
export const deleteGenre = async (req: Request, res: Response) => {
    try {
        const { genre_id } = req.params;
        
        // 1. Cek apakah ada buku yang masih aktif menggunakan genre ini
        const whereBook: Prisma.BookWhereInput = { genre_id: genre_id, deleted_at: null }; // FIX TS7018
        const activeBooks = await prisma.book.count({
            where: whereBook
        });

        if (activeBooks > 0) {
            return res.status(400).json({ 
                success: false, 
                message: `Cannot delete genre. ${activeBooks} active books are still associated with this genre.` 
            });
        }
        
        // 2. Lakukan Soft Delete (jika tidak ada buku aktif)
        const genre = await prisma.genre.update({
            where: { id: genre_id, deleted_at: null },
            data: { deleted_at: new Date() }
        });

        if (!genre) return res.status(404).json({ success: false, message: 'Genre not found.' });

        res.status(200).json({ success: true, message: 'Genre deleted successfully (soft deleted).' });
    } catch (error: any) {
        if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'Genre not found.' });
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to delete genre.' });
    }
};
