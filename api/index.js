// This file is the entry point for Vercel serverless functions
// It imports the backend API and adds Vercel-specific optimizations

// Import the backend API
const app = require('../backend/api/index.js');

// Add Vercel-specific headers for better performance
app.use((req, res, next) => {
  // Add cache control headers for static resources
  if (req.path.startsWith('/uploads/') || req.path.includes('.')) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (req.method === 'GET') {
    // Add some caching for GET API requests (5 minutes)
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
  }

  // Add Vercel-specific security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  next();
});

// Export the app for Vercel
module.exports = app;
