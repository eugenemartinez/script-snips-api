import { PrismaClient } from '@prisma/client';

// Instantiate Prisma Client once
const prisma = new PrismaClient();

// Export the single instance
export default prisma;