// src/config/prisma.ts

// Perbaikan: Impor PrismaClient langsung dari package utama
import { PrismaClient } from '@prisma/client'; 

const prisma = new PrismaClient({
  // Atur log level sesuai kebutuhan development Anda
  log: ['query', 'info', 'warn', 'error'],
});

export default prisma;
