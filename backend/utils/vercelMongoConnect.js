/**
 * Specialized MongoDB connection utility for Vercel serverless functions
 * This module provides optimized connection handling for Vercel environments
 */

const mongoose = require('mongoose');

// Track the connection state
let isConnected = false;
let connectionPromise = null;

/**
 * Connect to MongoDB with optimized settings for Vercel
 * @param {string} uri - MongoDB connection URI
 * @returns {Promise<mongoose.Connection>} - Mongoose connection
 */
const connectToMongoDB = async (uri) => {
  // If we're already connected, return the existing connection
  if (isConnected) {
    console.log('=> Using existing MongoDB connection');
    return mongoose.connection;
  }

  // If a connection attempt is in progress, return that promise
  if (connectionPromise) {
    console.log('=> Connection attempt in progress, reusing promise');
    return connectionPromise;
  }

  // Create a new connection promise
  connectionPromise = (async () => {
    try {
      console.log('=> Creating new MongoDB connection');

      // Optimized connection options for Vercel with strict pool size limit for free MongoDB Atlas tier
      const options = {
        // Timeouts - reduced for faster failure in serverless environment
        serverSelectionTimeoutMS: 2000, // Reduced from 5000ms to 2000ms
        connectTimeoutMS: 2000, // Reduced from 10000ms to 2000ms
        socketTimeoutMS: 10000, // Reduced from 30000ms to 10000ms

        // Network settings
        family: 4, // Force IPv4

        // Connection pool settings - strict limits for free MongoDB Atlas tier
        maxPoolSize: 1, // Strict limit of 1 for free MongoDB Atlas tier
        minPoolSize: 0, // Don't maintain connections when not in use
        maxIdleTimeMS: 3000, // Close idle connections after 3 seconds
        waitQueueTimeoutMS: 1000, // Timeout for waiting for a connection from the pool

        // Retry settings
        retryWrites: true,
        retryReads: true,

        // Keep alive to prevent ECONNRESET - reduced interval
        keepAlive: true,
        keepAliveInitialDelay: 30000, // Reduced from 300000ms (5 minutes) to 30000ms (30 seconds)

        // Additional options to help with ECONNRESET
        bufferMaxEntries: 0, // Disable buffering for faster failure
        autoIndex: false, // Disable auto-indexing for faster startup
        directConnection: true, // Use direct connection to avoid proxy issues
      };

      // Connect to MongoDB
      const connection = await mongoose.connect(uri, options);

      // Log connection pool information
      const db = mongoose.connection.db;
      if (db && db.serverConfig && db.serverConfig.s && db.serverConfig.s.pool) {
        const pool = db.serverConfig.s.pool;
        console.log('=> MongoDB connection pool stats (Vercel):', {
          totalConnections: pool.totalConnectionCount,
          availableConnections: pool.availableConnectionCount,
          maxPoolSize: options.maxPoolSize,
          minPoolSize: options.minPoolSize,
          waitQueueSize: pool.waitQueueSize || 0
        });
      } else {
        console.log('=> MongoDB connected but pool information not available');
      }

      // Mark as connected
      isConnected = true;
      console.log('=> MongoDB connected successfully (Vercel)');

      // Handle connection errors
      mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err);
        isConnected = false;
      });

      // Handle disconnection
      mongoose.connection.on('disconnected', () => {
        console.log('MongoDB disconnected');
        isConnected = false;
      });

      // Handle process termination
      process.on('SIGINT', async () => {
        await mongoose.connection.close();
        console.log('MongoDB connection closed due to app termination');
        process.exit(0);
      });

      return connection;
    } catch (error) {
      console.error('MongoDB connection error:', error);
      isConnected = false;
      throw error;
    } finally {
      // Clear the promise so future calls can try again if this one fails
      connectionPromise = null;
    }
  })();

  return connectionPromise;
};

module.exports = { connectToMongoDB };
