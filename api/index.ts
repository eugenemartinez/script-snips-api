import express, { Express, Request, Response } from 'express';
// Uncomment Prisma Client
import { PrismaClient } from '@prisma/client';

// Uncomment Prisma Client instantiation
const prisma = new PrismaClient();
const app: Express = express();
const port = process.env.PORT || 3000; // Define a port

app.use(express.json()); // Middleware to parse JSON bodies

// --- Root Route Handler ---
app.get('/', (req: Request, res: Response) => {
    res.status(200).send('Basic Server Root OK');
});

// --- Test Route ---
app.get('/test', (req: Request, res: Response) => {
    res.status(200).send('Test route OK');
});

// --- Add POST Route for Scripts ---
app.post('/api/scripts', async (req: Request, res: Response) => {
    console.log('POST /api/scripts received:', req.body); // Log incoming request
    try {
        const { title, characters, lines } = req.body;

        // Basic validation
        if (!characters || !lines || !Array.isArray(characters) || !Array.isArray(lines)) {
            res.status(400).json({ error: 'Missing or invalid required fields: characters (array), lines (array)' });
            return;
        }

        const newScript = await prisma.scriptSnip.create({
            data: {
                title: title || 'Untitled', // Provide a default title if missing
                characters,
                lines,
            },
        });
        console.log('Script created:', newScript); // Log successful creation
        res.status(201).json(newScript); // Respond with the created script

    } catch (error) {
        console.error('Failed to create script:', error); // Log any errors
        // Check if it's a Prisma-specific error, otherwise send generic error
        if (error instanceof Error) {
             // Basic error handling, could be more specific
             res.status(500).json({ error: 'Failed to create script', details: error.message });
        } else {
             res.status(500).json({ error: 'An unexpected error occurred' });
        }
    }
});


// --- Server Start ---
// Remember: This works locally but is not standard for Vercel deployment
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});

// Export the app for Vercel (May be ignored when app.listen is present)
module.exports = app;