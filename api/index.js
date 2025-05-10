// This file is the entry point for Vercel serverless functions
// It simply re-exports the backend API

// Import the backend API
const app = require('../backend/api/index.js');

// Export the app for Vercel
module.exports = app;
