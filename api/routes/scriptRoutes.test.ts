import { describe, it, expect, beforeAll, afterAll } from 'vitest'; // Add beforeAll, afterAll
import request from 'supertest';
import app from '../index';
import { PrismaClient } from '@prisma/client'; // Import Prisma Client

const prisma = new PrismaClient(); // Instantiate Prisma for potential cleanup

// Variable to hold the ID of the created script for later tests (like DELETE)
let createdScriptId: string | null = null;

describe('Script Routes API', () => {
  // Test the GET /api/scripts endpoint
  it('GET /api/scripts should return 200 OK and script data', async () => {
    // This test doesn't strictly require data, but might show empty if DB is empty
    const response = await request(app).get('/api/scripts');

    expect(response.status).toBe(200);
    expect(response.body).toBeTypeOf('object');
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('pagination');
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  // --- Tests for GET /api/scripts/random ---
  // FIX: Wrap in describe and add data setup/teardown
  describe('GET /api/scripts/random', () => {
    let randomTestScriptId: string | null = null;

    beforeAll(async () => {
      // Ensure at least one script exists for the 200 OK test
      try {
        const script = await prisma.scriptSnip.create({
          data: { title: 'For Random Test', characters: ['CharR'], lines: [{ character: 'CharR', dialogue: 'LineR' }] }
        });
        randomTestScriptId = script.id;
      } catch (error) {
        console.error("Error creating script in random beforeAll:", error);
        throw error; // Fail fast if setup fails
      }
    });

    afterAll(async () => {
      // Clean up the script created for this block
      if (randomTestScriptId) {
        await prisma.scriptSnip.deleteMany({ where: { id: randomTestScriptId } });
      }
      // Clean up any potential leftovers from the 404 test
      await prisma.scriptSnip.deleteMany({ where: { title: 'EnsureEmptyDB' } });
    });

    // This test should now pass as data exists from beforeAll
    it('should return 200 OK and a single script object when scripts exist', async () => {
      const response = await request(app).get('/api/scripts/random');
      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Object);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('characters');
      expect(response.body).toHaveProperty('lines');
    });

    // This test needs the DB to be empty temporarily
    it('should return 404 Not Found when no scripts exist in the database', async () => {
      // --- Arrange: Ensure the database is empty ---
      await prisma.scriptSnip.deleteMany({}); // Delete all scripts
      const count = await prisma.scriptSnip.count();
      expect(count).toBe(0); // Verify DB is empty

      // --- Act ---
      const response = await request(app).get('/api/scripts/random');

      // --- Assert ---
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'No scripts available to choose from.');

      // --- Cleanup: Add a dummy script back if needed for subsequent tests ---
      // (Not strictly necessary here as the afterAll for the describe block will run later)
      // await prisma.scriptSnip.create({
      //   data: { title: 'EnsureEmptyDB', characters: ['Cleanup'], lines: [{ character: 'Cleanup', dialogue: 'Cleanup' }] }
      // });
    });
  }); // End describe GET /api/scripts/random


  // Test GET /api/scripts/:id
  it('GET /api/scripts/:id should return 404 for non-existent ID', async () => {
    const nonExistentId = 'cl0000000000000000000'; // Use an ID format likely not in DB
    const response = await request(app).get(`/api/scripts/${nonExistentId}`);
    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error', 'Script not found'); // Check error message
  });

  // Test POST /api/scripts
  it('POST /api/scripts should create a new script with valid data', async () => {
    const newScriptData = {
      title: 'Test Script Title',
      characters: ['Character A', 'Character B'],
      lines: [
        { character: 'Character A', dialogue: 'Hello there!' },
        { character: 'Character B', dialogue: 'General Kenobi!' },
      ],
    };

    const response = await request(app)
      .post('/api/scripts')
      .send(newScriptData);

    expect(response.status).toBe(201); // Check for 201 Created status
    expect(response.body).toBeTypeOf('object');
    expect(response.body).toHaveProperty('id');
    expect(response.body.title).toBe(newScriptData.title);
    expect(response.body.characters).toEqual(newScriptData.characters);
    expect(response.body.lines).toEqual(newScriptData.lines);

    // Store the ID for potential cleanup or use in later tests
    createdScriptId = response.body.id;
  });

  it('POST /api/scripts should return 400 for invalid data (e.g., missing lines)', async () => {
    const invalidScriptData = {
      title: 'Invalid Test Script',
      characters: ['Character C'],
      // Missing 'lines' which might be required by your schema/validation
    };

    const response = await request(app)
      .post('/api/scripts')
      .send(invalidScriptData);

    expect(response.status).toBe(400); // Check for 400 Bad Request
    expect(response.body).toHaveProperty('error'); // Check for an error message
    // Add more specific checks for the validation error message if possible
    // e.g., expect(response.body.error).toContain('lines');
  });

  // Test GET /api/scripts/:id with the ID created above
  it('GET /api/scripts/:id should return 200 for a valid, existing ID', async () => {
    if (!createdScriptId) throw new Error('Cannot run test: createdScriptId is not set from POST test.');

    const response = await request(app).get(`/api/scripts/${createdScriptId}`);

    expect(response.status).toBe(200);
    expect(response.body).toBeTypeOf('object');
    expect(response.body.id).toBe(createdScriptId);
    expect(response.body.title).toBe('Test Script Title'); // Check against known created data
  });

  // Test PUT /api/scripts/:id
  it('PUT /api/scripts/:id should update an existing script with valid data', async () => {
    if (!createdScriptId) {
      throw new Error('Cannot run PUT test: createdScriptId is not set.');
    }

    const updatedData = {
      title: 'Updated Test Script Title',
      characters: ['Character A', 'Character C'], // Changed characters
      lines: [
        { character: 'Character A', dialogue: 'This is updated dialogue.' },
        { character: 'Character C', dialogue: 'Indeed it is.' },
      ],
    };

    const response = await request(app)
      .put(`/api/scripts/${createdScriptId}`)
      .send(updatedData);

    expect(response.status).toBe(200);
    expect(response.body).toBeTypeOf('object');
    expect(response.body.id).toBe(createdScriptId);
    expect(response.body.title).toBe(updatedData.title);
    expect(response.body.characters).toEqual(updatedData.characters);
    expect(response.body.lines).toEqual(updatedData.lines);
  });

  it('PUT /api/scripts/:id should return 400 for invalid update data', async () => {
    if (!createdScriptId) {
      throw new Error('Cannot run PUT test: createdScriptId is not set.');
    }

    const invalidUpdateData = {
      title: 'Invalid Update',
      lines: 'this should be an array', // Invalid data type for lines
    };

    const response = await request(app)
      .put(`/api/scripts/${createdScriptId}`)
      .send(invalidUpdateData);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  it('PUT /api/scripts/:id should return 404 for non-existent ID', async () => {
    const nonExistentId = 'cl0000000000000000000';
    const updatedData = { title: 'Update Fail' };

    const response = await request(app)
      .put(`/api/scripts/${nonExistentId}`)
      .send(updatedData);

    expect(response.status).toBe(404);
    // Update the expected error message
    expect(response.body).toHaveProperty('error', 'Resource not found');
  });

  // Test DELETE /api/scripts/:id
  it('DELETE /api/scripts/:id should delete the existing script and return 204', async () => {
    if (!createdScriptId) {
      throw new Error('Cannot run DELETE test: createdScriptId is not set.');
    }

    const response = await request(app).delete(`/api/scripts/${createdScriptId}`);

    expect(response.status).toBe(204); // Check for 204 No Content status
    expect(response.body).toEqual({}); // Expect empty body for 204

    // Optional: Verify it's actually deleted by trying to GET it again
    const getResponse = await request(app).get(`/api/scripts/${createdScriptId}`);
    expect(getResponse.status).toBe(404);

    // Nullify the ID so the afterAll hook doesn't try to delete it again
    createdScriptId = null;
  });

  it('DELETE /api/scripts/:id should return 404 for non-existent ID', async () => {
    const nonExistentId = 'cl0000000000000000000';
    const response = await request(app).delete(`/api/scripts/${nonExistentId}`);
    expect(response.status).toBe(404);
    // Update the expected error message
    expect(response.body).toHaveProperty('error', 'Resource not found');
  });

  // --- Tests for GET /api/scripts Query Parameters ---
  // FIX: Add data setup/teardown for this block
  describe('GET /api/scripts with Query Parameters', () => {
    const queryTestScriptIds: string[] = [];

    beforeAll(async () => {
      // Create scripts specifically for pagination, sorting, filtering tests
      try {
        const scriptData = [
          { title: 'Beta Script', characters: ['C1'], lines: [{ character: 'C1', dialogue: 'L1' }] },
          { title: 'Alpha Script', characters: ['C1'], lines: [{ character: 'C1', dialogue: 'L1' }] },
          { title: 'Gamma Script', characters: ['C1'], lines: [{ character: 'C1', dialogue: 'L1' }] },
          { title: 'Delta Script', characters: ['C2'], lines: [{ character: 'C2', dialogue: 'L2' }] }, // Add more for pagination
          { title: 'Epsilon Script', characters: ['C2'], lines: [{ character: 'C2', dialogue: 'L2' }] }
        ];
        // Create scripts sequentially with slight delay for distinct createdAt
        for (const data of scriptData) {
          const created = await prisma.scriptSnip.create({ data });
          queryTestScriptIds.push(created.id);
          await new Promise(res => setTimeout(res, 5)); // Small delay
        }
      } catch (error) {
        console.error("Error creating scripts in query beforeAll:", error);
        throw error;
      }
    });

    afterAll(async () => {
      // Clean up data created by this block
      if (queryTestScriptIds.length > 0) {
        await prisma.scriptSnip.deleteMany({ where: { id: { in: queryTestScriptIds } } });
      }
    });

    it('should handle pagination with page and limit', async () => {
      const page = 2;
      const limit = 3;
      const response = await request(app).get(`/api/scripts?page=${page}&limit=${limit}`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination.currentPage).toBe(page);
      expect(response.body.pagination.pageSize).toBe(limit);
      expect(response.body.data.length).toBeLessThanOrEqual(limit);
      // With 5 items created, page 2 limit 3 should have 2 items
      expect(response.body.data.length).toBe(2);
    });

    // This test should now pass
    it('should handle sorting by title ascending', async () => {
      const response = await request(app).get('/api/scripts?sortBy=title&sortOrder=asc&limit=5');
      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0); // Should have data now

      // Check if titles are sorted alphabetically (case-insensitive for robustness)
      for (let i = 0; i < response.body.data.length - 1; i++) {
        const titleA = response.body.data[i]?.title?.toLowerCase() || '';
        const titleB = response.body.data[i + 1]?.title?.toLowerCase() || '';
        expect(titleA <= titleB).toBe(true);
      }
    });

    // This test should now pass
    it('should handle sorting by createdAt descending (default)', async () => {
      const response = await request(app).get('/api/scripts?limit=5'); // Default sort

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0); // Should have data now

      // Check if createdAt timestamps are sorted newest first
      for (let i = 0; i < response.body.data.length - 1; i++) {
        const dateA = new Date(response.body.data[i]?.createdAt).getTime();
        const dateB = new Date(response.body.data[i + 1]?.createdAt).getTime();
        expect(dateA >= dateB).toBe(true);
      }
    });

    it('should handle searching by title', async () => {
      const searchTerm = 'Script'; // Should match all created scripts
      const response = await request(app).get(`/api/scripts?search=${encodeURIComponent(searchTerm)}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(queryTestScriptIds.length); // Expect all created scripts
      // Check that all returned items contain the search term in the title (case-insensitive)
      response.body.data.forEach((script: any) => {
        expect(script.title.toLowerCase()).toContain(searchTerm.toLowerCase());
      });
      // We can't easily assert that *only* matching items are returned without knowing all DB data
    });

    it('should return 400 for invalid pagination parameters (e.g., page=0)', async () => {
      const response = await request(app).get('/api/scripts?page=0&limit=5');
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid pagination parameters. Page and limit must be positive integers.');
    });

    // This test should now pass
    it('should fallback to default sorting if invalid sortBy field is provided', async () => {
      const response = await request(app).get('/api/scripts?sortBy=invalidField&sortOrder=asc&limit=5');

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0); // Should have data now
      expect(response.body.pagination.sortBy).toBe('createdAt'); // Check if sortBy in response reflects fallback
      expect(response.body.pagination.sortOrder).toBe('asc'); // Check if sortOrder in response reflects input

      // Check if it fell back to 'createdAt' field but respected the 'asc' order
      for (let i = 0; i < response.body.data.length - 1; i++) {
            const dateA = new Date(response.body.data[i]?.createdAt).getTime();
            const dateB = new Date(response.body.data[i + 1]?.createdAt).getTime();
            expect(dateA <= dateB).toBe(true); // Check ASC order
        }
    });

  }); // End of describe block for query parameters

  // --- Tests for GET /api/scripts/random-multiple ---
  // FIX: Add data setup/teardown
  describe('GET /api/scripts/random-multiple', () => {
    let randomMultiTestIds: string[] = [];

    beforeAll(async () => {
      // Create scripts specifically for these tests
      try {
        const createdScripts = await prisma.$transaction([
          prisma.scriptSnip.create({ data: { title: 'Random Multi 1', characters: ['R1'], lines: [{ character: 'R1', dialogue: 'd1' }] } }),
          prisma.scriptSnip.create({ data: { title: 'Random Multi 2', characters: ['R2'], lines: [{ character: 'R2', dialogue: 'd2' }] } }),
          prisma.scriptSnip.create({ data: { title: 'Random Multi 3', characters: ['R3'], lines: [{ character: 'R3', dialogue: 'd3' }] } }),
        ]);
        randomMultiTestIds = createdScripts.map(s => s.id);
      } catch (error) {
        console.error("Error creating scripts in random-multiple beforeAll:", error);
        throw error;
      }
    });

    afterAll(async () => {
      // Clean up data created by this block
      if (randomMultiTestIds.length > 0) {
        await prisma.scriptSnip.deleteMany({ where: { id: { in: randomMultiTestIds } } });
      }
    });

    it('should return the default number (3) of random scripts', async () => {
      const response = await request(app).get('/api/scripts/random-multiple');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      // Since we created 3, and default is 3, expect 3 unless DB has fewer total
      expect(response.body.length).toBeLessThanOrEqual(3);
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('id');
      }
    });

    it('should return the specified number (count) of random scripts', async () => {
      const count = 2;
      const response = await request(app).get(`/api/scripts/random-multiple?count=${count}`);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(count);
    });

    it('should return 200 OK with an empty array for count=0', async () => {
      const response = await request(app).get('/api/scripts/random-multiple?count=0');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should return 400 Bad Request for invalid count (string)', async () => {
      const response = await request(app).get('/api/scripts/random-multiple?count=abc');
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid count parameter. Must be a positive integer.');
    });

    it('should return 400 Bad Request for invalid count (negative)', async () => {
      const response = await request(app).get('/api/scripts/random-multiple?count=-1');
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid count parameter. Must be a positive integer.');
    });

    it('should exclude specified IDs using excludeIds parameter', async () => {
      if (randomMultiTestIds.length < 2) throw new Error('Not enough scripts created for excludeIds test');
      const idToExclude = randomMultiTestIds[0];
      const count = 2; // Ask for 2, excluding 1

      const response = await request(app).get(`/api/scripts/random-multiple?count=${count}&excludeIds=${idToExclude}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      // Should return up to 'count' scripts, none of which have the excluded ID
      expect(response.body.length).toBeLessThanOrEqual(count);
      response.body.forEach((script: any) => {
        expect(script.id).not.toBe(idToExclude);
      });
      // Ensure we actually got some results (if possible)
      if (randomMultiTestIds.length > 1) {
         expect(response.body.length).toBeGreaterThan(0); // Expect at least one non-excluded script
      }
    });

  }); // End describe GET /api/scripts/random-multiple

  // --- Tests for POST /api/scripts/batch ---
  // FIX: Change describe name to match method/path
  describe('POST /api/scripts/batch', () => {
    let batchTestIds: string[] = [];

    beforeAll(async () => {
      // Create scripts specifically for these tests
      try {
        const createdScripts = await prisma.$transaction([
          prisma.scriptSnip.create({ data: { title: 'Batch 1', characters: ['B1'], lines: [{ character: 'B1', dialogue: 'b1' }] } }),
          prisma.scriptSnip.create({ data: { title: 'Batch 2', characters: ['B2'], lines: [{ character: 'B2', dialogue: 'b2' }] } }),
          prisma.scriptSnip.create({ data: { title: 'Batch 3', characters: ['B3'], lines: [{ character: 'B3', dialogue: 'b3' }] } }),
        ]);
        batchTestIds = createdScripts.map(s => s.id);
      } catch (error) {
        console.error("Error creating scripts in batch beforeAll:", error);
        throw error;
      }
    });

    afterAll(async () => {
      // Clean up data created by this block
      if (batchTestIds.length > 0) {
        await prisma.scriptSnip.deleteMany({ where: { id: { in: batchTestIds } } });
      }
    });

    it('should fetch multiple scripts by their IDs', async () => {
        if (batchTestIds.length < 2) throw new Error('Need at least 2 scripts for batch test');
        const idsToFetch = [batchTestIds[0], batchTestIds[1]];

        const response = await request(app)
          .post('/api/scripts/batch') // Assuming POST based on controller name 'getScriptsByIds' often implying body
          .send({ ids: idsToFetch });

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(idsToFetch.length);
        // Check if the returned IDs match the requested IDs (order might not be guaranteed)
        const returnedIds = response.body.map((s: any) => s.id);
        expect(returnedIds).toEqual(expect.arrayContaining(idsToFetch));
        expect(idsToFetch).toEqual(expect.arrayContaining(returnedIds));
    });

    it('should handle a mix of existing and non-existing IDs', async () => {
        if (batchTestIds.length < 1) throw new Error('Need at least 1 script for batch test');
        const nonExistentId = 'cl0000000000000000000';
        const idsToFetch = [batchTestIds[0], nonExistentId];

        const response = await request(app)
          .post('/api/scripts/batch')
          .send({ ids: idsToFetch });

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        // Should only return the scripts that were found
        expect(response.body.length).toBe(1);
        expect(response.body[0].id).toBe(batchTestIds[0]);
    });

    it('should return an empty array if no IDs match', async () => {
      const nonExistentId1 = 'cl0000000000000000000';
      const nonExistentId2 = 'cl1111111111111111111';
      const idsToFetch = [nonExistentId1, nonExistentId2];

      const response = await request(app)
        .post('/api/scripts/batch')
        .send({ ids: idsToFetch });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should return 400 if the ids field is missing or not an array', async () => {
      const response1 = await request(app)
        .post('/api/scripts/batch')
        .send({}); // Missing ids

      expect(response1.status).toBe(400);
      expect(response1.body).toHaveProperty('error', 'Invalid input: \'ids\' must be a non-empty array of strings.');

      const response2 = await request(app)
        .post('/api/scripts/batch')
        .send({ ids: 'not-an-array' }); // Incorrect type

      expect(response2.status).toBe(400);
      expect(response2.body).toHaveProperty('error', 'Invalid input: \'ids\' must be a non-empty array of strings.');
    });

     it('should return 400 if the ids array is empty', async () => {
      const response = await request(app)
        .post('/api/scripts/batch')
        .send({ ids: [] }); // Empty array

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid input: \'ids\' must be a non-empty array of strings.');
    });

  }); // End describe POST /api/scripts/batch

  // Global afterAll hook for Prisma disconnect (should be outside all inner describes)
  afterAll(async () => {
    // Cleanup for the globally created script ID if it wasn't deleted by its test
    if (createdScriptId) {
      try {
        await prisma.scriptSnip.delete({ where: { id: createdScriptId } });
      } catch (error) { /* Ignore */ }
    }
    await prisma.$disconnect();
  });

}); // End main describe block