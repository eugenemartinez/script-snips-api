import { Request, Response, NextFunction } from 'express';
import prisma from '../db';
import { Prisma } from '@prisma/client';
// Import the validation schemas
import { createScriptSchema, updateScriptSchema } from '../schemas/scriptSchema';

// --- CREATE ---
export const createScript = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Now createScriptSchema is recognized
        const validatedData = createScriptSchema.parse(req.body);
        const { title, characters, lines } = validatedData;

        const newScript = await prisma.scriptSnip.create({
            data: { title: title || 'Untitled', characters, lines },
        });
        res.status(201).json(newScript);

    } catch (error) {
        next(error);
    }
};

// --- READ ALL (Unified Raw SQL with Pagination, Search, and Sorting) ---
export const getAllScripts = async (req: Request, res: Response, next: NextFunction) => {
    // 1. Get pagination parameters
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '10', 10);

    // 2. Get the single 'search' parameter
    const search = req.query.search as string | undefined;
    const searchTerm = search ? `%${search}%` : undefined; // Prepare searchTerm only if search exists

    // 3. Get and validate sorting parameters
    const allowedSortFields = ['title', 'createdAt']; // Define valid fields for sorting
    const defaultSortBy = 'createdAt';
    const defaultSortOrder = 'desc';

    let sortBy = req.query.sortBy as string || defaultSortBy;
    if (!allowedSortFields.includes(sortBy)) {
        sortBy = defaultSortBy; // Fallback to default if invalid field provided
    }

    let sortOrder = (req.query.sortOrder as string || defaultSortOrder).toLowerCase();
    if (sortOrder !== 'asc' && sortOrder !== 'desc') {
        sortOrder = defaultSortOrder; // Fallback to default if invalid order provided
    }

    // 4. Validate pagination parameters
    if (isNaN(page) || page < 1 || isNaN(limit) || limit < 1) {
        const error = new Error('Invalid pagination parameters. Page and limit must be positive integers.');
        (error as any).statusCode = 400;
        return next(error);
    }

    // 5. Calculate skip
    const skip = (page - 1) * limit;

    try {
        // --- Unified Raw SQL Query Construction ---

        // Dynamically construct WHERE clause
        let whereClause = Prisma.sql`WHERE 1=1`; // Start with a clause that's always true
        if (searchTerm) {
            whereClause = Prisma.sql`WHERE
                title ILIKE ${searchTerm} OR
                EXISTS (SELECT 1 FROM unnest(characters) AS char WHERE char ILIKE ${searchTerm}) OR
                EXISTS (
                  SELECT 1 FROM jsonb_array_elements(lines) AS line
                  WHERE line->>'dialogue' ILIKE ${searchTerm}
                )`;
        }

        // Dynamically construct ORDER BY clause safely
        let orderByRaw;
        // Ensure sortBy is validated against allowedSortFields before using here
        if (sortBy === 'title') {
            // Apply LOWER() for case-insensitive title sort
            orderByRaw = Prisma.sql`ORDER BY LOWER("title") ${Prisma.raw(sortOrder)}`;
        } else { // Default to createdAt (or other fields if added later)
            orderByRaw = Prisma.sql`ORDER BY "createdAt" ${Prisma.raw(sortOrder)}`;
        }

        // Combine clauses for data query
        const dataQuery = Prisma.sql`
            SELECT * FROM script_snips
            ${whereClause} -- Apply dynamic WHERE
            ${orderByRaw} -- Apply dynamic ORDER BY
            LIMIT ${limit} OFFSET ${skip};
        `;

        // Count query (doesn't need sorting)
        const countQuery = Prisma.sql`
            SELECT COUNT(*) FROM script_snips
            ${whereClause}; -- Apply the same dynamic WHERE
        `;
        // --- End Unified Raw SQL Query Construction ---

        // Execute queries in parallel
        const [dataResult, countResult] = await prisma.$transaction([
            prisma.$queryRaw(dataQuery),
            prisma.$queryRaw(countQuery),
        ]);

        const scripts = dataResult as any[]; // Assign raw result
        let totalScripts: number = 0;

        // Extract count
        if (Array.isArray(countResult) && countResult.length > 0 && countResult[0].count) {
             totalScripts = parseInt(countResult[0].count, 10);
        } else {
             console.warn("Could not parse count from raw query result:", countResult);
             totalScripts = 0;
        }

        // 7. Calculate total pages
        const totalPages = Math.ceil(totalScripts / limit);

        // 8. Send response
        res.status(200).json({
            data: scripts,
            pagination: {
                totalScripts,
                currentPage: page,
                totalPages,
                limit,
                sortBy, // Include current sort in response
                sortOrder
            }
        });

    } catch (error) {
        console.error("Error in getAllScripts:", error);
        next(error);
    }
};

// --- READ ONE ---
export const getScriptById = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    try {
        const script = await prisma.scriptSnip.findUnique({
            where: { id: String(id) },
        });
        if (!script) {
            // Send response first, then return
            res.status(404).json({ error: 'Script not found' });
            return; // Stop execution here
        }
        // This line is now only reached if script was found
        res.status(200).json(script);
    } catch (error) {
        next(error);
    }
};

