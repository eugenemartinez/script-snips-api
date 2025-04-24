import express, { Express, Request, Response } from 'express';
import scriptRoutes from './routes/scriptRoutes';
import { errorHandler } from './middleware/errorHandler';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import cors from 'cors'; // Import the cors middleware

const app: Express = express();
const port = process.env.PORT;

// --- CORS Configuration ---
// Define allowed origins. Replace 'http://localhost:YOUR_FRONTEND_PORT'
// and 'YOUR_DEPLOYED_FRONTEND_URL' with your actual frontend URLs later.
const allowedOrigins = [
    'http://localhost:5173', // Example: Vite default local dev port
    // 'https://your-frontend-app.vercel.app' // Example: Deployed frontend URL
];

const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        // or requests from allowed origins
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    // Optional: You might need to allow specific methods or headers
    // methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    // allowedHeaders: "Content-Type,Authorization",
    // credentials: true // If you need to handle cookies or authorization headers
};

// --- Apply Middleware ---
app.use(cors(corsOptions)); // Apply CORS middleware *before* routes
app.use(express.json());

// --- Swagger/OpenAPI Setup ---
const swaggerOptions = {
    definition: {
        openapi: '3.0.0', // OpenAPI version
        info: {
            title: 'Script Snips API',
            version: '1.0.0',
            description: 'API for managing script snippets',
        },
        servers: [
            {
                // Adjust URL based on deployment or local environment
                url: `http://localhost:${port}`,
                description: 'Development server',
            },
            // Add other servers like production if needed
        ],
    },
    // Path to the API docs files (where JSDoc comments are)
    apis: ['./api/routes/*.ts'], // Look for .ts files in the routes directory
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// --- Mount Swagger UI Route ---
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// --- Root Route Handler ---
app.get('/', (req: Request, res: Response) => {
    res.status(200).send('Basic Server Root OK - Updated Structure');
});

// --- Test Route ---
app.get('/test', (req: Request, res: Response) => {
    res.status(200).send('Test route OK - Updated Structure');
});

// --- Mount Script Routes ---
app.use('/api/scripts', scriptRoutes); // Routes are mounted *after* CORS

// --- Central Error Handler ---
app.use(errorHandler);

// --- Server Start ---
// Only start listening if the file is run directly (not required by Vercel or tests)
if (require.main === module) {
    app.listen(port, () => {
        console.log(`Server listening at http://localhost:${port}`);
        console.log(`API Docs available at http://localhost:${port}/api-docs`); // Add this line
    });
}

module.exports = app;