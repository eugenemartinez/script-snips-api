import express from 'express';
import { createScript } from '../controllers/scriptController'; // Adjust path as needed

const router = express.Router();

// Define script routes
router.post('/', createScript); // Route POST requests for '/' (relative to mount point) to createScript

// Add other routes later (e.g., router.get('/', getScripts);)

export default router; // Export the router