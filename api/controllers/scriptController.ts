import { Request, Response, NextFunction } from 'express';
import prisma from '../db';
import { Prisma } from '@prisma/client';
import { createScriptSchema, updateScriptSchema } from '../schemas/scriptSchema';
import { AppError } from '../middleware/errorHandler'; // <-- Import AppError

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
    const allowedSortFields = ['title', 'createdAt'];
    const defaultSortBy = 'createdAt';
    const defaultSortOrder = 'desc';

    let sortBy = req.query.sortBy as string || defaultSortBy;
    // FIX: Ensure fallback happens *before* using sortBy in the query
    if (!allowedSortFields.includes(sortBy)) {
        sortBy = defaultSortBy; // Fallback to default if invalid field provided
    }

    let sortOrder = (req.query.sortOrder as string || defaultSortOrder).toLowerCase();
    if (sortOrder !== 'asc' && sortOrder !== 'desc') {
        sortOrder = defaultSortOrder; // Fallback to default if invalid order provided
    }

    // 4. Validate pagination parameters
    if (isNaN(page) || page < 1 || isNaN(limit) || limit < 1) {
        // Use AppError for correct status code handling
        return next(new AppError('Invalid pagination parameters. Page and limit must be positive integers.', 400));
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

        // Dynamically construct ORDER BY clause safely using the *final* validated sortBy/sortOrder
        let orderByRaw;
        if (sortBy === 'title') {
            // Apply LOWER() for case-insensitive title sort
            // Use Prisma.raw for the sortOrder part to prevent SQL injection
            orderByRaw = Prisma.sql`ORDER BY LOWER("title") ${Prisma.raw(sortOrder)}`;
        } else { // Default to createdAt (or other validated fields)
            // Use Prisma.raw for the sortOrder part
            orderByRaw = Prisma.sql`ORDER BY "createdAt" ${Prisma.raw(sortOrder)}`;
        }

        // Combine clauses for data query
        const dataQuery = Prisma.sql`
            SELECT * FROM script_snips
            ${whereClause}
            ${orderByRaw} -- Apply dynamic ORDER BY using final validated values
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

        // FIX: Correctly parse count from the result (which is an array with one object)
        // and handle potential BigInt return type from raw query count
        if (Array.isArray(countResult) && countResult.length > 0 && countResult[0] && typeof countResult[0].count !== 'undefined') {
             try {
                // Use parseInt or Number() to handle potential BigInt
                totalScripts = parseInt(String(countResult[0].count), 10);
             } catch (e) {
                 console.warn("Could not parse count from raw query result:", countResult, e);
                 // Decide how to handle - throw error, default to 0, etc.
                 totalScripts = 0; // Defaulting to 0 if parsing fails
             }
        } else {
             console.warn("Unexpected count query result format:", countResult);
             totalScripts = 0; // Defaulting to 0 if format is wrong
        }


        // 7. Calculate total pages
        const totalPages = Math.ceil(totalScripts / limit);

        // 8. Send response
        res.status(200).json({
            data: scripts,
            pagination: {
                totalItems: totalScripts,
                currentPage: page,
                totalPages,
                pageSize: limit, // Ensure pageSize is included
                sortBy, // Use validated sortBy
                sortOrder // Use validated sortOrder
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
        const count = await prisma.scriptSnip.count();

        if (count === 0) {
            // Use AppError for correct status code handling
            return next(new AppError('No scripts available to choose from.', 404));
        }

        const randomIndex = Math.floor(Math.random() * count);
        const randomScript = await prisma.scriptSnip.findFirst({ skip: randomIndex });

        if (!randomScript) {
             console.error("Failed to find random script despite count > 0. Index:", randomIndex, "Count:", count);
             // Use AppError for internal server errors too, if desired, or keep generic Error for 500
             return next(new AppError('Failed to retrieve a random script.', 500)); // Or keep as new Error() if 500 is acceptable default
        }

        res.status(200).json(randomScript);
    } catch (error) {
        next(error);
    }
};


// --- READ MULTIPLE RANDOM ---
export const getRandomScripts = async (req: Request, res: Response, next: NextFunction) => {
    const countParam = req.query.count as string;
    let count = 3;
    if (countParam) {
        const parsedCount = parseInt(countParam, 10);

        // Handle count=0 explicitly (assuming 200 OK with empty array is desired)
        if (parsedCount === 0) {
             res.status(200).json([]);
             return
        }

        // Check for NaN or negative numbers
        if (isNaN(parsedCount) || parsedCount < 0) {
             // Use AppError for correct status code handling
             return next(new AppError('Invalid count parameter. Must be a positive integer.', 400));
        }
        count = parsedCount;
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


// --- READ MULTIPLE BY ID ---
export const getScriptsByIds = async (req: Request, res: Response, next: NextFunction) => {
    // FIX: Read IDs from request body
    const { ids } = req.body;

    // Validate input: Ensure 'ids' is a non-empty array of strings
    if (!Array.isArray(ids) || ids.length === 0 || !ids.every(id => typeof id === 'string')) {
        return next(new AppError('Invalid input: \'ids\' must be a non-empty array of strings.', 400));
    }

    try {
        const scripts = await prisma.scriptSnip.findMany({
            where: {
                id: {
                    in: ids,
                },
            },
        });

        // Note: findMany doesn't error if some IDs aren't found, it just returns the ones it finds.
        res.status(200).json(scripts);

    } catch (error) {
        // Handle potential database errors or other unexpected issues
        console.error("Error in getScriptsByIds:", error);
        next(error); // Pass to the central error handler
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