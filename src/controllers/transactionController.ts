// src/controllers/transactionController.ts

import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { Prisma } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

// --- CREATE TRANSACTION (Checkout) ---
export const createTransaction = async (req: AuthenticatedRequest, res: Response) => {
    // Memastikan user ID tersedia dari AuthenticatedRequest
    const user_id = req.user?.id; 

    if (!user_id) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    // items: [{ book_id: string, quantity: number }]
    const { items } = req.body; 

    if (!items || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Transaction must contain at least one item.' });
    }

    try {
        // 1. Ambil semua data buku yang relevan & cek stok
        const bookIds = items.map((item: any) => item.book_id);
        const books = await prisma.book.findMany({
            where: {
                id: { in: bookIds },
                deleted_at: null,
            },
        });

        if (books.length !== bookIds.length) {
            return res.status(404).json({ success: false, message: 'One or more books were not found or deleted.' });
        }

        let total_price = new Prisma.Decimal(0);
        const orderItemsData: any[] = [];
        const stockUpdates: { id: string; newStock: number }[] = [];

        // 2. Kalkulasi, Cek Stok, dan Persiapan Data
        for (const item of items) {
            const book = books.find(b => b.id === item.book_id);
            const quantity = parseInt(item.quantity);

            // Cek ketersediaan buku dan stok
            if (!book || quantity <= 0) {
                return res.status(400).json({ success: false, message: `Invalid item or quantity for book ID: ${item.book_id}` });
            }
            if (book.stock_quantity < quantity) {
                return res.status(400).json({ success: false, message: `Insufficient stock for book: ${book.title}. Available: ${book.stock_quantity}` });
            }

            const subtotal = book.price.mul(quantity);
            total_price = total_price.add(subtotal);

            // Data item order, order_id akan ditambahkan setelah Order dibuat (Lihat bagian 3)
            orderItemsData.push({
                book_id: book.id,
                quantity: quantity,
                subtotal: subtotal, // Menyimpan subtotal per item
            });

            // Data untuk mengurangi stok
            stockUpdates.push({
                id: book.id,
                newStock: book.stock_quantity - quantity,
            });
        }

        // 3. Eksekusi Transaksi Database (Transactional Write)
        const result = await prisma.$transaction(async (tx) => {
            // A. Buat Order (Transaksi Induk)
            const newOrder = await tx.order.create({
                data: { 
                    user_id,
                    total_price: total_price, // Simpan total harga di tabel Order
                },
                select: { id: true }
            });

            const order_id = newOrder.id;

            // B. Tambahkan order_id ke setiap item
            const finalOrderItemsData = orderItemsData.map(item => ({
                ...item,
                order_id: order_id, // <<< PERBAIKAN KRITIS DI SINI
            }));

            // C. Buat Order Items (Detail Transaksi)
            await tx.orderItem.createMany({
                data: finalOrderItemsData as Prisma.OrderItemCreateManyInput[]
            });

            // D. Kurangi Stok Buku
            for (const update of stockUpdates) {
                await tx.book.update({
                    where: { id: update.id },
                    data: { stock_quantity: update.newStock }
                });
            }

            return newOrder;
        });

        // 4. Response Sukses
        const fullOrder = await prisma.order.findUnique({
            where: { id: result.id },
            include: { 
                items: {
                    include: { book: { select: { title: true, price: true } } }
                }
            }
        });

        res.status(201).json({ success: true, message: 'Transaction successful.', data: fullOrder });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Transaction failed due to server or database error.' });
    }
};

// --- READ ALL TRANSACTIONS (History) ---
export const getAllTransactions = async (req: AuthenticatedRequest, res: Response) => {
    const user_id = req.user?.id;
    if (!user_id) return res.status(401).json({ success: false, message: 'Authentication required.' });

    try {
        const orders = await prisma.order.findMany({
            where: { user_id },
            include: {
                items: {
                    include: {
                        book: {
                            select: { title: true, price: true }
                        }
                    }
                }
            },
            orderBy: { created_at: 'desc' }
        });

        res.status(200).json({ success: true, data: orders });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to retrieve transaction history.' });
    }
};

// --- READ TRANSACTION DETAIL ---
export const getTransactionDetail = async (req: AuthenticatedRequest, res: Response) => {
    const user_id = req.user?.id;
    const { order_id } = req.params;

    if (!user_id) return res.status(401).json({ success: false, message: 'Authentication required.' });

    try {
        const order = await prisma.order.findUnique({
            where: { 
                id: order_id, 
                user_id: user_id // Memastikan hanya user pemilik yang bisa melihat detail
            },
            include: {
                items: {
                    include: {
                        book: {
                            select: { id: true, title: true, price: true, writer: true }
                        }
                    }
                }
            }
        });

        if (!order) return res.status(404).json({ success: false, message: 'Transaction not found or unauthorized.' });
        
        res.status(200).json({ success: true, data: order });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to retrieve transaction detail.' });
    }
};

// --- GET TRANSACTION STATISTICS (Admin) ---
export const getTransactionStatistics = async (req: AuthenticatedRequest, res: Response) => {
    const user_id = req.user?.id;

    // Catatan: Dalam aplikasi nyata, ini memerlukan pengecekan role Admin/Manager
    // Untuk tujuan ini, kita asumsikan semua user bisa melihat statistik, atau kita bisa membatasi.
    if (!user_id) return res.status(401).json({ success: false, message: 'Authentication required.' });

    try {
        // Total orders
        const totalOrders = await prisma.order.count();

        // Total Revenue (SUM total_price)
        const totalRevenueResult = await prisma.order.aggregate({
            _sum: {
                total_price: true,
            },
        });
        const totalRevenue = totalRevenueResult._sum.total_price || new Prisma.Decimal(0);

        // Top 5 selling books
        const topSellingBooks = await prisma.orderItem.groupBy({
            by: ['book_id'],
            _sum: {
                quantity: true,
            },
            orderBy: {
                _sum: {
                    quantity: 'desc',
                },
            },
            take: 5,
        });

        // Ambil detail buku untuk 5 teratas
        const topBookIds = topSellingBooks.map(item => item.book_id);
        const topBooksDetails = await prisma.book.findMany({
            where: { id: { in: topBookIds } },
            select: { id: true, title: true, writer: true }
        });

        const detailedTopSelling = topSellingBooks.map(item => ({
            ...item,
            book_title: topBooksDetails.find(b => b.id === item.book_id)?.title,
            writer: topBooksDetails.find(b => b.id === item.book_id)?.writer,
        }));


        res.status(200).json({
            success: true,
            data: {
                totalOrders,
                totalRevenue: totalRevenue.toFixed(2),
                topSellingBooks: detailedTopSelling,
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to retrieve transaction statistics.' });
    }
};
