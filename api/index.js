"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const app = (0, express_1.default)();
// const port = process.env.PORT || 3000; // No longer needed here
app.use(express_1.default.json()); // Middleware to parse JSON bodies
// --- Add Root Route Handler ---
app.get('/', (req, res) => {
    res.send('Script Snips API is running!');
});
// --- Script CRUD Routes ---
// GET all scripts
app.get('/api/scripts', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('GET /api/scripts');
    try {
        const scripts = yield prisma.scriptSnip.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(scripts);
    }
    catch (error) {
        console.error('Failed to get scripts:', error);
        res.status(500).json({ error: 'Failed to retrieve scripts' });
    }
}));
// GET a single script by ID
app.get('/api/scripts/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    console.log(`GET /api/scripts/${id}`);
    try {
        const script = yield prisma.scriptSnip.findUnique({
            where: { id },
        });
        if (script) {
            res.json(script);
        }
        else {
            res.status(404).json({ error: `Script with ID ${id} not found` });
        }
    }
    catch (error) {
        console.error(`Failed to get script ${id}:`, error);
        res.status(500).json({ error: 'Failed to retrieve script' });
    }
}));
// POST (create) a new script
app.post('/api/scripts', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('POST /api/scripts', req.body);
    try {
        const { title, characters, lines } = req.body;
        if (!characters || !lines || !Array.isArray(characters) || !Array.isArray(lines)) {
            res.status(400).json({ error: 'Missing or invalid required fields: characters, lines' });
            return;
        }
        const newScript = yield prisma.scriptSnip.create({
            data: {
                title,
                characters,
                lines,
            },
        });
        res.status(201).json(newScript);
        return;
    }
    catch (error) {
        console.error('Failed to create script:', error);
        res.status(500).json({ error: 'Failed to create script' });
        return;
    }
}));
// PUT (update) a script by ID
app.put('/api/scripts/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    console.log(`PUT /api/scripts/${id}`, req.body);
    try {
        const { title, characters, lines } = req.body;
        // Optional: Add validation similar to POST if needed
        const updatedScript = yield prisma.scriptSnip.update({
            where: { id },
            data: {
                title, // Update title
                characters, // Update characters
                lines, // Update lines
                // createdAt is not updated intentionally
            },
        });
        res.json(updatedScript);
    }
    catch (error) {
        console.error(`Failed to update script ${id}:`, error);
        // Handle case where the record doesn't exist (Prisma throws P2025)
        if (error.code === 'P2025') {
            res.status(404).json({ error: `Script with ID ${id} not found` });
        }
        else {
            res.status(500).json({ error: 'Failed to update script' });
        }
        return; // Added return for consistency
    }
}));
// DELETE a script by ID
app.delete('/api/scripts/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    console.log(`DELETE /api/scripts/${id}`);
    try {
        yield prisma.scriptSnip.delete({
            where: { id },
        });
        res.status(204).send(); // No content response
    }
    catch (error) {
        console.error(`Failed to delete script ${id}:`, error);
        // Handle case where the record doesn't exist (Prisma throws P2025)
        if (error.code === 'P2025') {
            res.status(404).json({ error: `Script with ID ${id} not found` });
        }
        else {
            res.status(500).json({ error: 'Failed to delete script' });
        }
        // No return needed after send() or json() in this case, but added for consistency
        return;
    }
}));
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
