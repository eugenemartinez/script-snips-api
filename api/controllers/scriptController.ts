import { Request, Response, NextFunction } from 'express';
import prisma from '../db';
import { createScriptSchema, updateScriptSchema } from '../schemas/scriptSchema';
// No longer need ZodError or AppError imports here if not throwing AppError explicitly

// --- CREATE ---
export const createScript = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const validatedData = createScriptSchema.parse(req.body);
        const { title, characters, lines } = validatedData;

        const newScript = await prisma.scriptSnip.create({
            data: { title: title || 'Untitled', characters, lines },
        });
        res.status(201).json(newScript);

    } catch (error) {
        next(error);
    }
};

// --- READ ALL ---
export const getAllScripts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const scripts = await prisma.scriptSnip.findMany();
        res.status(200).json(scripts);
    } catch (error) {
        next(error);
    }
};

// --- READ ONE ---
export const getScriptById = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    try {
        const script = await prisma.scriptSnip.findUnique({
            where: { id: String(id) },
        });
        if (!script) {
            res.status(404).json({ error: 'Script not found' });
        }
        res.status(200).json(script);
    } catch (error) {
        next(error);
    }
};

// --- UPDATE ---
export const updateScript = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    try {
        const validatedData = updateScriptSchema.parse(req.body);

        const updatedScript = await prisma.scriptSnip.update({
            where: { id: String(id) },
            data: validatedData,
        });
        res.status(200).json(updatedScript);

    } catch (error: any) {
        next(error);
    }
};

// --- DELETE ---
export const deleteScript = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    try {
        await prisma.scriptSnip.delete({
            where: { id: String(id) },
        });
        res.status(204).send();
    } catch (error: any) {
        next(error);
    }
};