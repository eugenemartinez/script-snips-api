import request from 'supertest';
// Change the app import to use require
const app = require('../index'); // Use require for CommonJS export

import prisma from '../db'; // Import prisma to mock its methods

// Mock the Prisma client methods used by the endpoints being tested
jest.mock('../db', () => {
    return {
      __esModule: true,
      default: {
        scriptSnip: {
          // Mock methods needed for the routes under test
          findMany: jest.fn(),
          findUnique: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
      },
    };
});

describe('Script API Integration Tests', () => {

    beforeEach(() => {
        // Reset mocks before each test
        jest.clearAllMocks();
        // Reset rate limiter state if necessary (memory store usually resets with app instance, but good practice if using external store)
        // For express-rate-limit's default MemoryStore, state is typically per-instance, so restarting tests is usually enough.
    });

    // --- Tests for GET /api/scripts ---
    describe('GET /api/scripts', () => {
        it('should return an array of scripts and status 200', async () => {
            const mockScripts = [
                { id: '1', title: 'Script 1', characters: [], lines: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
                { id: '2', title: 'Script 2', characters: [], lines: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
            ];
            // Configure the mock for findMany
            (prisma.scriptSnip.findMany as jest.Mock).mockResolvedValue(mockScripts);

            // Use supertest to make the request
            const response = await request(app)
                .get('/api/scripts')
                .expect('Content-Type', /json/) // Optional: Check Content-Type header
                .expect(200); // Assert status code

            // Assert the response body
            expect(response.body).toEqual(mockScripts);
            // Verify that the mock was called
            expect(prisma.scriptSnip.findMany).toHaveBeenCalledTimes(1);
        });

        it('should return status 500 if database query fails', async () => {
            const mockError = new Error('Database connection failed');
            // Configure the mock to reject
            (prisma.scriptSnip.findMany as jest.Mock).mockRejectedValue(mockError);

            // Use supertest to make the request
            const response = await request(app)
                .get('/api/scripts')
                .expect('Content-Type', /json/)
                .expect(500); // Assert status code 500 (handled by errorHandler)

            // Assert the error response body (based on your errorHandler)
            expect(response.body).toEqual({ error: 'Database connection failed' });
             // Verify that the mock was called
            expect(prisma.scriptSnip.findMany).toHaveBeenCalledTimes(1);
        });
    });

    // --- Tests for POST /api/scripts ---
    describe('POST /api/scripts', () => {
        const validScriptData = {
            title: 'New Integration Script',
            characters: ['Tester'],
            lines: [{ character: 'Tester', dialogue: 'Testing POST...' }],
        };
        const mockCreatedScript = {
            id: 'new-post-id-123',
            ...validScriptData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        it('should create a script and return 201 on valid input', async () => {
            // Configure the mock for create
            (prisma.scriptSnip.create as jest.Mock).mockResolvedValue(mockCreatedScript);

            const response = await request(app)
                .post('/api/scripts')
                .send(validScriptData) // Send data in the request body
                .expect('Content-Type', /json/)
                .expect(201);

            expect(response.body).toEqual(mockCreatedScript);
            expect(prisma.scriptSnip.create).toHaveBeenCalledTimes(1);
            expect(prisma.scriptSnip.create).toHaveBeenCalledWith({ data: validScriptData });
        });

        it('should return 400 on invalid input (Zod validation)', async () => {
            const invalidData = {
                title: 'Invalid',
                // Missing characters and lines which are required by schema
            };

            const response = await request(app)
                .post('/api/scripts')
                .send(invalidData)
                .expect('Content-Type', /json/)
                .expect(400);

            // Check for the specific Zod error structure from errorHandler
            expect(response.body).toHaveProperty('error', 'Invalid input data');
            expect(response.body).toHaveProperty('details');
            expect(response.body.details).toBeInstanceOf(Array);
            expect(response.body.details.length).toBeGreaterThan(0);
            // Optionally check for specific error messages
            expect(response.body.details).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ path: 'characters' }), // Check that errors for characters exist
                    expect.objectContaining({ path: 'lines' })      // Check that errors for lines exist
                ])
            );

            expect(prisma.scriptSnip.create).not.toHaveBeenCalled();
        });

        // Test rate limiting (adjust 'max' based on your rateLimiter config)
        // Note: This test can be slow as it makes multiple requests.
        it('should return 429 Too Many Requests after exceeding limit', async () => {
            const limit = 20; // From createScriptLimiter config
            // Configure the mock to succeed for the allowed requests
            (prisma.scriptSnip.create as jest.Mock).mockResolvedValue(mockCreatedScript);

            // Make 'limit' number of successful requests
            for (let i = 0; i < limit; i++) {
                await request(app)
                    .post('/api/scripts')
                    .send(validScriptData)
                    .expect(201); // Expect success for the first 'limit' requests
            }

            // The (limit + 1)th request should be rate limited
            const response = await request(app)
                .post('/api/scripts')
                .send(validScriptData)
                .expect('Content-Type', /text\/html/) // Rate limiter sends text/html by default
                .expect(429);

            // Check the response text (matches the 'message' in rateLimiter config)
            expect(response.text).toBe('Too many scripts created from this IP, please try again after an hour');

            // Verify create was called exactly 'limit' times
            expect(prisma.scriptSnip.create).toHaveBeenCalledTimes(limit);
        }, 15000); // Increase timeout for this test if needed (e.g., 15 seconds)

    });

    // --- Add describe blocks for other endpoints (GET /:id, PUT, DELETE) later ---
    // describe('GET /api/scripts/:id', () => { ... });
    // describe('PUT /api/scripts/:id', () => { ... });
    // describe('DELETE /api/scripts/:id', () => { ... });

});