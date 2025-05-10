/**
 * Centralized MongoDB connection utility
 * This module provides optimized connection handling for both local and Vercel environments
 */

const mongoose = require('mongoose');

// Connection state tracking
let isConnected = false;
let connectionPromise = null;
let lastConnectionTime = 0;
const CONNECTION_MAX_AGE = 30000; // 30 seconds - reduced from 60 seconds

// Circuit breaker pattern
let circuitBreakerOpen = false;
let circuitBreakerResetTime = 0;
let consecutiveFailures = 0;
const CIRCUIT_BREAKER_THRESHOLD = 3; // Open circuit after 3 consecutive failures
const CIRCUIT_BREAKER_RESET_TIMEOUT = 30000; // 30 seconds - time to wait before trying again

// Get MongoDB URI from environment
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sticker-shop';

// Check if we're running in Vercel
const isVercel = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';

/**
 * Get optimized MongoDB connection options based on environment
 * @returns {Object} MongoDB connection options
 */
const getConnectionOptions = () => {
  // Base options for all environments - ultra conservative for free MongoDB Atlas tier
  const options = {
    // These options are deprecated in newer MongoDB driver versions
    // but keeping them for backward compatibility
    useNewUrlParser: true,
    useUnifiedTopology: true,

    // Critical timeouts - even more conservative for serverless environment
    serverSelectionTimeoutMS: 2500, // Increased from 1500ms to 2500ms for more reliable selection
    connectTimeoutMS: 2500, // Increased from 1500ms to 2500ms for more reliable connection
    socketTimeoutMS: 10000, // Increased from 5000ms to 10000ms for more reliable operations

    // Network settings
    family: 4, // Force IPv4

    // Connection pool settings - ultra strict limits for free MongoDB Atlas tier
    maxPoolSize: 1, // Strict limit of 1 for free MongoDB Atlas tier
    minPoolSize: 0, // Don't maintain connections when not in use
    maxIdleTimeMS: 10000, // Increased from 3000ms to 10000ms to keep connections alive longer
    waitQueueTimeoutMS: 2000, // Increased from 1000ms to 2000ms for more reliable queuing

    // Retry settings - more aggressive for free tier
    retryWrites: true,
    retryReads: true,

    // Disable auto-reconnect to handle it manually with our circuit breaker
    autoReconnect: false,

    // Keep alive to prevent ECONNRESET and EPIPE - more conservative
    keepAlive: true,
    keepAliveInitialDelay: 5000, // Increased from 1000ms to 5000ms to reduce overhead

    // Additional options to help with connection issues
    bufferMaxEntries: 0, // Disable buffering for faster failure
    autoIndex: false, // Disable auto-indexing for faster startup
    directConnection: true, // Use direct connection to avoid proxy issues

    // Disable pooling features that might cause issues with free tier
    poolSize: 1, // Legacy option but still respected

    // Additional options for free MongoDB Atlas tier - more conservative
    readPreference: 'primary', // Only read from primary node
    readConcern: { level: 'local' }, // Use local read concern for faster reads
    writeConcern: { w: 1, j: false }, // Acknowledge writes but don't wait for journal

    // Disable features that might cause connection issues
    validateOptions: false, // Don't validate options
    useCreateIndex: false, // Don't create indexes automatically
    useFindAndModify: false, // Use the new findOneAndUpdate() and findOneAndDelete() methods
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
 * @returns {Promise<boolean>} - Promise that resolves to true if connection is valid, false otherwise
 */
const isConnectionValid = () => {
  return new Promise(async (resolve) => {
    try {
      // If not connected, connection is invalid
      if (!isConnected || mongoose.connection.readyState !== 1) {
        console.log('Connection is not in connected state');
        return resolve(false);
      }

      // If connection is too old, consider it invalid
      const connectionAge = Date.now() - lastConnectionTime;
      if (connectionAge > CONNECTION_MAX_AGE) {
        console.log(`Connection age (${connectionAge}ms) exceeds max age (${CONNECTION_MAX_AGE}ms), marking as invalid`);
        return resolve(false);
      }

      // Try a simple ping to verify connection is still alive
      if (mongoose.connection.db) {
        try {
          // Use a very short timeout for the ping
          const adminDb = mongoose.connection.db.admin();
          await Promise.race([
            adminDb.ping(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Ping timeout')), 1000)) // Increased from 500ms to 1000ms
          ]);
          console.log('Connection ping successful');
          return resolve(true);
        } catch (pingError) {
          console.log('Connection ping failed:', pingError.message);
          return resolve(false);
        }
      } else {
        console.log('No database object available on connection');
        return resolve(false);
      }
    } catch (error) {
      console.log('Connection validation error:', error.message);
      return resolve(false);
    }
  });
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
  // Check if circuit breaker is open
  if (circuitBreakerOpen) {
    const now = Date.now();
    if (now < circuitBreakerResetTime) {
      // Circuit is still open, return a pre-defined error
      console.log(`Circuit breaker open. Will retry after ${Math.round((circuitBreakerResetTime - now) / 1000)}s`);
      throw new Error('Circuit breaker open. Too many connection failures. Please try again later.');
    } else {
      // Reset circuit breaker for a new attempt
      console.log('Circuit breaker timeout elapsed. Resetting circuit breaker.');
      circuitBreakerOpen = false;
      consecutiveFailures = 0;
    }
  }

  // If we're already connected, validate the connection before using it
  if (isConnected) {
    console.log('Validating existing MongoDB connection');
    let valid = false;
    try {
      valid = await isConnectionValid();
    } catch (error) {
      console.log('Connection validation error:', error.message);
      valid = false;
    }

    if (valid) {
      console.log('Using existing valid MongoDB connection');
      // Reset consecutive failures on successful connection
      consecutiveFailures = 0;
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

          // Increment consecutive failures for circuit breaker
          consecutiveFailures++;

          // Log the specific error for debugging
          console.error(`MongoDB connection attempt failed (${attemptCount}/${5}):`, error.message);
          console.error(`Consecutive failures: ${consecutiveFailures}/${CIRCUIT_BREAKER_THRESHOLD}`);

          // Check if we should open the circuit breaker
          if (consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
            console.error('Circuit breaker threshold reached. Opening circuit breaker.');
            circuitBreakerOpen = true;
            circuitBreakerResetTime = Date.now() + CIRCUIT_BREAKER_RESET_TIMEOUT;

            // If circuit breaker is open and this is the last retry, throw a specific error
            if (retries === 0) {
              throw new Error('Circuit breaker open. Too many connection failures. Please try again later.');
            }
          }

          // Enhanced special handling for connection errors (ECONNRESET, EPIPE, etc.)
          if (error.code === 'ECONNRESET') {
            console.log('Connection reset by MongoDB server. This may be due to network issues or IP restrictions.');

            // Force a longer delay before retry for ECONNRESET specifically
            await new Promise(resolve => setTimeout(resolve, 500)); // Increased from 100ms to 500ms

            // Log more detailed information for debugging
            console.log('Connection details:', {
              uri: MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'),
              environment: process.env.NODE_ENV || 'development',
              vercel: isVercel ? 'Yes' : 'No',
              attempt: attemptCount,
              remainingRetries: retries,
              consecutiveFailures
            });

            // Force close any existing connections on ECONNRESET
            if (mongoose.connection.readyState !== 0) {
              try {
                console.log('Forcibly closing existing connection after ECONNRESET');
                await mongoose.connection.close();
              } catch (closeError) {
                console.log('Error closing connection after ECONNRESET:', closeError.message);
              }
            }
          } else if (error.code === 'EPIPE') {
            console.log('EPIPE error detected - broken pipe. This typically happens when the server closes the connection while the client is still writing.');

            // Force mongoose connection state to disconnected to trigger a fresh connection
            if (mongoose.connection) {
              mongoose.connection.readyState = 0;

              // Try to close the connection explicitly
              try {
                console.log('Forcibly closing existing connection after EPIPE');
                await mongoose.connection.close();
              } catch (closeError) {
                console.log('Error closing connection after EPIPE:', closeError.message);
              }
            }

            // Add a longer delay for EPIPE to ensure the server has time to clean up
            await new Promise(resolve => setTimeout(resolve, 1000)); // Increased from 200ms to 1000ms

            console.log('Attempting to reconnect after EPIPE error');
          } else if (error.name === 'MongooseServerSelectionError') {
            console.log('Server selection error. MongoDB server may be down or unreachable.');

            // Add a delay for server selection errors
            await new Promise(resolve => setTimeout(resolve, 300));
          } else if (error.name === 'MongooseTimeoutError') {
            console.log('MongoDB operation timed out. The server may be under heavy load.');

            // Add a delay for timeout errors
            await new Promise(resolve => setTimeout(resolve, 300));
          }

          if (retries > 0) {
            // Wait before retrying (exponential backoff with jitter)
            // Use more aggressive backoff for connection issues
            const baseDelay = 500 * Math.pow(2, attemptCount); // Increased from 250ms to 500ms
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
