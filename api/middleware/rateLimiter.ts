import rateLimit from 'express-rate-limit';

// Define and export the limiter for creating scripts
export const createScriptLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 30, // Limit each IP to 100 create script requests per 24 hours
    message: 'Too many scripts created from this IP today, please try again tomorrow',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    // keyGenerator: (req, res) => { // Optional: Customize key generation if needed behind proxies
    //   return req.ip;
    // }
});

// You could define other limiters here and export them too
// export const generalApiLimiter = rateLimit({...});