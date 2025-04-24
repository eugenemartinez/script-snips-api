import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient(); // Instantiate Prisma Client here for the controller

export const createScript = async (req: Request, res: Response) => {
    console.log('POST /api/scripts received by controller:', req.body);
    try {
        const { title, characters, lines } = req.body;

        if (!characters || !lines || !Array.isArray(characters) || !Array.isArray(lines)) {
            // Send the response, no need for explicit return after this
            res.status(400).json({ error: 'Missing or invalid required fields: characters (array), lines (array)' });
        } else {
            // Only proceed if validation passes
            const newScript = await prisma.scriptSnip.create({
                data: {
                    title: title || 'Untitled',
                    characters,
                    lines,
                },
            });
            console.log('Script created by controller:', newScript);
            res.status(201).json(newScript);
        }

    } catch (error) {
        console.error('Controller failed to create script:', error);
        if (error instanceof Error) {
             res.status(500).json({ error: 'Failed to create script', details: error.message });
        } else {
             res.status(500).json({ error: 'An unexpected error occurred' });
        }
    }
};

// Add other controller functions here later (getScripts, getScriptById, etc.)