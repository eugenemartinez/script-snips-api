import express, { Express, Request, Response } from 'express';
// If you removed Prisma earlier, keep this commented out:
// import { PrismaClient } from '@prisma/client';

// If you removed Prisma earlier, keep this commented out:
// const prisma = new PrismaClient();
const app: Express = express();
const port = process.env.PORT || 3000; // Define a port

app.use(express.json()); // Middleware to parse JSON bodies

// --- Add Root Route Handler ---
app.get('/', (req: Request, res: Response) => {
    res.status(200).send('Basic Server Root OK');
});

// --- Server Start ---
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});

export default app;