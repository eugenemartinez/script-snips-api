import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import * as scriptController from './scriptController';
import prisma from '../db'; // Import the actual path
import { AppError } from '../middleware/errorHandler';
import { Prisma } from '@prisma/client';

// Mock the prisma client
vi.mock('../db', () => ({ // Ensure path is correct
  default: {
    scriptSnip: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  },
}));

// Mock schemas
vi.mock('../schemas/scriptSchema', () => ({
    createScriptSchema: { parse: vi.fn((data) => data) },
    updateScriptSchema: { parse: vi.fn((data) => data) },
}));

// No top-level mockPrisma constant needed here if we cast inside tests

describe('Script Controller Unit Tests', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    // FIX: Use resetAllMocks
    vi.resetAllMocks();

    mockRequest = { params: {}, query: {}, body: {} };
    mockResponse = { status: vi.fn().mockReturnThis(), json: vi.fn(), send: vi.fn() };
    mockNext = vi.fn();
  });

  // --- Tests for getAllScripts ---
  describe('getAllScripts', () => {
    const mockScripts = [ { id: 's1', title: 'Script 1' }, { id: 's2', title: 'Script 2' } ];
    const mockCountResult = [{ count: BigInt(50) }];

    beforeEach(() => {
        // FIX: Correct placement of 'as any' to cast the function expression
        vi.mocked(prisma.$queryRaw).mockImplementation( (async (query: any) => {
             if (query && query.sql && query.sql.includes('COUNT(*)')) {
                 return mockCountResult;
             } else {
                 return mockScripts;
             }
        }) as any ); // <-- Cast the function itself
    });

    it('should return scripts with default pagination and sorting', async () => {
      mockRequest.query = {};
      vi.mocked(prisma.$transaction).mockResolvedValue([mockScripts, mockCountResult]);
      await scriptController.getAllScripts(mockRequest as Request, mockResponse as Response, mockNext);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ data: mockScripts, pagination: { totalItems: 50, currentPage: 1, totalPages: 5, pageSize: 10, sortBy: 'createdAt', sortOrder: 'desc' } });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle custom pagination, search, and sorting', async () => {
      const customMockScripts = [{ id: 's3', title: 'Search Result' }];
      const customMockCountResult = [{ count: BigInt(1) }];
      mockRequest.query = { page: '2', limit: '5', search: 'Result', sortBy: 'title', sortOrder: 'asc' };

      // FIX: Correct placement of 'as any' to cast the function expression
      vi.mocked(prisma.$queryRaw).mockImplementation( (async (query: any) => {
             if (query && query.sql && query.sql.includes('COUNT(*)')) {
                 return customMockCountResult;
             } else {
                 expect(query?.sql).toContain('ILIKE');
                 expect(query?.sql).toContain('ORDER BY LOWER("title")');
                 return customMockScripts;
             }
        }) as any ); // <-- Cast the function itself

       vi.mocked(prisma.$transaction).mockResolvedValue([customMockScripts, customMockCountResult]);
      await scriptController.getAllScripts(mockRequest as Request, mockResponse as Response, mockNext);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ data: customMockScripts, pagination: { totalItems: 1, currentPage: 2, totalPages: 1, pageSize: 5, sortBy: 'title', sortOrder: 'asc' } });
      expect(mockNext).not.toHaveBeenCalled();
    });

     it('should call next with AppError for invalid pagination parameters', async () => {
        mockRequest.query = { page: 'invalid', limit: '-5' };
        await scriptController.getAllScripts(mockRequest as Request, mockResponse as Response, mockNext);
        expect(prisma.$transaction).not.toHaveBeenCalled();
        expect(prisma.$queryRaw).not.toHaveBeenCalled();
        expect(mockResponse.status).not.toHaveBeenCalled();
        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
        expect((mockNext as any).mock.calls[0][0].statusCode).toBe(400);
    });

    it('should call next with error if prisma transaction fails', async () => {
      mockRequest.query = {};
      const dbError = new Error('Transaction failed');
      vi.mocked(prisma.$transaction).mockRejectedValue(dbError);
      await scriptController.getAllScripts(mockRequest as Request, mockResponse as Response, mockNext);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(2); // Called during prep
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(dbError);
    });
  }); // End describe getAllScripts

  // --- Tests for getScriptById ---
  describe('getScriptById', () => {
    it('should return a script when found', async () => {
      // Arrange
      const scriptId = 'test-get-id';
      const mockScript = { id: scriptId, title: 'Found Script', characters: ['C1'], lines: [], createdAt: new Date(), updatedAt: new Date() };
      mockRequest.params = { id: scriptId };

      // Mock findUnique to return the script
      const mockedFindUnique = vi.mocked(prisma.scriptSnip.findUnique);
      mockedFindUnique.mockResolvedValue(mockScript);

      // Act
      await scriptController.getScriptById(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockedFindUnique).toHaveBeenCalledWith({ where: { id: scriptId } });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(mockScript);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 404 if script is not found', async () => {
      // Arrange
      const scriptId = 'test-not-found-id';
      mockRequest.params = { id: scriptId };

      // Mock findUnique to return null
      const mockedFindUnique = vi.mocked(prisma.scriptSnip.findUnique);
      mockedFindUnique.mockResolvedValue(null);

      // Act
      await scriptController.getScriptById(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockedFindUnique).toHaveBeenCalledWith({ where: { id: scriptId } });
      // Check the specific 404 handling in the controller
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Script not found' });
      expect(mockNext).not.toHaveBeenCalled(); // next() should not be called on 404
    });

    it('should call next with error if prisma findUnique fails', async () => {
      // Arrange
      const scriptId = 'test-find-fail-id';
      mockRequest.params = { id: scriptId };
      const dbError = new Error('Database error during findUnique');

      // Mock findUnique to reject
      const mockedFindUnique = vi.mocked(prisma.scriptSnip.findUnique);
      mockedFindUnique.mockRejectedValue(dbError);

      // Act
      await scriptController.getScriptById(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockedFindUnique).toHaveBeenCalledWith({ where: { id: scriptId } });
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(dbError);
    });
  }); // End describe getScriptById

  // --- Tests for deleteScript ---
  describe('deleteScript', () => {
    it('should delete a script and return 204 No Content', async () => {
      // Arrange
      const scriptId = 'test-delete-id';
      mockRequest.params = { id: scriptId };

      // FIX: Re-cast prisma.scriptSnip.delete inside the test
      const mockedDelete = vi.mocked(prisma.scriptSnip.delete);
      mockedDelete.mockResolvedValue({ id: scriptId } as any);

      // Act
      await scriptController.deleteScript(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockedDelete).toHaveBeenCalledWith({ where: { id: scriptId } });
      expect(mockResponse.status).toHaveBeenCalledWith(204);
      expect(mockResponse.send).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with error if prisma delete fails', async () => {
      // Arrange
      const scriptId = 'test-delete-fail-id';
      mockRequest.params = { id: scriptId };
      const dbError = new Error('Database error during delete');

      // FIX: Re-cast prisma.scriptSnip.delete inside the test
      const mockedDelete = vi.mocked(prisma.scriptSnip.delete);
      mockedDelete.mockRejectedValue(dbError);

      // Act
      await scriptController.deleteScript(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockedDelete).toHaveBeenCalledWith({ where: { id: scriptId } });
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(dbError);
    });

    it('should call next with error if prisma delete throws PrismaClientKnownRequestError (e.g., not found)', async () => {
        // Arrange
        const scriptId = 'test-delete-not-found-id';
        mockRequest.params = { id: scriptId };
        const notFoundError = new Prisma.PrismaClientKnownRequestError('Not found', { code: 'P2025', clientVersion: 'mock' });

        // FIX: Re-cast prisma.scriptSnip.delete inside the test
        const mockedDelete = vi.mocked(prisma.scriptSnip.delete);
        mockedDelete.mockRejectedValue(notFoundError);

        // Act
        await scriptController.deleteScript(mockRequest as Request, mockResponse as Response, mockNext);

        // Assert
        expect(mockedDelete).toHaveBeenCalledWith({ where: { id: scriptId } });
        expect(mockResponse.status).not.toHaveBeenCalled();
        expect(mockNext).toHaveBeenCalledWith(notFoundError);
    });
  }); // End describe deleteScript

  // --- Tests for updateScript ---
  describe('updateScript', () => {
    it('should update a script and return 200', async () => {
      // Arrange
      const scriptId = 'test-update-id';
      const updateData = { title: 'Updated Title', characters: ['UpdatedChar'] }; // Example update data
      const updatedScript = {
          id: scriptId,
          title: 'Updated Title',
          characters: ['UpdatedChar'],
          lines: [], // Assuming lines aren't updated here
          createdAt: new Date(),
          updatedAt: new Date()
      };
      mockRequest.params = { id: scriptId };
      mockRequest.body = updateData;

      // Mock update to return the updated script
      const mockedUpdate = vi.mocked(prisma.scriptSnip.update);
      mockedUpdate.mockResolvedValue(updatedScript);

      // Act
      await scriptController.updateScript(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockedUpdate).toHaveBeenCalledWith({
        where: { id: scriptId },
        data: updateData,
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(updatedScript);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with error if script to update is not found (Prisma P2025)', async () => {
      // Arrange
      const scriptId = 'test-update-not-found-id';
      const updateData = { title: 'Wont Update' };
      mockRequest.params = { id: scriptId };
      mockRequest.body = updateData;

      // Mock update to throw Prisma's "Record to update not found" error
      const notFoundError = new Prisma.PrismaClientKnownRequestError(
        'An operation failed because it depends on one or more records that were required but not found.',
        { code: 'P2025', clientVersion: 'mock' }
      );
      const mockedUpdate = vi.mocked(prisma.scriptSnip.update);
      mockedUpdate.mockRejectedValue(notFoundError);

      // Act
      await scriptController.updateScript(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockedUpdate).toHaveBeenCalledWith({
        where: { id: scriptId },
        data: updateData,
      });
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
      // The controller should pass the Prisma error to the error handler
      expect(mockNext).toHaveBeenCalledWith(notFoundError);
    });

    it('should call next with error if prisma update fails for other reasons', async () => {
      // Arrange
      const scriptId = 'test-update-fail-id';
      const updateData = { title: 'Update Fail' };
      mockRequest.params = { id: scriptId };
      mockRequest.body = updateData;
      const dbError = new Error('Database error during update');

      // Mock update to reject with a generic error
      const mockedUpdate = vi.mocked(prisma.scriptSnip.update);
      mockedUpdate.mockRejectedValue(dbError);

      // Act
      await scriptController.updateScript(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockedUpdate).toHaveBeenCalledWith({
        where: { id: scriptId },
        data: updateData,
      });
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(dbError);
    });

    // Optional: Add test for Zod validation failure if needed
    // it('should call next with error if validation fails', async () => { ... });

  }); // End describe updateScript

  // --- Tests for getRandomScript ---
  describe('getRandomScript', () => {
    it('should return a random script when scripts exist', async () => {
      // Arrange
      const mockCount = 5;
      const mockRandomScript = { id: 'random-id', title: 'Random Script', characters: [], lines: [], createdAt: new Date(), updatedAt: new Date() };

      // Mock count to return a positive number
      const mockedCount = vi.mocked(prisma.scriptSnip.count);
      mockedCount.mockResolvedValue(mockCount);

      // Mock findFirst to return a script
      const mockedFindFirst = vi.mocked(prisma.scriptSnip.findFirst);
      mockedFindFirst.mockResolvedValue(mockRandomScript);

      // Mock Math.random (optional but good for predictability)
      const mockMathRandom = vi.spyOn(Math, 'random').mockReturnValue(0.5); // Example: always pick the middle index

      // Act
      await scriptController.getRandomScript(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockedCount).toHaveBeenCalled();
      // Check that findFirst was called with a skip value based on count and Math.random
      const expectedSkip = Math.floor(0.5 * mockCount);
      expect(mockedFindFirst).toHaveBeenCalledWith({ skip: expectedSkip });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(mockRandomScript);
      expect(mockNext).not.toHaveBeenCalled();

      // Restore Math.random
      mockMathRandom.mockRestore();
    });

    it('should call next with AppError(404) if no scripts exist', async () => {
      // Arrange
      // Mock count to return 0
      const mockedCount = vi.mocked(prisma.scriptSnip.count);
      mockedCount.mockResolvedValue(0);
      const mockedFindFirst = vi.mocked(prisma.scriptSnip.findFirst);

      // Act
      await scriptController.getRandomScript(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockedCount).toHaveBeenCalled();
      expect(mockedFindFirst).not.toHaveBeenCalled(); // findFirst shouldn't be called if count is 0
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect((mockNext as any).mock.calls[0][0].statusCode).toBe(404);
      expect((mockNext as any).mock.calls[0][0].message).toBe('No scripts available to choose from.');
    });

     it('should call next with AppError(500) if findFirst fails unexpectedly', async () => {
        // Arrange
        const mockCount = 5;
        const mockedCount = vi.mocked(prisma.scriptSnip.count);
        mockedCount.mockResolvedValue(mockCount);

        // Mock findFirst to return null (simulating an unexpected failure)
        const mockedFindFirst = vi.mocked(prisma.scriptSnip.findFirst);
        mockedFindFirst.mockResolvedValue(null);
        const mockMathRandom = vi.spyOn(Math, 'random').mockReturnValue(0.5);

        // Act
        await scriptController.getRandomScript(mockRequest as Request, mockResponse as Response, mockNext);

        // Assert
        expect(mockedCount).toHaveBeenCalled();
        expect(mockedFindFirst).toHaveBeenCalled();
        expect(mockResponse.status).not.toHaveBeenCalled();
        expect(mockResponse.json).not.toHaveBeenCalled();
        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
        expect((mockNext as any).mock.calls[0][0].statusCode).toBe(500);
        expect((mockNext as any).mock.calls[0][0].message).toBe('Failed to retrieve a random script.');

        mockMathRandom.mockRestore();
    });

    it('should call next with error if prisma count fails', async () => {
      // Arrange
      const dbError = new Error('Database error during count');
      const mockedCount = vi.mocked(prisma.scriptSnip.count);
      mockedCount.mockRejectedValue(dbError);
      const mockedFindFirst = vi.mocked(prisma.scriptSnip.findFirst);

      // Act
      await scriptController.getRandomScript(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockedCount).toHaveBeenCalled();
      expect(mockedFindFirst).not.toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(dbError);
    });

     it('should call next with error if prisma findFirst fails', async () => {
        // Arrange
        const mockCount = 5;
        const dbError = new Error('Database error during findFirst');
        const mockedCount = vi.mocked(prisma.scriptSnip.count);
        mockedCount.mockResolvedValue(mockCount);
        const mockedFindFirst = vi.mocked(prisma.scriptSnip.findFirst);
        mockedFindFirst.mockRejectedValue(dbError);
        const mockMathRandom = vi.spyOn(Math, 'random').mockReturnValue(0.5);


        // Act
        await scriptController.getRandomScript(mockRequest as Request, mockResponse as Response, mockNext);

        // Assert
        expect(mockedCount).toHaveBeenCalled();
        expect(mockedFindFirst).toHaveBeenCalled();
        expect(mockResponse.status).not.toHaveBeenCalled();
        expect(mockResponse.json).not.toHaveBeenCalled();
        expect(mockNext).toHaveBeenCalledWith(dbError);

        mockMathRandom.mockRestore();
    });

  }); // End describe getRandomScript

  // --- Tests for getRandomScripts ---
  describe('getRandomScripts', () => {
    beforeEach(() => {
        vi.mocked(prisma.$queryRaw).mockClear();
        vi.mocked(prisma.scriptSnip.count).mockClear();
    });

    it('should return multiple random scripts', async () => {
      // Arrange
      const requestedCount = 3;
      const totalDbCount = 10;
      const mockRandomScripts = [
        { id: 'rand1', title: 'Random 1' },
        { id: 'rand2', title: 'Random 2' },
        { id: 'rand3', title: 'Random 3' },
      ];
      mockRequest.query = { count: String(requestedCount) };

      vi.mocked(prisma.scriptSnip.count).mockResolvedValueOnce(totalDbCount);
      const mockedQueryRaw = vi.mocked(prisma.$queryRaw);

      mockedQueryRaw.mockImplementationOnce( (async (query: any) => {
        return mockRandomScripts;
      }) as any );

      // Act
      await scriptController.getRandomScripts(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(prisma.scriptSnip.count).toHaveBeenCalledTimes(1);
      expect(mockedQueryRaw).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(mockRandomScripts);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return fewer scripts if requested count exceeds available', async () => {
       // Arrange
      const requestedCount = 10;
      const totalDbCount = 2;
      const mockAvailableScripts = [
        { id: 'randA', title: 'Random A' },
        { id: 'randB', title: 'Random B' },
      ];
      mockRequest.query = { count: String(requestedCount) };

      vi.mocked(prisma.scriptSnip.count).mockResolvedValueOnce(totalDbCount);
      const mockedQueryRaw = vi.mocked(prisma.$queryRaw);

      mockedQueryRaw.mockImplementationOnce( (async (query: any) => {
        return mockAvailableScripts;
      }) as any );

      // Act
      await scriptController.getRandomScripts(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(prisma.scriptSnip.count).toHaveBeenCalledTimes(1);
      expect(mockedQueryRaw).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(mockAvailableScripts);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 404 if no scripts exist', async () => { // Renamed for clarity
       // Arrange
      const requestedCount = 5;
      const totalDbCount = 0; // Simulate 0 scripts in DB
      mockRequest.query = { count: String(requestedCount) };

      vi.mocked(prisma.scriptSnip.count).mockResolvedValueOnce(totalDbCount);
      const mockedQueryRaw = vi.mocked(prisma.$queryRaw);

      // Act
      await scriptController.getRandomScripts(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(prisma.scriptSnip.count).toHaveBeenCalledTimes(1);
      expect(mockedQueryRaw).not.toHaveBeenCalled(); // findFirst shouldn't be called if count is 0
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'No scripts available in the database.' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with AppError for invalid count parameter', async () => {
      // Arrange
      mockRequest.query = { count: 'invalid' }; // Invalid count
      const mockedQueryRaw = vi.mocked(prisma.$queryRaw);

      // Act
      await scriptController.getRandomScripts(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockedQueryRaw).not.toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect((mockNext as any).mock.calls[0][0].statusCode).toBe(400);
      expect((mockNext as any).mock.calls[0][0].message).toContain('Invalid count parameter');
    });

    it('should call next with error if prisma $queryRaw fails', async () => { /* ... */ });

  }); // End describe getRandomScripts

  // --- Tests for getScriptsByIds ---
  describe('getScriptsByIds', () => {
    beforeEach(() => {
        // Clear mocks if needed, especially if findMany is used elsewhere
        vi.mocked(prisma.scriptSnip.findMany).mockClear();
    });

    it('should return scripts for valid IDs', async () => {
      // Arrange
      const scriptIds = ['id1', 'id2'];
      const mockScripts = [
        { id: 'id1', title: 'Script 1', characters: [], lines: [], createdAt: new Date(), updatedAt: new Date() },
        { id: 'id2', title: 'Script 2', characters: [], lines: [], createdAt: new Date(), updatedAt: new Date() },
      ];
      mockRequest.body = { ids: scriptIds };

      // Mock findMany to return the scripts
      const mockedFindMany = vi.mocked(prisma.scriptSnip.findMany);
      mockedFindMany.mockResolvedValue(mockScripts);

      // Act
      await scriptController.getScriptsByIds(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockedFindMany).toHaveBeenCalledWith({ where: { id: { in: scriptIds } } });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(mockScripts);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return empty array if no IDs match', async () => {
      // Arrange
      const scriptIds = ['nonexistent1', 'nonexistent2'];
      mockRequest.body = { ids: scriptIds };

      // Mock findMany to return an empty array
      const mockedFindMany = vi.mocked(prisma.scriptSnip.findMany);
      mockedFindMany.mockResolvedValue([]);

      // Act
      await scriptController.getScriptsByIds(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockedFindMany).toHaveBeenCalledWith({ where: { id: { in: scriptIds } } });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith([]);
      expect(mockNext).not.toHaveBeenCalled();
    });

    // --- Replace the failing test with these two ---
    it('should call next with AppError(400) if ids is missing', async () => {
      // Arrange
      mockRequest.body = {}; // ids missing

      // Act
      await scriptController.getScriptsByIds(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(prisma.scriptSnip.findMany).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect((mockNext as any).mock.calls[0][0].statusCode).toBe(400);
      expect((mockNext as any).mock.calls[0][0].message).toContain("'ids' must be a non-empty array");
    });

    it('should call next with AppError(400) if ids is not an array', async () => {
        // Arrange
        mockRequest.body = { ids: 'not-an-array' };

        // Act
        await scriptController.getScriptsByIds(mockRequest as Request, mockResponse as Response, mockNext);

        // Assert
        expect(prisma.scriptSnip.findMany).not.toHaveBeenCalled();
        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
        expect((mockNext as any).mock.calls[0][0].statusCode).toBe(400);
        expect((mockNext as any).mock.calls[0][0].message).toContain("'ids' must be a non-empty array");
    });
    // --- End replacement ---


     it('should call next with AppError(400) if ids array is empty', async () => {
      // Arrange
      mockRequest.body = { ids: [] };

      // Act
      await scriptController.getScriptsByIds(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(prisma.scriptSnip.findMany).not.toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect((mockNext as any).mock.calls[0][0].statusCode).toBe(400);
      expect((mockNext as any).mock.calls[0][0].message).toContain("'ids' must be a non-empty array");
    });

    it('should call next with error if prisma findMany fails', async () => {
      // Arrange
      const scriptIds = ['id1'];
      mockRequest.body = { ids: scriptIds };
      const dbError = new Error('Database error during findMany');

      // Mock findMany to reject
      const mockedFindMany = vi.mocked(prisma.scriptSnip.findMany);
      mockedFindMany.mockRejectedValue(dbError);

      // Act
      await scriptController.getScriptsByIds(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockedFindMany).toHaveBeenCalledWith({ where: { id: { in: scriptIds } } });
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(dbError);
    });

    // Note: The existing 'should call next with error if prisma findMany fails'
    // test already covers the catch block if the error is a generic Error.
    // Adding another test specifically for a generic Error is redundant but harmless.
    // If you want to be absolutely sure, you can add this:
    it('should call next with error if findMany fails with a generic error', async () => {
      // Arrange
      const scriptIds = ['id1'];
      mockRequest.body = { ids: scriptIds };
      const genericError = new Error('Generic findMany failure');

      // Mock findMany to reject with a generic error
      vi.mocked(prisma.scriptSnip.findMany).mockRejectedValue(genericError);

      // Act
      await scriptController.getScriptsByIds(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(prisma.scriptSnip.findMany).toHaveBeenCalledWith({ where: { id: { in: scriptIds } } });
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(genericError);
    });

  }); // End describe getScriptsByIds

  // --- Tests for createScript ---
  describe('createScript', () => {
    it('should create a script and return 201', async () => {
      // Arrange
      const scriptData = { title: 'Test Script', characters: ['Char1'], lines: [{ character: 'Char1', dialogue: 'Hello' }] };
      mockRequest.body = scriptData;
      const createdScript = { ...scriptData, id: 'test-id-123', createdAt: new Date(), updatedAt: new Date() };

      // FIX: Re-cast prisma.scriptSnip.create inside the test
      const mockedCreate = vi.mocked(prisma.scriptSnip.create);
      mockedCreate.mockResolvedValue(createdScript);

      // Act
      await scriptController.createScript(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockedCreate).toHaveBeenCalledWith({ data: scriptData });
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(createdScript);
      expect(mockNext).not.toHaveBeenCalled();
    });

     it('should call next with error if prisma create fails', async () => {
        // Arrange
        const scriptData = { title: 'Test Script Fail', characters: ['CharF'], lines: [{ character: 'CharF', dialogue: 'Fail' }] };
        mockRequest.body = scriptData;
        const dbError = new Error('Database connection lost');

        // FIX: Re-cast prisma.scriptSnip.create inside the test
        const mockedCreate = vi.mocked(prisma.scriptSnip.create);
        mockedCreate.mockRejectedValue(dbError);

        // Act
        await scriptController.createScript(mockRequest as Request, mockResponse as Response, mockNext);

        // Assert
        expect(mockedCreate).toHaveBeenCalledWith({ data: scriptData });
        expect(mockResponse.status).not.toHaveBeenCalled();
        expect(mockResponse.json).not.toHaveBeenCalled();
        expect(mockNext).toHaveBeenCalledWith(dbError);
    });

    it('should call next with error if prisma create fails unexpectedly', async () => {
      // Arrange
      const scriptData = {
        title: 'Test Script',
        characters: ['Alice'],
        lines: [{ character: 'Alice', dialogue: 'Hello' }]
      };
      mockRequest.body = scriptData;
      const genericError = new Error('Unexpected database error during create');

      // Mock prisma.scriptSnip.create to throw a generic error
      vi.mocked(prisma.scriptSnip.create).mockRejectedValue(genericError);

      // Act
      await scriptController.createScript(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(prisma.scriptSnip.create).toHaveBeenCalledWith({ data: scriptData });
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(genericError); // Ensure the generic catch calls next
    });

  }); // End describe createScript

}); // End main describe block