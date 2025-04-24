import express, { Express, Request, Response } from 'express';
import scriptRoutes from './routes/scriptRoutes';
import { errorHandler } from './middleware/errorHandler';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import cors from 'cors';
// Import path and swagger-ui-dist
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
// Serve static files from swagger-ui-dist. Mount BEFORE the main /api-docs route.
// The browser path will be /api/swagger-static/... due to Vercel routing /api/*
app.use('/api/swagger-static', express.static(swaggerUiAssetPath));


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
    // Make sure this path is relative to the project root where Vercel runs the build
    apis: ['./api/routes/*.ts'],
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);


// --- Mount Swagger UI Endpoint ---
const swaggerUiOptions = {
    customSiteTitle: "Script Snips API Docs",
    // Point custom CSS and JS to the paths served by express.static above.
    // These paths MUST include the /api prefix for Vercel.
    customCssUrl: '/api/swagger-static/swagger-ui.css',
    customJs: [
        '/api/swagger-static/swagger-ui-bundle.js',
        '/api/swagger-static/swagger-ui-standalone-preset.js'
    ],
};

// Use swaggerUi.serve for the route, then setup with the spec and options
app.use('/api-docs', swaggerUi.serve); // Handles internal setup
app.get('/api-docs', swaggerUi.setup(swaggerSpec, swaggerUiOptions)); // Renders the page


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