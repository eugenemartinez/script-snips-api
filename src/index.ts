import express, { Express, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app: Express = express();
// const port = process.env.PORT || 3000; // No longer needed here

app.use(express.json()); // Middleware to parse JSON bodies

// --- Add Root Route Handler ---
app.get('/', (req: Request, res: Response) => {
    res.send('Script Snips API is running!');
});

// --- Script CRUD Routes ---

// GET all scripts
app.get('/api/scripts', async (req: Request, res: Response) => {
    console.log('GET /api/scripts');
    try {
        const scripts = await prisma.scriptSnip.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(scripts);
    } catch (error) {
        console.error('Failed to get scripts:', error);
        res.status(500).json({ error: 'Failed to retrieve scripts' });
    }
});

// GET a single script by ID
app.get('/api/scripts/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    console.log(`GET /api/scripts/${id}`);
    try {
        const script = await prisma.scriptSnip.findUnique({
            where: { id },
        });
        if (script) {
            res.json(script);
        } else {
            res.status(404).json({ error: `Script with ID ${id} not found` });
        }
    } catch (error) {
        console.error(`Failed to get script ${id}:`, error);
        res.status(500).json({ error: 'Failed to retrieve script' });
    }
});

// POST (create) a new script
app.post('/api/scripts', async (req: Request, res: Response) => {
    console.log('POST /api/scripts', req.body);
    try {
        const { title, characters, lines } = req.body;
        if (!characters || !lines || !Array.isArray(characters) || !Array.isArray(lines)) {
            res.status(400).json({ error: 'Missing or invalid required fields: characters, lines' });
            return;
        }

        const newScript = await prisma.scriptSnip.create({
            data: {
                title,
                characters,
                lines,
            },
        });
        res.status(201).json(newScript);
        return;
    } catch (error) {
        console.error('Failed to create script:', error);
        res.status(500).json({ error: 'Failed to create script' });
        return;
    }
});

// PUT (update) a script by ID
app.put('/api/scripts/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    console.log(`PUT /api/scripts/${id}`, req.body);
    try {
        const { title, characters, lines } = req.body;
        // Optional: Add validation similar to POST if needed

        const updatedScript = await prisma.scriptSnip.update({
            where: { id },
            data: {
                title,       // Update title
                characters,  // Update characters
                lines,       // Update lines
                // createdAt is not updated intentionally
            },
        });
        res.json(updatedScript);
    } catch (error: any) {
        console.error(`Failed to update script ${id}:`, error);
        // Handle case where the record doesn't exist (Prisma throws P2025)
        if (error.code === 'P2025') {
             res.status(404).json({ error: `Script with ID ${id} not found` });
        } else {
             res.status(500).json({ error: 'Failed to update script' });
        }
        return; // Added return for consistency
    }
});

// DELETE a script by ID
app.delete('/api/scripts/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    console.log(`DELETE /api/scripts/${id}`);
    try {
        await prisma.scriptSnip.delete({
            where: { id },
        });
        res.status(204).send(); // No content response
    } catch (error: any) {
        console.error(`Failed to delete script ${id}:`, error);
        // Handle case where the record doesn't exist (Prisma throws P2025)
        if (error.code === 'P2025') {
             res.status(404).json({ error: `Script with ID ${id} not found` });
        } else {
             res.status(500).json({ error: 'Failed to delete script' });
        }
        // No return needed after send() or json() in this case, but added for consistency
        return;
    }
});

// --- Server Start ---
// REMOVE THIS BLOCK:
// app.listen(port, () => {
//     console.log(`Server listening at http://localhost:${port}`);
// });

// Optional: Graceful shutdown (might not work as expected in serverless, consider removing)
// process.on('SIGINT', async () => {
//     await prisma.$disconnect();
//     process.exit(0);
// });

// Export the app for Vercel
module.exports = app;