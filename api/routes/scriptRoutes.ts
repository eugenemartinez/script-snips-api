import express from 'express';
import {
    createScript,
    getAllScripts,
    getScriptById,
    updateScript,
    deleteScript
} from '../controllers/scriptController';
import { createScriptLimiter } from '../middleware/rateLimiter';

const router = express.Router();

// POST /api/scripts - Create a new script snippet
router.post('/', createScriptLimiter, createScript);

// GET /api/scripts - Retrieve a list of all script snippets
router.get('/', getAllScripts);

// GET /api/scripts/:id - Retrieve a single script snippet by ID
router.get('/:id', getScriptById);

// PUT /api/scripts/:id - Update a script snippet by ID
router.put('/:id', updateScript);

// DELETE /api/scripts/:id - Delete a script snippet by ID
router.delete('/:id', deleteScript);

export default router;