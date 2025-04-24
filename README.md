# Script Snips API Server

This directory contains the backend API server for the Script Snips application, built with Express.js and TypeScript.

## 🚀 Features

- CRUD operations for script snippets (Create, Read, Update, Delete)
- Input validation using [Zod](https://github.com/colinhacks/zod)
- Structured error handling
- Rate limiting on script creation
- Unit and integration tests using [Jest](https://jestjs.io/) and [Supertest](https://github.com/visionmedia/supertest)

## 🛠 Prerequisites

- [Node.js](https://nodejs.org/) (LTS version recommended)
- [npm](https://www.npmjs.com/), [yarn](https://yarnpkg.com/), or [pnpm](https://pnpm.io/)
- A running PostgreSQL database instance

## ⚙️ Setup for Local Development

1. **Clone the Repository**  
   *(if you haven't already)*

2. **Navigate to the Server Directory**  
   ```bash
   cd path/to/script-snips/server
   ```

3. **Install Dependencies**  
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

4. **Set Up Environment Variables**  
   - Create a `.env` file in the `server` directory
   - Add the following variables:

     ```env
     DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
     PORT=3000 # (Optional) Override default port
     ```

5. **Apply Database Migrations**  
   Ensure your database schema matches the Prisma schema:

   ```bash
   npx prisma migrate dev --name init
   ```

## 🧪 Running the Server Locally

1. **Start the Development Server**
   ```bash
   npm run dev
   ```

2. **Access the API**
   - API runs at: `http://localhost:3000`

## ✅ Testing

- Run the test suite:
  ```bash
  npm test
  ```

- Run tests with coverage reports:
  ```bash
  npm run test:coverage
  ```

- Coverage reports will be generated in the `coverage` directory.

---

📦 Built with love using Node.js, Express, TypeScript, Prisma, and Neon.
```

Let me know if you want to add badges, author info, or a deployment section!