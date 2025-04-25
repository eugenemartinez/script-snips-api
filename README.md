# Script Snips - Backend API

This is the backend API server for the Script Snips application, built with Node.js, Express, TypeScript, and Prisma. It provides endpoints to manage and retrieve fictional script snippets.

## Features

*   RESTful API for CRUD operations (Create, Read, Update, Delete) on script snippets.
*   Endpoint to retrieve random script snippets.
*   Endpoint to retrieve multiple scripts by ID.
*   Uses Prisma ORM for database interaction with PostgreSQL (Neon).
*   Basic rate limiting on creation endpoint.

## Technologies Used

*   [Node.js](https://nodejs.org/)
*   [Express.js](https://expressjs.com/)
*   [TypeScript](https://www.typescriptlang.org/)
*   [Prisma](https://www.prisma.io/)
*   [PostgreSQL](https://www.postgresql.org/) (Designed for Neon)
*   [Zod](https://zod.dev/) (for validation - *optional, add if used*)

## Project Setup

1.  **Navigate to the server directory:**
    ```bash
    cd server
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Set Up Environment Variables:**
    *   Create a `.env` file in the `server` directory.
    *   Add your Neon database connection string:
        ```env
        # Example: postgresql://user:password@host.neon.tech/dbname?sslmode=require
        DATABASE_URL="YOUR_NEON_DATABASE_CONNECTION_STRING"

        # Optional: Define the port the server will run on
        PORT=5001
        ```
        *Replace `"YOUR_NEON_DATABASE_CONNECTION_STRING"` with your actual connection string from Neon.*

4.  **Apply Database Migrations:**
    *   Ensure your database schema is up-to-date with your Prisma schema:
        ```bash
        npx prisma migrate dev --name init # Use a descriptive name if not the first migration
        # or for production/staging environments:
        # npx prisma migrate deploy
        ```

## Development Server

Run the following command to start the development server (usually with hot-reloading via `ts-node-dev` or similar):

```bash
npm run dev
# or
yarn dev
```

The API will typically be available at `http://localhost:3000` (or the port specified in your `.env` or startup script).

## API Endpoints

*   `POST /api/scripts`: Create a new script snippet.
*   `GET /api/scripts`: Get a list of all script snippets.
*   `GET /api/scripts/random`: Get a single random script snippet.
*   `GET /api/scripts/random-multiple?count=N`: Get `N` random script snippets.
*   `GET /api/scripts/batch?ids=id1,id2,...`: Get multiple scripts by their IDs.
*   `GET /api/scripts/:id`: Get a single script snippet by ID.
*   `PUT /api/scripts/:id`: Update a script snippet by ID.
*   `DELETE /api/scripts/:id`: Delete a script snippet by ID.

*(Note: Refer to route definitions in `server/api/routes/scriptRoutes.ts` for exact details and any middleware.)*