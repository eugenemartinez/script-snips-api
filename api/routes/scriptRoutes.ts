import express from 'express';
import {
    createScript,
    getAllScripts,
    getScriptById,
    updateScript,
    deleteScript,
    getRandomScript,
    getRandomScripts, // <-- Import the new controller function
    getScriptsByIds
} from '../controllers/scriptController';
import { createScriptLimiter } from '../middleware/rateLimiter';

const router = express.Router();

// POST /api/scripts - Create a new script snippet
router.post('/', createScriptLimiter, createScript);

// GET /api/scripts - Retrieve a list of all script snippets (paginated/filtered/sorted)
router.get('/', getAllScripts);

// GET /api/scripts/random - Retrieve a single random script snippet
// IMPORTANT: Place this BEFORE the /:id route
router.get('/random', getRandomScript);

// GET /api/scripts/random-multiple - Retrieve multiple random script snippets
// IMPORTANT: Place this BEFORE the /:id route
router.get('/random-multiple', getRandomScripts); // <-- Add the new route

// GET /api/scripts/batch - Retrieve multiple scripts by comma-separated IDs
// IMPORTANT: Place this BEFORE the /:id route
router.get('/batch', getScriptsByIds);

// GET /api/scripts/:id - Retrieve a single script snippet by ID
router.get('/:id', getScriptById);

// PUT /api/scripts/:id - Update a script snippet by ID
router.put('/:id', updateScript);

// DELETE /api/scripts/:id - Delete a script snippet by ID
router.delete('/:id', deleteScript);

export default router;