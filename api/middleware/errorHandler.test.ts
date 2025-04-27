import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodIssue } from 'zod';
import { Prisma } from '@prisma/client';
import { errorHandler, AppError } from './errorHandler'; // Adjust path if needed

// Mock Request, Response, NextFunction
const mockRequest = {} as Request;
const mockResponse = {
    status: vi.fn().mockReturnThis(), // Allows chaining .status().json()
    json: vi.fn(),
} as unknown as Response;
const mockNext = vi.fn() as NextFunction;

// Mock console.error to prevent cluttering test output and allow assertions
vi.spyOn(console, 'error').mockImplementation(() => {});

describe('Error Handler Middleware', () => {

    beforeEach(() => {
        // Reset mocks before each test
        vi.clearAllMocks();
    });

    it('should handle AppError', () => {
        const error = new AppError('Resource not available', 404);
        errorHandler(error, mockRequest, mockResponse, mockNext);

        expect(console.error).toHaveBeenCalledWith("Central Error Handler Caught:", error);
        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Resource not available' });
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle ZodError', () => {
        // Create a mock ZodError
        const zodIssues: ZodIssue[] = [
            { code: 'invalid_type', expected: 'string', received: 'number', path: ['title'], message: 'Title must be a string' },
            { code: 'too_small', minimum: 1, type: 'array', inclusive: true, exact: false, message: 'Characters cannot be empty', path: ['characters'] }
        ];
        const error = new ZodError(zodIssues);
        errorHandler(error, mockRequest, mockResponse, mockNext);

        expect(console.error).toHaveBeenCalledWith("Central Error Handler Caught:", error);
        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: 'Invalid input data',
            details: [
                { path: 'title', message: 'Title must be a string' },
                { path: 'characters', message: 'Characters cannot be empty' }
            ]
        });
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle PrismaClientKnownRequestError (P2025 - Not Found)', () => {
        const error = new Prisma.PrismaClientKnownRequestError(
            'Record not found',
            { code: 'P2025', clientVersion: 'mock' }
        );
        errorHandler(error, mockRequest, mockResponse, mockNext);

        expect(console.error).toHaveBeenCalledWith("Central Error Handler Caught:", error);
        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Resource not found' });
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle other PrismaClientKnownRequestError (default case)', () => {
        const error = new Prisma.PrismaClientKnownRequestError(
            'Unique constraint failed',
            { code: 'P2002', clientVersion: 'mock', meta: { target: ['email'] } } // Example meta
        );
        errorHandler(error, mockRequest, mockResponse, mockNext);

        expect(console.error).toHaveBeenCalledWith("Central Error Handler Caught:", error);
        expect(mockResponse.status).toHaveBeenCalledWith(500); // Default status code
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: 'Database request failed',
            details: 'Unique constraint failed' // Uses err.message
        });
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle generic Error', () => {
        const error = new Error('Something broke');
        errorHandler(error, mockRequest, mockResponse, mockNext);

        expect(console.error).toHaveBeenCalledWith("Central Error Handler Caught:", error);
        expect(mockResponse.status).toHaveBeenCalledWith(500); // Default status code
        expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Something broke' });
        expect(mockNext).not.toHaveBeenCalled();
    });

     it('should handle JSON SyntaxError from body-parser', () => {
        // Simulate the error structure Express/body-parser provides
        const error = new SyntaxError('Unexpected token i in JSON at position 0');
        (error as any).status = 400; // Add properties typical of body-parser errors
        (error as any).body = '{invalid json}';
        errorHandler(error, mockRequest, mockResponse, mockNext);

        expect(console.error).toHaveBeenCalledWith("Central Error Handler Caught:", error);
        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: 'Invalid JSON payload received',
            details: 'Unexpected token i in JSON at position 0'
        });
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle non-Error objects/values', () => {
        const error = { message: 'Just an object', detail: 'Some detail' }; // Not an instance of Error
        errorHandler(error, mockRequest, mockResponse, mockNext);

        expect(console.error).toHaveBeenCalledWith("Central Error Handler Caught:", error);
        expect(mockResponse.status).toHaveBeenCalledWith(500); // Default status code
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: 'An unexpected internal server error occurred' // Default message
        });
        expect(mockNext).not.toHaveBeenCalled();
    });

     it('should handle null/undefined errors', () => {
        const error = null;
        errorHandler(error, mockRequest, mockResponse, mockNext);

        expect(console.error).toHaveBeenCalledWith("Central Error Handler Caught:", error);
        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: 'An unexpected internal server error occurred'
        });
        expect(mockNext).not.toHaveBeenCalled();
    });
});