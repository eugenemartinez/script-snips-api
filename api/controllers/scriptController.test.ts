import { Request, Response, NextFunction } from 'express';
import {
    createScript,
    getAllScripts,
    getScriptById,
    updateScript,
    deleteScript
} from './scriptController'; // Import all functions
import prisma from '../db';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client'; // Import Prisma types for error simulation

// Mock the Prisma client - Add mocks for findMany, findUnique, update, delete
jest.mock('../db', () => {
    return {
      __esModule: true,
      default: {
        scriptSnip: {
          create: jest.fn(),
          findMany: jest.fn(),     // Mock findMany
          findUnique: jest.fn(),   // Mock findUnique
          update: jest.fn(),       // Mock update
          delete: jest.fn(),       // Mock delete
        },
      },
    };
});

// --- Test Suite for createScript ---
describe('Script Controller - createScript', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = {
      body: { // Sample valid body
        title: 'Test Script',
        characters: ['Char1', 'Char2'],
        lines: [{ character: 'Char1', dialogue: 'Hello' }],
      },
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(), // Chainable status function
      json: jest.fn(), // Mock json function
    };
    // Reset mockNext as well if needed, though jest.clearAllMocks might cover it
    mockNext = jest.fn();
  });

  it('should create a script and return 201 on valid input', async () => {
    const mockCreatedScript = {
      id: 'test-id-123',
      ...mockRequest.body,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockRequest.body = { // Ensure body is set for this test
        title: 'Test Script',
        characters: ['Char1', 'Char2'],
        lines: [{ character: 'Char1', dialogue: 'Hello' }],
    };

    // Cast prisma.scriptSnip.create directly to jest.Mock when configuring it
    (prisma.scriptSnip.create as jest.Mock).mockResolvedValue(mockCreatedScript);

    await createScript(mockRequest as Request, mockResponse as Response, mockNext);

    // Assertions
    expect(prisma.scriptSnip.create).toHaveBeenCalledTimes(1);
    expect(prisma.scriptSnip.create).toHaveBeenCalledWith({
      data: {
        title: 'Test Script',
        characters: ['Char1', 'Char2'],
        lines: [{ character: 'Char1', dialogue: 'Hello' }],
      },
    });
    expect(mockResponse.status).toHaveBeenCalledWith(201);
    expect(mockResponse.json).toHaveBeenCalledWith(mockCreatedScript);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should call next with error on invalid input (Zod validation)', async () => {
    mockRequest.body = {
        title: 'Invalid',
        characters: [],
        lines: []
    };

    await createScript(mockRequest as Request, mockResponse as Response, mockNext);

    // Assertions
    expect(prisma.scriptSnip.create).not.toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
    expect(mockResponse.json).not.toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalledTimes(1);
    // Check specifically for ZodError instance
    expect(mockNext).toHaveBeenCalledWith(expect.any(ZodError));
  });

   it('should call next with error if Prisma create fails', async () => {
    const mockError = new Error('Database connection failed');
    mockRequest.body = { // Ensure body is set for this test
        title: 'Test Script',
        characters: ['Char1', 'Char2'],
        lines: [{ character: 'Char1', dialogue: 'Hello' }],
    };

    // Cast prisma.scriptSnip.create directly to jest.Mock when configuring it
    (prisma.scriptSnip.create as jest.Mock).mockRejectedValue(mockError);

    await createScript(mockRequest as Request, mockResponse as Response, mockNext);

    // Assertions
    expect(prisma.scriptSnip.create).toHaveBeenCalledTimes(1);
    expect(mockResponse.status).not.toHaveBeenCalled();
    expect(mockResponse.json).not.toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext).toHaveBeenCalledWith(mockError);
  });

  it('should use "Untitled" as title if title is not provided', async () => {
    const mockCreatedScript = {
      id: 'test-id-456',
      title: 'Untitled', // Expecting the default title
      characters: ['CharA'],
      lines: [{ character: 'CharA', dialogue: 'Line' }],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    // Set up request body *without* title
    mockRequest.body = {
        // title: undefined, // Explicitly undefined or just omit it
        characters: ['CharA'],
        lines: [{ character: 'CharA', dialogue: 'Line' }],
    };

    // Configure mock Prisma create
    (prisma.scriptSnip.create as jest.Mock).mockResolvedValue(mockCreatedScript);

    // Call the controller function
    await createScript(mockRequest as Request, mockResponse as Response, mockNext);

    // Assertions
    expect(prisma.scriptSnip.create).toHaveBeenCalledTimes(1);
    // Check that Prisma was called with the default title
    expect(prisma.scriptSnip.create).toHaveBeenCalledWith({
      data: {
        title: 'Untitled', // Verify the default was used
        characters: ['CharA'],
        lines: [{ character: 'CharA', dialogue: 'Line' }],
      },
    });
    expect(mockResponse.status).toHaveBeenCalledWith(201);
    expect(mockResponse.json).toHaveBeenCalledWith(mockCreatedScript);
    expect(mockNext).not.toHaveBeenCalled();
  });

});

