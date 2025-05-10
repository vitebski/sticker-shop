// This file is the entry point for Vercel serverless functions
// It imports the backend API and adds Vercel-specific optimizations

// Import dependencies
const express = require('express');
const { connectToMongoDB } = require('../backend/utils/vercelMongoConnect');
const vercelMongoMiddleware = require('./vercelMongoMiddleware');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import the backend API
const app = require('../backend/api/index.js');

// Apply Vercel-specific MongoDB middleware
// This will handle MongoDB connections for all routes
app.use(vercelMongoMiddleware);

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

// Create a special health check route for Vercel
app.get('/api/vercel-health', async (req, res) => {
  try {
    // Get MongoDB URI from environment
    const MONGODB_URI = process.env.MONGODB_URI;

    if (!MONGODB_URI) {
      return res.status(500).json({
        status: 'error',
        message: 'MongoDB URI not found in environment variables'
      });
    }

    // Log MongoDB URI (without password) for debugging
    console.log('Vercel MongoDB URI:', MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));

    // Try to connect to MongoDB using the specialized connection function
    await connectToMongoDB(MONGODB_URI);

    // Return success response
    return res.status(200).json({
      status: 'success',
      message: 'Connected to MongoDB successfully',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production'
    });
  } catch (error) {
    console.error('Vercel health check error:', error);

    // Return error response
    return res.status(500).json({
      status: 'error',
      message: 'Failed to connect to MongoDB',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Export the app for Vercel
module.exports = app;
