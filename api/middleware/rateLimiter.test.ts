import { describe, it, expect } from 'vitest';
import { createScriptLimiter } from './rateLimiter'; // Adjust path if needed
import type { RateLimitRequestHandler } from 'express-rate-limit';

describe('Rate Limiter Middleware', () => {
    it('should export createScriptLimiter as a function', () => {
        // Check if the exported limiter exists
        expect(createScriptLimiter).toBeDefined();

        // Check if it's a function (middleware)
        expect(typeof createScriptLimiter).toBe('function');
    });

    // Optional: Add more tests if you create more complex configurations or custom key generators
    // it('should have specific options set (if checkable)', () => {
    //   // Note: express-rate-limit doesn't easily expose its config after creation.
    //   // This type of test is usually difficult/not practical for this library.
    //   // Integration testing is better for verifying behavior.
    // });
});