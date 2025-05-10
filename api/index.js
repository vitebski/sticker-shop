// This file is the entry point for Vercel serverless functions
// It imports the backend API and adds Vercel-specific optimizations

// Import dependencies
const express = require('express');
const mongoose = require('mongoose');
const mongoConnect = require('../backend/utils/mongoConnect');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

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

// Create a special health check route for Vercel
app.get('/api/vercel-health', async (req, res) => {
  try {
    // Log MongoDB URI (without password) for debugging
    console.log('Vercel MongoDB URI:', mongoConnect.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));

    // Try to connect to MongoDB using the centralized connection function
    await mongoConnect.connectToDatabase();

    // Get connection pool information if available
    let poolInfo = null;
    if (mongoose.connection && mongoose.connection.db &&
        mongoose.connection.db.serverConfig &&
        mongoose.connection.db.serverConfig.s &&
        mongoose.connection.db.serverConfig.s.pool) {

      const pool = mongoose.connection.db.serverConfig.s.pool;
      poolInfo = {
        totalConnections: pool.totalConnectionCount,
        availableConnections: pool.availableConnectionCount,
        maxSize: pool.options.maxPoolSize || 'unknown',
        minSize: pool.options.minPoolSize || 'unknown'
      };
    }

    // Return success response
    return res.status(200).json({
      status: 'success',
      message: 'Connected to MongoDB successfully',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production',
      connectionPool: poolInfo
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
