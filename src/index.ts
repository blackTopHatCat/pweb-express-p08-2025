import express, { Application, Request, Response } from 'express';
import dotenv from 'dotenv';
import prisma from './config/prisma';
import userRoutes from "./router/userRoutes";

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
    "message" : "Hello World!", 
    "date": date 
  });
});

// Routers
app.use('/auth', userRoutes);

app.use((_, res: Response) => {
  res.status(404).json({ "success": "false", "message": 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  console.log('Database disconnected');
  process.exit(0);
});
