import rateLimit from 'express-rate-limit';

// Define and export the limiter for creating scripts
export const createScriptLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour window
    max: 20, // Limit each IP to 20 create script requests per windowMs
    message: 'Too many scripts created from this IP, please try again after an hour',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    // keyGenerator: (req, res) => { // Optional: Customize key generation if needed behind proxies
    //   return req.ip;
    // }
});

// You could define other limiters here and export them too
// export const generalApiLimiter = rateLimit({...});