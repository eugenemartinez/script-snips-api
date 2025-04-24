import express from 'express';
import {
    createScript,
    getAllScripts,
    getScriptById,
    updateScript,
    deleteScript
} from '../controllers/scriptController';
import { createScriptLimiter } from '../middleware/rateLimiter'; // Import the limiter

const router = express.Router();

// Apply the limiter directly to the POST route
router.post('/', createScriptLimiter, createScript); // POST /api/scripts

// Other routes remain the same
router.get('/', getAllScripts);      // GET  /api/scripts
router.get('/:id', getScriptById);   // GET  /api/scripts/:id
router.put('/:id', updateScript);    // PUT  /api/scripts/:id
router.delete('/:id', deleteScript); // DELETE /api/scripts/:id

export default router;