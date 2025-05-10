/**
 * Centralized MongoDB connection utility
 * This module provides optimized connection handling for both local and Vercel environments
 */

const mongoose = require('mongoose');

// Connection state tracking
let isConnected = false;
let connectionPromise = null;
let lastConnectionTime = 0;
const CONNECTION_MAX_AGE = 60000; // 60 seconds

// Get MongoDB URI from environment
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sticker-shop';

// Check if we're running in Vercel
const isVercel = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';

/**
 * Get optimized MongoDB connection options based on environment
 * @returns {Object} MongoDB connection options
 */
const getConnectionOptions = () => {
  // Base options for all environments
  const options = {
    // These options are deprecated in newer MongoDB driver versions
    // but keeping them for backward compatibility
    useNewUrlParser: true,
    useUnifiedTopology: true,

    // Critical timeouts - optimized for serverless environment
    serverSelectionTimeoutMS: 1500, // Fast server selection timeout
    connectTimeoutMS: 1500, // Fast connection timeout
    socketTimeoutMS: 5000, // Socket timeout for operations

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

    // Keep alive to prevent ECONNRESET and EPIPE
    keepAlive: true,
    keepAliveInitialDelay: 1000, // 1 second for frequent checks

    // Additional options to help with connection issues
    bufferMaxEntries: 0, // Disable buffering for faster failure
    autoIndex: false, // Disable auto-indexing for faster startup
    directConnection: true, // Use direct connection to avoid proxy issues

    // Additional options for free MongoDB Atlas tier
    readPreference: 'primary', // Only read from primary node
    readConcern: { level: 'local' }, // Use local read concern for faster reads
    writeConcern: { w: 1, j: false }, // Acknowledge writes but don't wait for journal
  };

  // Add Vercel-specific options if in Vercel environment
  if (isVercel) {
    // Vercel-specific options
    options.autoReconnect = false; // Disable automatic reconnect to handle it manually
  } else {
    // Local development options
    options.autoReconnect = true;
    options.reconnectTries = 5;
    options.reconnectInterval = 250;
  }

  return options;
};

/**
 * Validates if the current connection is still usable
 * @returns {boolean} - True if connection is valid, false otherwise
 */
