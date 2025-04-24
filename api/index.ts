import express, { Express, Request, Response } from 'express';
import scriptRoutes from './routes/scriptRoutes';
import { errorHandler } from './middleware/errorHandler';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import cors from 'cors';
import path from 'path';
import swaggerUiDist from 'swagger-ui-dist';

const app: Express = express();
const port = process.env.PORT;

// --- CORS Configuration ---
const allowedOrigins = [
    'http://localhost:5173',
    // Add your deployed frontend URL here later
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
app.use(cors(corsOptions));
app.use(express.json());

// --- Serve Swagger UI Static Files ---
// Get the absolute path to the swagger-ui-dist directory
const swaggerUiAssetPath = swaggerUiDist.getAbsoluteFSPath();
// Serve static files directly from the /api/api-docs path.
// Mount this BEFORE swaggerUi.serve/setup.
// Vercel routes /api/* here, so browser path is /api/api-docs/...
app.use('/api/api-docs', express.static(swaggerUiAssetPath));


// --- Swagger/OpenAPI Definition Setup ---
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Script Snips API',
            version: '1.0.0',
            description: 'API for managing script snippets',
        },
        servers: [
            { url: '/api', description: 'Vercel Server' },
            { url: `http://localhost:${port || 3000}`, description: 'Local Development Server' }
        ],
    },
    apis: ['./api/routes/*.ts'],
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);


// --- Mount Swagger UI Endpoint ---
// Minimal options - remove customCssUrl and customJs
const swaggerUiOptions = {
    customSiteTitle: "Script Snips API Docs",
};

// Mount serve and setup together at /api-docs.
// swagger-ui-express should hopefully find the static assets
// served by express.static at the same base path.
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));


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
        console.log(`API Docs available at http://localhost:${localPort}/api-docs`);
    });
}

module.exports = app;