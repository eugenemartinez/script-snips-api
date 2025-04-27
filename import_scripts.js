// filepath: import_scripts.js
const fs = require('fs').promises;
const path = require('path');
const { PrismaClient } = require('@prisma/client'); // Import Prisma Client

// --- Configuration ---
const JSON_FILE_PATH = path.join(__dirname, 'SCRIPTS.json'); // Assumes SCRIPTS.json is in the same directory
// Prisma client reads the DATABASE_URL from your .env file automatically
// --- End Configuration ---

const prisma = new PrismaClient(); // Instantiate Prisma Client

async function importData() {
    let scriptsData = [];

    // 1. Read the JSON file
    try {
        console.log(`Reading JSON file from: ${JSON_FILE_PATH}`);
        const fileContent = await fs.readFile(JSON_FILE_PATH, 'utf8');
        scriptsData = JSON.parse(fileContent);
        console.log(`Successfully loaded ${scriptsData.length} scripts from ${JSON_FILE_PATH}`);
    } catch (err) {
        console.error(`Error reading or parsing JSON file: ${err.message}`);
        await prisma.$disconnect(); // Disconnect Prisma before exiting
        process.exit(1);
    }

    try {
        // 2. Insert data using Prisma Client
        console.log(`Inserting ${scriptsData.length} records using Prisma...`);

        // Optional: Clear existing data if needed (Use with caution!)
        // console.log("Clearing existing data...");
        // await prisma.scriptSnip.deleteMany({});
        // console.log("Existing data cleared.");

        // Use Prisma's createMany for potentially better performance,
        // or loop with create if createMany has issues with JSON types or defaults.
        // Let's loop for clarity and better handling of potential individual errors.

        let successCount = 0;
        let errorCount = 0;

        for (const script of scriptsData) {
            try {
                await prisma.scriptSnip.create({
                    data: {
                        title: script.title || null, // Use null if title is missing/undefined
                        characters: script.characters || [], // Use empty array if missing
                        // Prisma expects the JSON field to be assigned directly
                        // It handles the JSON conversion based on the schema type
                        lines: script.lines || [], // Use empty array if missing
                    },
                });
                successCount++;
                // Optional: Log progress periodically
                if (successCount % 10 === 0) {
                    console.log(`Inserted ${successCount}/${scriptsData.length}...`);
                }
            } catch (err) {
                console.error(`Error inserting script titled "${script.title}": ${err.message}`);
                errorCount++;
                // Decide if you want to stop on error or continue
                // continue;
            }
        }

        console.log("\n--- Prisma Insertion Complete ---");
        console.log(`Successfully inserted: ${successCount}`);
        console.log(`Failed: ${errorCount}`);

    } catch (err) {
        // Catch broader errors during the insertion process (e.g., connection issues)
        console.error(`Database error during insertion process: ${err.message}`);
    } finally {
        // 3. Disconnect Prisma Client
        console.log("Disconnecting Prisma Client...");
        await prisma.$disconnect();
        console.log("Prisma Client disconnected.");
    }
}

importData(); // Run the import function