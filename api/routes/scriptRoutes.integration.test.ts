import request from 'supertest';
const mainApp = require('../index');
import prisma from '../db';
import { Prisma } from '@prisma/client'; // <-- Add this line

// Mock Prisma globally - This replaces the actual '../db' module export
// with the object defined in the factory function.
jest.mock('../db', () => {
    return {
      __esModule: true, // Important for ES Module interop
      default: {        // The actual mock object is the default export
        scriptSnip: {
          findMany: jest.fn(),
          findUnique: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
      },
    };
});

// --- Tests for General App Routes ---
describe('General App Routes', () => {
    it('GET / should return status 200 and welcome message', async () => {
        const response = await request(mainApp)
            .get('/')
            .expect('Content-Type', /html/) // Default is text/html for .send()
            .expect(200);

        expect(response.text).toBe('Basic Server Root OK - Updated Structure');
    });

    it('GET /test should return status 200 and test message', async () => {
        const response = await request(mainApp)
            .get('/test')
            .expect('Content-Type', /html/)
            .expect(200);

        expect(response.text).toBe('Test route OK - Updated Structure');
    });
});

// Main describe block for most tests (without module reset)
describe('Script API Integration Tests (Standard)', () => {

    beforeEach(() => {
        // Reset calls to the globally mocked 'prisma' object's methods
        jest.clearAllMocks();
    });

    // --- Tests for GET /api/scripts ---
    describe('GET /api/scripts', () => {
        it('should return an array of scripts and status 200', async () => {
            const mockScripts = [
                { id: '1', title: 'Script 1', characters: [], lines: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
                { id: '2', title: 'Script 2', characters: [], lines: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
            ];
            // Configure the mock using the imported 'prisma' variable
            (prisma.scriptSnip.findMany as jest.Mock).mockResolvedValue(mockScripts);

            const response = await request(mainApp)
                .get('/api/scripts')
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toEqual(mockScripts);
            // Verify using the imported 'prisma' variable
            expect(prisma.scriptSnip.findMany).toHaveBeenCalledTimes(1);
        });

        it('should return status 500 if database query fails', async () => {
            const mockError = new Error('Database connection failed');
            // Configure the mock using the imported 'prisma' variable
            (prisma.scriptSnip.findMany as jest.Mock).mockRejectedValue(mockError);

            const response = await request(mainApp)
                .get('/api/scripts')
                .expect('Content-Type', /json/)
                .expect(500);

            expect(response.body).toEqual({ error: 'Database connection failed' });
            // Verify using the imported 'prisma' variable
            expect(prisma.scriptSnip.findMany).toHaveBeenCalledTimes(1);
        });
    });

    // --- Tests for POST /api/scripts (excluding rate limit) ---
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
            // Configure the mock using the imported 'prisma' variable
            (prisma.scriptSnip.create as jest.Mock).mockResolvedValue(mockCreatedScript);

            const response = await request(mainApp)
                .post('/api/scripts')
                .send(validScriptData)
                .expect('Content-Type', /json/)
                .expect(201);

            expect(response.body).toEqual(mockCreatedScript);
            // Verify using the imported 'prisma' variable
            expect(prisma.scriptSnip.create).toHaveBeenCalledTimes(1);
            expect(prisma.scriptSnip.create).toHaveBeenCalledWith({ data: validScriptData });
        });

        it('should return 400 on invalid input (Zod validation)', async () => {
            const invalidData = {
                title: 'Invalid',
                // Missing characters and lines which are required by schema
            };

            const response = await request(mainApp)
                .post('/api/scripts')
                .send(invalidData)
                .expect('Content-Type', /json/)
                .expect(400);

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

            // Verify using the imported 'prisma' variable
            expect(prisma.scriptSnip.create).not.toHaveBeenCalled();
        });

    });

    // --- Tests for GET /api/scripts/:id ---
    describe('GET /api/scripts/:id', () => {
        const scriptId = 'test-get-id-123';
        const mockScript = {
            id: scriptId,
            title: 'Specific Script',
            characters: ['Char1'],
            lines: [{ character: 'Char1', dialogue: 'Hello' }],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        it('should return a script and status 200 if found', async () => {
            (prisma.scriptSnip.findUnique as jest.Mock).mockResolvedValue(mockScript);

            const response = await request(mainApp)
                .get(`/api/scripts/${scriptId}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toEqual(mockScript);
            expect(prisma.scriptSnip.findUnique).toHaveBeenCalledTimes(1);
            expect(prisma.scriptSnip.findUnique).toHaveBeenCalledWith({ where: { id: scriptId } });
        });

        it('should return status 404 if script not found', async () => {
            (prisma.scriptSnip.findUnique as jest.Mock).mockResolvedValue(null); // Simulate not found

            const response = await request(mainApp)
                .get(`/api/scripts/${scriptId}`)
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body).toEqual({ error: 'Script not found' });
            expect(prisma.scriptSnip.findUnique).toHaveBeenCalledTimes(1);
        });

        it('should return status 500 if database query fails', async () => {
            const mockError = new Error('DB findUnique failed');
            (prisma.scriptSnip.findUnique as jest.Mock).mockRejectedValue(mockError);

            const response = await request(mainApp)
                .get(`/api/scripts/${scriptId}`)
                .expect('Content-Type', /json/)
                .expect(500);

            expect(response.body).toEqual({ error: 'DB findUnique failed' });
            expect(prisma.scriptSnip.findUnique).toHaveBeenCalledTimes(1);
        });
    });

    // --- Tests for PUT /api/scripts/:id ---
    describe('PUT /api/scripts/:id', () => {
        const scriptId = 'test-put-id-456';
        const updateData = {
            title: 'Updated Script Title',
            characters: ['Char1', 'Char2'],
            // lines not provided, should be allowed by update schema
        };
        const mockUpdatedScript = {
            id: scriptId,
            title: 'Updated Script Title',
            characters: ['Char1', 'Char2'],
            lines: [], // Assuming original lines persisted or schema allows partial update
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        it('should update script and return 200 on valid input', async () => {
            (prisma.scriptSnip.update as jest.Mock).mockResolvedValue(mockUpdatedScript);

            const response = await request(mainApp)
                .put(`/api/scripts/${scriptId}`)
                .send(updateData)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toEqual(mockUpdatedScript);
            expect(prisma.scriptSnip.update).toHaveBeenCalledTimes(1);
            expect(prisma.scriptSnip.update).toHaveBeenCalledWith({
                where: { id: scriptId },
                data: updateData,
            });
        });

        it('should return 400 on invalid input (Zod validation)', async () => {
            const invalidUpdateData = { title: 123 }; // Invalid type for title

            const response = await request(mainApp)
                .put(`/api/scripts/${scriptId}`)
                .send(invalidUpdateData)
                .expect('Content-Type', /json/)
                .expect(400);

            expect(response.body).toHaveProperty('error', 'Invalid input data');
            expect(response.body.details).toEqual(expect.arrayContaining([
                expect.objectContaining({ path: 'title' })
            ]));
            expect(prisma.scriptSnip.update).not.toHaveBeenCalled();
        });

        it('should return 404 if script to update is not found (Prisma P2025)', async () => {
            const notFoundError = new Prisma.PrismaClientKnownRequestError(
                'Record to update not found.',
                { code: 'P2025', clientVersion: 'x.y.z' }
            );
            (prisma.scriptSnip.update as jest.Mock).mockRejectedValue(notFoundError);

            const response = await request(mainApp)
                .put(`/api/scripts/${scriptId}`)
                .send(updateData)
                .expect('Content-Type', /json/)
                .expect(404); // Handled by errorHandler for P2025

            expect(response.body).toEqual({ error: 'Resource not found' });
            expect(prisma.scriptSnip.update).toHaveBeenCalledTimes(1);
        });
    });

    // --- Tests for DELETE /api/scripts/:id ---
    describe('DELETE /api/scripts/:id', () => {
        const scriptId = 'test-delete-id-789';

        it('should delete script and return 204 on success', async () => {
            // Prisma delete returns the deleted object, but we don't need it here
            (prisma.scriptSnip.delete as jest.Mock).mockResolvedValue({ id: scriptId });

            await request(mainApp)
                .delete(`/api/scripts/${scriptId}`)
                .expect(204); // No content on successful delete

            expect(prisma.scriptSnip.delete).toHaveBeenCalledTimes(1);
            expect(prisma.scriptSnip.delete).toHaveBeenCalledWith({ where: { id: scriptId } });
        });

        it('should return 404 if script to delete is not found (Prisma P2025)', async () => {
            const notFoundError = new Prisma.PrismaClientKnownRequestError(
                'Record to delete not found.',
                { code: 'P2025', clientVersion: 'x.y.z' }
            );
            (prisma.scriptSnip.delete as jest.Mock).mockRejectedValue(notFoundError);

            const response = await request(mainApp)
                .delete(`/api/scripts/${scriptId}`)
                .expect('Content-Type', /json/)
                .expect(404); // Handled by errorHandler for P2025

            expect(response.body).toEqual({ error: 'Resource not found' });
            expect(prisma.scriptSnip.delete).toHaveBeenCalledTimes(1);
        });

         it('should return status 500 if database query fails', async () => {
            const mockError = new Error('DB delete failed');
            (prisma.scriptSnip.delete as jest.Mock).mockRejectedValue(mockError);

            const response = await request(mainApp)
                .delete(`/api/scripts/${scriptId}`)
                .expect('Content-Type', /json/)
                .expect(500);

            expect(response.body).toEqual({ error: 'DB delete failed' });
            expect(prisma.scriptSnip.delete).toHaveBeenCalledTimes(1);
        });
    });

    // --- Add other standard tests (GET /:id, PUT, DELETE) here later ---

});

// Separate describe block specifically for rate limit testing
describe('Script API Integration Tests (Rate Limiting)', () => {
    let app: any;
    let localPrisma: typeof prisma;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
        app = require('../index');
        localPrisma = require('../db').default;

        if (!jest.isMockFunction(localPrisma.scriptSnip.create)) {
             localPrisma.scriptSnip.create = jest.fn();
        }
        (localPrisma.scriptSnip.create as jest.Mock).mockClear();
    });

    it('should return 429 Too Many Requests after exceeding POST limit', async () => {
        const limit = 20;
        const validScriptData = {
            title: 'Rate Limit Test Script',
            characters: ['Limiter'],
            lines: [{ character: 'Limiter', dialogue: 'Testing...' }],
        };
        const mockCreatedScript = { id: 'rate-limit-id', ...validScriptData, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };

        (localPrisma.scriptSnip.create as jest.Mock).mockResolvedValue(mockCreatedScript);

        // Make 'limit' number of successful requests using the fresh 'app'
        for (let i = 0; i < limit; i++) {
            // Removed the try...catch block here
            await request(app)
                .post('/api/scripts')
                .send(validScriptData)
                .expect(201);
        }

        // The (limit + 1)th request should be rate limited
        const response = await request(app)
            .post('/api/scripts')
            .send(validScriptData)
            .expect('Content-Type', /text\/html/)
            .expect(429);

        expect(response.text).toBe('Too many scripts created from this IP, please try again after an hour');
        expect(localPrisma.scriptSnip.create).toHaveBeenCalledTimes(limit);
    }, 15000);
});