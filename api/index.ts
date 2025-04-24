import express, { Express, Request, Response } from 'express';
// PrismaClient is now primarily used in controllers, remove import if not needed here
// import { PrismaClient } from '@prisma/client';
import scriptRoutes from './routes/scriptRoutes'; // Import the script router

// Remove Prisma Client instantiation if not needed directly in index.ts
// const prisma = new PrismaClient();
const app: Express = express();
const port = process.env.PORT || 3000; // Define a port

app.use(express.json()); // Middleware to parse JSON bodies

// --- Root Route Handler ---
app.get('/', (req: Request, res: Response) => {
    res.status(200).send('Basic Server Root OK - Updated Structure');
});

// --- Test Route ---
app.get('/test', (req: Request, res: Response) => {
    res.status(200).send('Test route OK - Updated Structure');
});

// --- Mount Script Routes ---
// Mount the script router under the /api/scripts path
app.use('/api/scripts', scriptRoutes);

// --- Remove old POST route logic ---
// app.post('/api/scripts', async (req: Request, res: Response) => { ... });


// --- Server Start ---
// Remember: This works locally but is not standard for Vercel deployment
// app.listen(port, () => {
//     console.log(`Server listening at http://localhost:${port}`);
// });

// Export the app for Vercel (May be ignored when app.listen is present)
module.exports = app;