// --- READ RANDOM ---
export const getRandomScript = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // 1. Get the total count of scripts
        const count = await prisma.scriptSnip.count();

        // 2. Handle case where there are no scripts
        if (count === 0) {
            const error = new Error('No scripts available to choose from.');
            (error as any).statusCode = 404;
            return next(error); // Use next
        }

        // 3. Generate a random index (0 to count - 1)
        const randomIndex = Math.floor(Math.random() * count);

        // 4. Fetch one script using the random index as skip
        const randomScript = await prisma.scriptSnip.findFirst({
            skip: randomIndex,
        });

        // 5. Handle potential edge case where findFirst returns null
        if (!randomScript) {
             console.error("Failed to find random script despite count > 0. Index:", randomIndex, "Count:", count);
             const error = new Error('Failed to retrieve a random script.');
             (error as any).statusCode = 500;
             return next(error); // Use next
        }

        // 6. Return the found script
        res.status(200).json(randomScript);

    } catch (error) {
        // Pass other database/unexpected errors to the central handler
        next(error);
    }
};


// --- READ MULTIPLE RANDOM ---
export const getRandomScripts = async (req: Request, res: Response, next: NextFunction) => {
    // 1. Get and validate count parameter
    const countParam = req.query.count as string;
    let count = 3; // Default count
    if (countParam) {
        const parsedCount = parseInt(countParam, 10);
        if (!isNaN(parsedCount) && parsedCount > 0) {
            count = parsedCount;
        } else {
            const error = new Error('Invalid count parameter. Must be a positive integer.');
            (error as any).statusCode = 400;
            return next(error);
        }
    }

    // 2. Get and validate excludeIds parameter (comma-separated string)
    const excludeIdsQuery = req.query.excludeIds as string;
    const excludeIds = excludeIdsQuery ? excludeIdsQuery.split(',').map(id => id.trim()).filter(id => id) : [];

    try {
        // 3. Check total count (consider excluding IDs for available count if needed, but simpler to let DB handle)
        const totalCount = await prisma.scriptSnip.count();
        if (totalCount === 0) {
            res.status(404).json({ message: 'No scripts available in the database.' });
            return
        }

        // Ensure count doesn't exceed total available scripts (theoretically, could be less after exclusion)
        const limitCount = Math.min(count, totalCount); // We still ask for up to 'count' new ones

        // 4. Build the WHERE clause dynamically
        let whereClause = Prisma.sql`WHERE 1=1`; // Start with true
        if (excludeIds.length > 0) {
            // IMPORTANT: Ensure excludeIds are properly validated/sanitized if they come from user input
            // In this case, they originate from our own DB IDs, so less risk, but good practice.
            // Prisma.join handles escaping correctly for the IN clause.
            whereClause = Prisma.sql`WHERE id NOT IN (${Prisma.join(excludeIds)})`;
        }

        // 5. Use raw SQL for efficient random sampling with exclusion
        const randomScripts = await prisma.$queryRaw<any[]>`
            SELECT * FROM script_snips
            ${whereClause} -- Apply the exclusion clause
            ORDER BY RANDOM()
            LIMIT ${limitCount};
        `;

        // 6. Handle case where query returns nothing (possible if all scripts were excluded)
        // No need to error here, just return an empty array or the scripts found.
        // The frontend already handles the empty state.

        // 7. Return the found scripts
        res.status(200).json(randomScripts);

    } catch (error) {
        console.error("Error in getRandomScripts:", error);
        next(error); // Pass errors to the central handler
    }
};


// --- READ MULTIPLE BY IDS (for Scene Stash) ---
export const getScriptsByIds = async (req: Request, res: Response, next: NextFunction) => {
    const idsQuery = req.query.ids as string; // Expecting comma-separated string like "id1,id2,id3"

    if (!idsQuery) {
        // If no IDs are provided, return an empty array immediately
        res.status(200).json([]);
        return;
    }

    // Split the string into an array and trim whitespace
    const ids = idsQuery.split(',').map(id => id.trim()).filter(id => id); // Filter out empty strings

    if (ids.length === 0) {
        // If after trimming/filtering, the array is empty, return empty
        res.status(200).json([]);
        return;
    }

    try {
        const scripts = await prisma.scriptSnip.findMany({
            where: {
                id: {
                    in: ids, // Use the 'in' filter to find multiple IDs
                },
            },
            // Optional: Add an order by clause if you want the results in a specific order
            // orderBy: {
            //     createdAt: 'desc' // Example: order by creation date
            // }
        });

        // Note: findMany won't error if some IDs aren't found, it just won't return them.
        res.status(200).json(scripts);

    } catch (error) {
        console.error("Error in getScriptsByIds:", error);
        next(error); // Pass errors to the central handler
    }
};


// --- UPDATE ---
export const updateScript = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    try {
        // Now updateScriptSchema is recognized
        const validatedData = updateScriptSchema.parse(req.body);

        const updatedScript = await prisma.scriptSnip.update({
            where: { id: String(id) },
            data: validatedData,
        });
        res.status(200).json(updatedScript);

    } catch (error) {
        next(error);
    }
};

// --- DELETE ---
export const deleteScript = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    try {
        await prisma.scriptSnip.delete({
            where: { id: String(id) },
        });
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};