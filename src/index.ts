// src/index.ts

import express, { Application, Request, Response } from 'express';
import dotenv from 'dotenv';
import prisma from './config/prisma';
import userRoutes from "./router/userRoutes";
import bookRoutes from "./router/bookRoutes"; // Import router buku
import transactionRoutes from "./router/transactionRoutes"; // Import router transaksi
import genreRoutes from "./router/genreRoutes"; // Import router genre

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000; // Sesuaikan PORT masing-masing

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test route
app.get('/', (_, res: Response) => {
  let date = Date();
  res.status(200).json({ 
    "success": 'true', 
    "message" : "Welcome to the Book Store API!", 
    "date": date 
  });
});

// Routers
app.use('/auth', userRoutes);
app.use('/books', bookRoutes); 
app.use('/transactions', transactionRoutes); 
app.use('/genres', genreRoutes); // Gunakan router genre

// Handle 404
app.use((req, res: Response) => {
  res.status(404).json({ 
    "success": "false", 
    "message": `Endpoint not found: ${req.method} ${req.originalUrl}` 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  console.log('Database disconnected');
  process.exit(0);
});