// --- Test Suite for getAllScripts ---
describe('Script Controller - getAllScripts', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        mockRequest = {}; // No body/params needed for getAll
        mockResponse = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        mockNext = jest.fn();
    });

    it('should return all scripts and status 200', async () => {
        const mockScripts = [
            { id: '1', title: 'Script 1', characters: [], lines: [], createdAt: new Date(), updatedAt: new Date() },
            { id: '2', title: 'Script 2', characters: [], lines: [], createdAt: new Date(), updatedAt: new Date() },
        ];
        (prisma.scriptSnip.findMany as jest.Mock).mockResolvedValue(mockScripts);

        await getAllScripts(mockRequest as Request, mockResponse as Response, mockNext);

        expect(prisma.scriptSnip.findMany).toHaveBeenCalledTimes(1);
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith(mockScripts);
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with error if Prisma findMany fails', async () => {
        const mockError = new Error('DB error on findMany');
        (prisma.scriptSnip.findMany as jest.Mock).mockRejectedValue(mockError);

        await getAllScripts(mockRequest as Request, mockResponse as Response, mockNext);

        expect(prisma.scriptSnip.findMany).toHaveBeenCalledTimes(1);
        expect(mockResponse.status).not.toHaveBeenCalled();
        expect(mockResponse.json).not.toHaveBeenCalled();
        expect(mockNext).toHaveBeenCalledWith(mockError);
    });
});

// --- Test Suite for getScriptById ---
describe('Script Controller - getScriptById', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        mockRequest = { params: { id: 'test-id-1' } }; // Set params.id
        mockResponse = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        mockNext = jest.fn();
    });

    it('should return a script and status 200 if found', async () => {
        const mockScript = { id: 'test-id-1', title: 'Found Script', characters: [], lines: [], createdAt: new Date(), updatedAt: new Date() };
        (prisma.scriptSnip.findUnique as jest.Mock).mockResolvedValue(mockScript);

        await getScriptById(mockRequest as Request, mockResponse as Response, mockNext);

        expect(prisma.scriptSnip.findUnique).toHaveBeenCalledWith({ where: { id: 'test-id-1' } });
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith(mockScript);
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 404 if script not found', async () => {
        (prisma.scriptSnip.findUnique as jest.Mock).mockResolvedValue(null); // Simulate not found

        await getScriptById(mockRequest as Request, mockResponse as Response, mockNext);

        expect(prisma.scriptSnip.findUnique).toHaveBeenCalledWith({ where: { id: 'test-id-1' } });
        expect(mockResponse.status).toHaveBeenCalledWith(404); // Controller handles this directly
        expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Script not found' });
        expect(mockNext).not.toHaveBeenCalled(); // next() should not be called here
    });

    it('should call next with error if Prisma findUnique fails', async () => {
        const mockError = new Error('DB error on findUnique');
        (prisma.scriptSnip.findUnique as jest.Mock).mockRejectedValue(mockError);

        await getScriptById(mockRequest as Request, mockResponse as Response, mockNext);

        expect(prisma.scriptSnip.findUnique).toHaveBeenCalledWith({ where: { id: 'test-id-1' } });
        expect(mockResponse.status).not.toHaveBeenCalled();
        expect(mockResponse.json).not.toHaveBeenCalled();
        expect(mockNext).toHaveBeenCalledWith(mockError);
    });
});


