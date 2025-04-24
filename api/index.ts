import express, { Express, Request, Response } from 'express';
import scriptRoutes from './routes/scriptRoutes';
import { errorHandler } from './middleware/errorHandler';

const app: Express = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// --- Root Route Handler ---
app.get('/', (req: Request, res: Response) => {
    res.status(200).send('Basic Server Root OK - Updated Structure');
});

// --- Test Route ---
app.get('/test', (req: Request, res: Response) => {
    res.status(200).send('Test route OK - Updated Structure');
});

// --- Remove Rate Limiter Definition and Conditional Application ---
// const createScriptLimiter = rateLimit({...});
// app.use('/api/scripts', (req, res, next) => { ... });

// --- Mount Script Routes ---
app.use('/api/scripts', scriptRoutes);

// --- Central Error Handler ---
app.use(errorHandler);

// --- Server Start ---
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});

// Export the app for Vercel
module.exports = app;