const isConnectionValid = async () => {
  // If not connected, connection is invalid
  if (!isConnected || mongoose.connection.readyState !== 1) {
    return false;
  }
  
  // If connection is too old, consider it invalid
  const connectionAge = Date.now() - lastConnectionTime;
  if (connectionAge > CONNECTION_MAX_AGE) {
    console.log(`Connection age (${connectionAge}ms) exceeds max age (${CONNECTION_MAX_AGE}ms), marking as invalid`);
    return false;
  }
  
  // Try a simple ping to verify connection is still alive
  try {
    if (mongoose.connection.db) {
      // Use a very short timeout for the ping
      const adminDb = mongoose.connection.db.admin();
      await Promise.race([
        adminDb.ping(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Ping timeout')), 500))
      ]);
      return true;
    }
  } catch (error) {
    console.log('Connection validation failed:', error.message);
    return false;
  }
  
  return false;
};

/**
 * Add jitter to retry timing to prevent thundering herd problem
 * @returns {number} Random jitter value
 */
const getJitter = () => Math.random() * 100;

/**
 * Connect to MongoDB with retry logic
 * @returns {Promise<mongoose.Connection>} Mongoose connection
 */
const connectToDatabase = async () => {
  // If we're already connected, validate the connection before using it
  if (isConnected) {
    console.log('Validating existing MongoDB connection');
    const valid = await isConnectionValid();
    
    if (valid) {
      console.log('Using existing valid MongoDB connection');
      return mongoose.connection;
    } else {
      console.log('Existing connection is invalid, will create a new one');
      // Force close the invalid connection
      try {
        await mongoose.connection.close();
      } catch (error) {
        console.log('Error closing invalid connection:', error.message);
      }
      isConnected = false;
    }
  }

  // If a connection attempt is in progress, return that promise
  if (connectionPromise) {
    console.log('Connection attempt in progress, reusing promise');
    return connectionPromise;
  }
  
  // Reset any existing connections if they're in a bad state
  if (mongoose.connection.readyState !== 0) {
    console.log('Resetting existing MongoDB connection...');
    try {
      await mongoose.connection.close();
    } catch (err) {
      console.log('Error closing existing connection:', err.message);
      // Continue anyway
    }
  }

  try {
    console.log('Connecting to MongoDB...');
    console.log('MongoDB URI:', MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));
    console.log('Environment:', process.env.NODE_ENV || 'development');
    console.log('Running in Vercel environment:', isVercel ? 'Yes' : 'No');

    // Create a new connection promise with retry logic
    connectionPromise = (async () => {
      // Enhanced retry logic with more attempts and better backoff
      let retries = 5; // 5 attempts
      let lastError = null;
      let attemptCount = 0;
      
      while (retries > 0) {
        attemptCount++;
        try {
          // Get connection options
          const options = getConnectionOptions();

          // Connect to the database
          const client = await mongoose.connect(MONGODB_URI, options);

          // Log connection pool information
          const db = mongoose.connection.db;
          if (db && db.serverConfig && db.serverConfig.s && db.serverConfig.s.pool) {
            const pool = db.serverConfig.s.pool;
            console.log('MongoDB connection pool stats:', {
              totalConnections: pool.totalConnectionCount,
              availableConnections: pool.availableConnectionCount,
              maxPoolSize: options.maxPoolSize,
              minPoolSize: options.minPoolSize
            });
          } else {
            console.log('MongoDB connected but pool information not available');
          }

          // Set up connection event handlers
          mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
            
            // Special handling for EPIPE errors
            if (err.code === 'EPIPE') {
              console.error('EPIPE error detected - broken pipe. Connection will be reset.');
              
              // Force connection state to disconnected to trigger reconnect on next request
              mongoose.connection.readyState = 0;
            }
            
            isConnected = false;
          });
          
          mongoose.connection.on('disconnected', () => {
            console.log('MongoDB disconnected');
            isConnected = false;
          });

          // Update connection state
          isConnected = true;
          lastConnectionTime = Date.now();
          console.log('MongoDB connected successfully');
          
          return client;
        } catch (error) {
          lastError = error;
          retries--;
          
          // Log the specific error for debugging
          console.error(`MongoDB connection attempt failed (${attemptCount}/${5}):`, error.message);
          
          // Enhanced special handling for connection errors (ECONNRESET, EPIPE, etc.)
          if (error.code === 'ECONNRESET') {
            console.log('Connection reset by MongoDB server. This may be due to network issues or IP restrictions.');
            
            // Force a small delay before retry for ECONNRESET specifically
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Log more detailed information for debugging
            console.log('Connection details:', {
              uri: MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'),
              environment: process.env.NODE_ENV || 'development',
              vercel: isVercel ? 'Yes' : 'No',
              attempt: attemptCount,
              remainingRetries: retries
            });
          } else if (error.code === 'EPIPE') {
            console.log('EPIPE error detected - broken pipe. This typically happens when the server closes the connection while the client is still writing.');
            
            // Force mongoose connection state to disconnected to trigger a fresh connection
            if (mongoose.connection) {
              mongoose.connection.readyState = 0;
            }
            
            // Add a slightly longer delay for EPIPE to ensure the server has time to clean up
            await new Promise(resolve => setTimeout(resolve, 200));
            
            console.log('Attempting to reconnect after EPIPE error');
          } else if (error.name === 'MongooseServerSelectionError') {
            console.log('Server selection error. MongoDB server may be down or unreachable.');
          } else if (error.name === 'MongooseTimeoutError') {
            console.log('MongoDB operation timed out. The server may be under heavy load.');
          }
          
          if (retries > 0) {
            // Wait before retrying (exponential backoff with jitter)
            const baseDelay = 250 * Math.pow(2, attemptCount);
            const jitter = getJitter();
            const delay = baseDelay + jitter;
            
            console.log(`Retrying in ${Math.round(delay)}ms... (attempt ${attemptCount + 1}/6)`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      // If we get here, all retries failed
      console.error('All MongoDB connection attempts failed');
      throw lastError;
    })();

    return connectionPromise;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    connectionPromise = null;
    throw error;
  } finally {
    // Ensure the promise is cleared after completion or failure
    setTimeout(() => {
      if (connectionPromise) {
        connectionPromise = null;
      }
    }, 5000);
  }
};

module.exports = {
  connectToDatabase,
  isConnectionValid,
  getConnectionOptions,
  MONGODB_URI
};
