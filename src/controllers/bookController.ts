// src/controllers/bookController.ts

import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { Prisma } from '@prisma/client'; // Wajib untuk tipe data: Decimal, BookWhereInput, BookUpdateInput

// --- CREATE ---
export const createBook = async (req: Request, res: Response) => {
    try {
        const { title, writer, publisher, publication_year, description, price, stock_quantity, genre_id } = req.body;
        
        // Validasi input wajib
        if (!title || !writer || !publisher || !publication_year || !price || stock_quantity === undefined || !genre_id) {
            return res.status(400).json({ success: false, message: 'All required fields must be provided.' });
        }
        
        // Validasi nilai
        if (price <= 0 || stock_quantity < 0 || typeof publication_year !== 'number') {
            return res.status(400).json({ success: false, message: 'Invalid price, stock quantity, or publication year.' });
        }

        // Cek apakah Genre ada dan belum dihapus (soft deleted)
        const genreExists = await prisma.genre.findUnique({ where: { id: genre_id, deleted_at: null } });
        if (!genreExists) {
            return res.status(404).json({ success: false, message: 'Genre not found.' });
        }

        const book = await prisma.book.create({
            data: {
                title, writer, publisher, publication_year, description, genre_id,
                // Gunakan new Prisma.Decimal untuk tipe data Decimal
                price: new Prisma.Decimal(price),
                stock_quantity: parseInt(stock_quantity),
            },
            include: { genre: true }
        });
        res.status(201).json({ success: true, message: 'Book created successfully.', data: book });
    } catch (error: any) {
        // Handle error unique constraint (P2002)
        if (error.code === 'P2002') return res.status(409).json({ success: false, message: 'Book with this title already exists.' });
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to create book.' });
    }
};

// --- READ ALL (with Pagination and Filter) ---
export const getAllBook = async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 10, title, genreId } = req.query;
        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);

        const where: Prisma.BookWhereInput = {
            deleted_at: null,
            title: title ? { contains: title as string, mode: 'insensitive' } : undefined,
            genre_id: genreId ? (genreId as string) : undefined,
        };

        const totalItems = await prisma.book.count({ where });
        const books = await prisma.book.findMany({
            where,
            skip: (pageNum - 1) * limitNum,
            take: limitNum,
            include: { genre: true },
            orderBy: { created_at: 'desc' } // Sorting berdasarkan tanggal terbaru
        });
        
        res.status(200).json({
            success: true,
            pagination: {
                totalItems,
                totalPages: Math.ceil(totalItems / limitNum),
                currentPage: pageNum,
                itemsPerPage: limitNum,
            },
            data: books
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to fetch books.' });
    }
};

// --- READ DETAIL ---
export const getBookDetail = async (req: Request, res: Response) => {
    try {
        const { book_id } = req.params;
        const book = await prisma.book.findUnique({ 
            where: { id: book_id, deleted_at: null },
            include: { genre: true } 
        });
        if (!book) return res.status(404).json({ success: false, message: 'Book not found.' });
        res.status(200).json({ success: true, data: book });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to fetch book detail.' });
    }
};

// --- READ BY GENRE ---
export const getBookByGenre = async (req: Request, res: Response) => {
    try {
        const { genre_id } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);

        const where: Prisma.BookWhereInput = {
            deleted_at: null,
            genre_id: genre_id,
        };

        const totalItems = await prisma.book.count({ where });
        const books = await prisma.book.findMany({
            where,
            skip: (pageNum - 1) * limitNum,
            take: limitNum,
            include: { genre: true },
            orderBy: { created_at: 'desc' }
        });
        
        res.status(200).json({
            success: true,
            pagination: {
                totalItems,
                totalPages: Math.ceil(totalItems / limitNum),
                currentPage: pageNum,
                itemsPerPage: limitNum,
            },
            data: books
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to fetch books by genre.' });
    }
};

// --- UPDATE ---
export const updateBook = async (req: Request, res: Response) => {
    try {
        const { book_id } = req.params;
        const { title, writer, publisher, publication_year, description, price, stock_quantity, genre_id } = req.body;

        const updateData: Prisma.BookUpdateInput = {};
        if (title) updateData.title = title;
        if (writer) updateData.writer = writer;
        if (publisher) updateData.publisher = publisher;
        if (publication_year) updateData.publication_year = publication_year;
        if (description) updateData.description = description;
        // Pastikan harga menggunakan Decimal
        if (price) updateData.price = new Prisma.Decimal(price); 
        if (stock_quantity !== undefined) updateData.stock_quantity = parseInt(stock_quantity);
        
        // Menggunakan syntax relasi 'connect'
        if (genre_id) {
            const genreExists = await prisma.genre.findUnique({ where: { id: genre_id, deleted_at: null } });
            if (!genreExists) return res.status(404).json({ success: false, message: 'Genre not found.' });
            
            // Mengupdate Foreign Key melalui relasi
            updateData.genre = { connect: { id: genre_id } }; 
        }

        // Cek apakah ada data yang akan diupdate
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ success: false, message: 'No update data provided.' });
        }

        const book = await prisma.book.update({
            where: { id: book_id, deleted_at: null },
            data: updateData
        });
        res.status(200).json({ success: true, message: 'Book updated successfully.', data: book });
    } catch (error: any) {
        if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'Book not found.' });
        if (error.code === 'P2002') return res.status(409).json({ success: false, message: 'Book with this title already exists.' });
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to update book.' });
    }
};

// --- DELETE (Soft Delete) ---
export const deleteBook = async (req: Request, res: Response) => {
    try {
        const { book_id } = req.params;
        
        // Soft Delete (mengatur deleted_at ke waktu saat ini)
        const book = await prisma.book.update({
            where: { id: book_id, deleted_at: null },
            data: { deleted_at: new Date() }
        });

        // Periksa apakah buku ditemukan sebelum dihapus
        if (!book) return res.status(404).json({ success: false, message: 'Book not found.' });
        
        res.status(200).json({ success: true, message: 'Book deleted successfully (soft deleted). Purchase history retained.' });
    } catch (error: any) {
        if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'Book not found.' });
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to delete book.' });
    }
};