// --- Test Suite for updateScript ---
describe('Script Controller - updateScript', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        mockRequest = {
            params: { id: 'update-id-1' },
            body: { title: 'Updated Title' } // Valid update body
        };
        mockResponse = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        mockNext = jest.fn();
    });

    it('should update script and return 200 on valid input', async () => {
        const mockUpdatedScript = { id: 'update-id-1', title: 'Updated Title', characters: [], lines: [], createdAt: new Date(), updatedAt: new Date() };
        (prisma.scriptSnip.update as jest.Mock).mockResolvedValue(mockUpdatedScript);

        await updateScript(mockRequest as Request, mockResponse as Response, mockNext);

        expect(prisma.scriptSnip.update).toHaveBeenCalledWith({
            where: { id: 'update-id-1' },
            data: { title: 'Updated Title' }
        });
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith(mockUpdatedScript);
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with error on invalid input (Zod validation)', async () => {
        mockRequest.body = { title: '' }; // Invalid update body (if schema requires min length > 0)
        // Or send empty body {} which violates refine rule
        mockRequest.body = {};

        await updateScript(mockRequest as Request, mockResponse as Response, mockNext);

        expect(prisma.scriptSnip.update).not.toHaveBeenCalled();
        expect(mockNext).toHaveBeenCalledWith(expect.any(ZodError));
    });

    it('should call next with error if Prisma update fails (e.g., not found)', async () => {
        // Simulate Prisma P2025 error
        const mockError = new Prisma.PrismaClientKnownRequestError(
            'Record to update not found.',
            { code: 'P2025', clientVersion: 'x.y.z' }
        );
        (prisma.scriptSnip.update as jest.Mock).mockRejectedValue(mockError);

        await updateScript(mockRequest as Request, mockResponse as Response, mockNext);

        expect(prisma.scriptSnip.update).toHaveBeenCalledTimes(1);
        expect(mockNext).toHaveBeenCalledWith(mockError);
    });
});

// --- Test Suite for deleteScript ---
describe('Script Controller - deleteScript', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        mockRequest = { params: { id: 'delete-id-1' } };
        mockResponse = { status: jest.fn().mockReturnThis(), send: jest.fn() }; // Use send for 204
        mockNext = jest.fn();
    });

    it('should delete script and return 204 on success', async () => {
        (prisma.scriptSnip.delete as jest.Mock).mockResolvedValue({}); // Return value doesn't matter

        await deleteScript(mockRequest as Request, mockResponse as Response, mockNext);

        expect(prisma.scriptSnip.delete).toHaveBeenCalledWith({ where: { id: 'delete-id-1' } });
        expect(mockResponse.status).toHaveBeenCalledWith(204);
        expect(mockResponse.send).toHaveBeenCalledTimes(1);
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with error if Prisma delete fails (e.g., not found)', async () => {
        // Simulate Prisma P2025 error
        const mockError = new Prisma.PrismaClientKnownRequestError(
            'Record to delete not found.',
            { code: 'P2025', clientVersion: 'x.y.z' }
        );
        (prisma.scriptSnip.delete as jest.Mock).mockRejectedValue(mockError);

        await deleteScript(mockRequest as Request, mockResponse as Response, mockNext);

        expect(prisma.scriptSnip.delete).toHaveBeenCalledTimes(1);
        expect(mockResponse.status).not.toHaveBeenCalled();
        expect(mockResponse.send).not.toHaveBeenCalled();
        expect(mockNext).toHaveBeenCalledWith(mockError);
    });
});