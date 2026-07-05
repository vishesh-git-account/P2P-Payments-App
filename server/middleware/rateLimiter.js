const rateLimit = require('express-rate-limit');

// 1. Login Limiter: Stop brute-force password guessing
exports.loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login requests per window
  message: { message: 'Too many login attempts from this IP, please try again after 15 minutes.' },
  standardHeaders: true, 
  legacyHeaders: false, 
});

// 2. Payment Limiter: Stop financial spam
exports.paymentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 payment intents per minute
  message: { message: 'Too many payment requests. Please slow down.' }
});

// 3. General API Limiter: A blanket limit for everything else
exports.apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: { message: 'Too many requests, please try again later.' }
});