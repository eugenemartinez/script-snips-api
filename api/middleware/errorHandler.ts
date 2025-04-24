import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client'; // Import Prisma types for error checking

// Helper function to format Zod errors (can be moved here or kept in controllers/utils)
const formatZodError = (error: ZodError) => {
    return error.errors.map(err => ({ path: err.path.join('.'), message: err.message }));
};

// Extend Error class to include statusCode (optional but useful)
// Define AppError *before* errorHandler uses it
export class AppError extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
        // Ensure the name of this error is the same as the class name
        this.name = this.constructor.name;
        // Capture the stack trace
        Error.captureStackTrace(this, this.constructor);
    }
}

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    console.error("Central Error Handler Caught:", err); // Log the error for debugging

    let statusCode = 500;
    let responseBody: { error: string; details?: any } = {
        error: 'An unexpected internal server error occurred',
    };

    // Check for JSON parsing SyntaxError *before* generic Error
    if (err instanceof SyntaxError && 'status' in err && err.status === 400 && 'body' in err) {
        statusCode = 400;
        responseBody = { error: 'Invalid JSON payload received', details: err.message };
    } else if (err instanceof ZodError) {
        statusCode = 400;
        responseBody = {
            error: 'Invalid input data',
            details: formatZodError(err),
        };
    } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
        // Handle known Prisma request errors (like P2025 - Record Not Found)
        switch (err.code) {
            case 'P2025':
                statusCode = 404;
                responseBody = { error: 'Resource not found' };
                break;
            // Add other Prisma error codes as needed
            // case 'P2002': // Unique constraint violation
            //     statusCode = 409; // Conflict
            //     responseBody = { error: 'Unique constraint violation', details: err.meta?.target };
            //     break;
            default:
                statusCode = 500; // Or maybe 400 depending on the Prisma error
                responseBody = { error: 'Database request failed', details: err.message };
                break;
        }
    } else if (err instanceof AppError) { // Check for AppError first
        statusCode = err.statusCode;
        responseBody = { error: err.message };
    } else if (err instanceof Error) { // Handle generic Error last
        // Generic Error doesn't have statusCode, default to 500
        responseBody = { error: err.message || 'An error occurred' };
        // statusCode remains 500 (default)
    }
    // Add checks for other specific error types if necessary

    res.status(statusCode).json(responseBody);
};