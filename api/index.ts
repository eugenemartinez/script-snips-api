import express, { Express, Request, Response, NextFunction } from 'express'; // Add NextFunction
import scriptRoutes from './routes/scriptRoutes';
import { errorHandler } from './middleware/errorHandler';
import cors from 'cors';

const app: Express = express();
const port = process.env.PORT;

// --- CORS Configuration ---
const allowedOrigins = [
    'http://localhost:5173', 'https://scriptsnips.vercel.app'
];
const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
};

// --- Apply Core Middleware ---
// app.use(cors(corsOptions)); // Temporarily disable specific options
app.use(cors()); // Allow all origins for testing
app.use(express.json());

// --- Simple Request Logger Middleware ---
app.use((req: Request, res: Response, next: NextFunction) => {
    const now = new Date().toISOString();
    console.log(`[${now}] ${req.method} ${req.originalUrl}`);
    next(); // Pass control to the next middleware/handler
});

// --- Root & Test Routes ---
app.get('/', (req: Request, res: Response) => {
    res.status(200).send('Basic Server Root OK - Updated Structure');
});
app.get('/test', (req: Request, res: Response) => {
    res.status(200).send('Test route OK - Updated Structure');
});

// --- Mount Script Routes ---
app.use('/api/scripts', scriptRoutes);

// --- Central Error Handler ---
app.use(errorHandler);

// --- Server Start (for local dev only) ---
if (require.main === module) {
    const localPort = port || 3000;
    app.listen(localPort, () => {
        console.log(`Server listening at http://localhost:${localPort}`);
    });
}

module.exports = app;