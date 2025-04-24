import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodIssueCode } from 'zod';
import { Prisma } from '@prisma/client';
import { errorHandler, AppError } from './errorHandler'; // Import the handler and custom error

describe('Error Handler Middleware', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction = jest.fn();
    // Mock console.error to keep test output clean
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
        // Reset mocks before each test
        jest.clearAllMocks();
        // Spy on console.error and suppress its output
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        mockRequest = {}; // Mock request object (can be empty for most error tests)
        mockResponse = {
            status: jest.fn().mockReturnThis(), // Chainable status
            json: jest.fn(), // Mock json response
        };
        mockNext = jest.fn(); // Mock next function
    });

    afterEach(() => {
        // Restore console.error after each test
        consoleErrorSpy.mockRestore();
    });

    it('should handle JSON SyntaxError with status 400', () => {
        // Simulate the error object structure from express.json()
        const syntaxError = new SyntaxError('Unexpected token } in JSON at position 1');
        // Add properties typically included by body-parser/express.json
        Object.assign(syntaxError, { status: 400, body: '{invalid json', type: 'entity.parse.failed' });

        errorHandler(syntaxError, mockRequest as Request, mockResponse as Response, mockNext);

        expect(consoleErrorSpy).toHaveBeenCalled(); // Check if error was logged
        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: 'Invalid JSON payload received',
            details: 'Unexpected token } in JSON at position 1',
        });
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle ZodError with status 400 and formatted details', () => {
        // Create a sample ZodError
        const zodError = new ZodError([
            { code: ZodIssueCode.invalid_type, path: ['lines', 0, 'character'], expected: 'string', received: 'number', message: 'Expected string, received number' }
        ]);

        errorHandler(zodError, mockRequest as Request, mockResponse as Response, mockNext);

        expect(consoleErrorSpy).toHaveBeenCalled();
        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: 'Invalid input data',
            details: [{ path: 'lines.0.character', message: 'Expected string, received number' }],
        });
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle Prisma P2025 error with status 404', () => {
        const prismaError = new Prisma.PrismaClientKnownRequestError(
            'Record to process not found.',
            { code: 'P2025', clientVersion: 'x.y.z' }
        );

        errorHandler(prismaError, mockRequest as Request, mockResponse as Response, mockNext);

        expect(consoleErrorSpy).toHaveBeenCalled();
        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Resource not found' });
        expect(mockNext).not.toHaveBeenCalled();
    });

     it('should handle other Prisma known errors with status 500', () => {
        const prismaError = new Prisma.PrismaClientKnownRequestError(
            'Unique constraint failed.',
            { code: 'P2002', clientVersion: 'x.y.z', meta: { target: ['email'] } } // Example meta
        );

        errorHandler(prismaError, mockRequest as Request, mockResponse as Response, mockNext);

        expect(consoleErrorSpy).toHaveBeenCalled();
        expect(mockResponse.status).toHaveBeenCalledWith(500); // Default for unhandled Prisma codes
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: 'Database request failed',
            details: 'Unique constraint failed.',
        });
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle AppError with its specific status code and message', () => {
        const appError = new AppError('Custom application error', 403);

        errorHandler(appError, mockRequest as Request, mockResponse as Response, mockNext);

        expect(consoleErrorSpy).toHaveBeenCalled();
        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Custom application error' });
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle generic Error with status 500', () => {
        const genericError = new Error('Something went wrong');

        errorHandler(genericError, mockRequest as Request, mockResponse as Response, mockNext);

        expect(consoleErrorSpy).toHaveBeenCalled();
        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Something went wrong' });
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle generic Error with empty message using default message', () => {
        const genericError = new Error(''); // Error with empty message

        errorHandler(genericError, mockRequest as Request, mockResponse as Response, mockNext);

        expect(consoleErrorSpy).toHaveBeenCalled();
        expect(mockResponse.status).toHaveBeenCalledWith(500);
        // Check that the fallback message is used
        expect(mockResponse.json).toHaveBeenCalledWith({ error: 'An error occurred' });
        expect(mockNext).not.toHaveBeenCalled();
    });

     it('should handle non-Error types with status 500 and default message', () => {
        const nonError = { message: 'Just an object' }; // Not an instance of Error

        errorHandler(nonError, mockRequest as Request, mockResponse as Response, mockNext);

        expect(consoleErrorSpy).toHaveBeenCalled();
        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: 'An unexpected internal server error occurred', // Default message
        });
        expect(mockNext).not.toHaveBeenCalled();
    });
});