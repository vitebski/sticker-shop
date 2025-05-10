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
      
      // Optimized connection options for Vercel
      const options = {
        // Timeouts
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 30000,
        
        // Network settings
        family: 4, // Force IPv4
        
        // Connection pool settings
        maxPoolSize: 1,
        minPoolSize: 0,
        
        // Retry settings
        retryWrites: true,
        retryReads: true,
        
        // Keep alive to prevent ECONNRESET
        keepAlive: true,
        keepAliveInitialDelay: 300000, // 5 minutes
      };
      
      // Connect to MongoDB
      const connection = await mongoose.connect(uri, options);
      
      // Mark as connected
      isConnected = true;
      console.log('=> MongoDB connected successfully');
      
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
