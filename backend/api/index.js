const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('../routes/auth');
const productRoutes = require('../routes/products');
const categoryRoutes = require('../routes/categories');
const cartRoutes = require('../routes/cart');
const orderRoutes = require('../routes/orders');
const paymentRoutes = require('../routes/payment');

// Initialize express app
const app = express();

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for now
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Debug middleware to log requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payment', paymentRoutes);

// Root route
app.get('/api', (req, res) => {
  res.json({ message: 'Sticker Shop API is running' });
});

// Health check route
app.get('/api/health', async (req, res) => {
  try {
    // Check MongoDB connection
    const dbStatus = mongoose.connection.readyState;
    const dbStatusText = ['disconnected', 'connected', 'connecting', 'disconnecting'][dbStatus] || 'unknown';

    // Try to connect to MongoDB if not connected
    let dbTestResult = 'not_tested';
    let dbError = null;

    if (dbStatus !== 1) { // If not connected
      try {
        // Try to connect with a short timeout
        const options = {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          serverSelectionTimeoutMS: 2000, // Short timeout for health check
          connectTimeoutMS: 2000,
        };

        await mongoose.connect(MONGODB_URI, options);
        dbTestResult = 'success';
      } catch (error) {
        dbTestResult = 'failed';
        dbError = error.message;
      }
    } else {
      dbTestResult = 'already_connected';
    }

    // Return health status
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatusText,
        statusCode: dbStatus,
        testResult: dbTestResult,
        error: dbError
      },
      environment: process.env.NODE_ENV || 'development',
      mongodb_uri: MONGODB_URI ? 'set' : 'not_set',
      node_version: process.version,
      memory: process.memoryUsage(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sticker-shop';

// Log MongoDB URI (without password) for debugging
console.log('MongoDB URI:', MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));
console.log('Environment:', process.env.NODE_ENV || 'development');

// Check if we're running in Vercel
const isVercel = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
console.log('Running in Vercel environment:', isVercel ? 'Yes' : 'No');

// Cached connection for serverless environment
let cachedDb = null;
let connectionPromise = null;

// Try to load the Vercel-specific connection utility if we're in Vercel
let vercelMongoConnect;
try {
  if (isVercel) {
    console.log('Attempting to load Vercel-specific MongoDB connection utility');
    // Use a relative path that works in both local and Vercel environments
    vercelMongoConnect = require('../utils/vercelMongoConnect');
    console.log('Vercel-specific MongoDB connection utility loaded successfully');
  }
} catch (error) {
  console.error('Failed to load Vercel-specific MongoDB connection utility:', error.message);
  // Continue with the default connection method
}

const connectToDatabase = async () => {
  // If we're in Vercel and have the Vercel-specific connection utility, use it
  if (isVercel && vercelMongoConnect) {
    try {
      console.log('Using Vercel-specific MongoDB connection utility');
      return await vercelMongoConnect.connectToMongoDB(MONGODB_URI);
    } catch (error) {
      console.error('Vercel-specific MongoDB connection failed:', error.message);
      console.log('Falling back to standard connection method');
      // Fall back to the standard connection method
    }
  }

  // Standard connection method (used for local development or as fallback)
  // If we already have a connection promise in progress, return it
  if (connectionPromise) {
    return connectionPromise;
  }

  // If we have a cached connection and it's connected, use it
  if (cachedDb && mongoose.connection.readyState === 1) {
    console.log('Using cached database connection');
    return cachedDb;
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
    console.log('Connecting to MongoDB using standard method...');

    // Create a new connection promise with retry logic
    connectionPromise = (async () => {
      // Enhanced retry logic with more attempts and better backoff
      let retries = 5; // Increased from 3 to 5 attempts
      let lastError = null;
      let attemptCount = 0;

      // Add jitter to retry timing to prevent thundering herd problem
      const getJitter = () => Math.random() * 100;

      while (retries > 0) {
        attemptCount++;
        try {
          // Optimized options for serverless environments with ECONNRESET protection
          const options = {
            // These options are deprecated in newer MongoDB driver versions
            // but keeping them for backward compatibility
            useNewUrlParser: true,
            useUnifiedTopology: true,

            // Critical timeouts for serverless - even shorter timeouts to fail fast
            serverSelectionTimeoutMS: 2000, // Faster timeout for serverless
            connectTimeoutMS: 2000, // Faster connection timeout
            socketTimeoutMS: 10000, // Reduced from 20s to 10s for faster failure

            // Network and pooling optimizations
            family: 4, // Use IPv4, skip trying IPv6
            maxPoolSize: 1, // Smaller pool size for serverless functions
            minPoolSize: 0, // Don't maintain connections when not in use
            maxIdleTimeMS: 5000, // Close idle connections after 5 seconds

            // Auto-reconnect settings - critical for ECONNRESET
            heartbeatFrequencyMS: 3000, // Even more frequent heartbeats (was 5000)
            retryWrites: true,
            retryReads: true, // Add retry for reads
            w: 'majority', // Write concern for data durability
            wtimeoutMS: 2500, // Timeout for write operations

            // For Atlas specifically
            compressors: 'zlib', // Enable compression
            zlibCompressionLevel: 6, // Medium compression level (0-9)

            // Auto reconnect settings - critical for ECONNRESET
            autoReconnect: true,
            reconnectTries: 5, // Increased from 3 to 5
            reconnectInterval: 250, // Reduced from 500ms to 250ms for faster reconnection

            // Keep alive settings to prevent ECONNRESET
            keepAlive: true,
            keepAliveInitialDelay: 3000, // Reduced from 5000ms to 3000ms

            // Additional options to help with ECONNRESET
            bufferMaxEntries: 0, // Disable buffering for faster failure
            autoIndex: false, // Disable auto-indexing for faster startup
            directConnection: true, // Use direct connection to avoid proxy issues
          };

          // Connect to the database
          const client = await mongoose.connect(MONGODB_URI, options);

          // Cache the database connection
          cachedDb = client;
          console.log('MongoDB connected successfully');
          return cachedDb;
        } catch (error) {
          lastError = error;
          retries--;

          // Log the specific error for debugging
          console.error(`MongoDB connection attempt failed (${3 - retries}/3):`, error.message);

          // Enhanced special handling for ECONNRESET and other common MongoDB errors
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

// Connect to MongoDB before handling requests
app.use(async (req, res, next) => {
  // Track request start time for performance monitoring
  const requestStartTime = Date.now();

  try {
    // Skip database connection for static routes and health checks
    if (req.path === '/api/health' ||
        req.path === '/api' ||
        req.path.startsWith('/uploads/') ||
        req.path.includes('.')) {
      return next();
    }

    // Log the request for debugging
    console.log(`DB connection middleware for: ${req.method} ${req.path}`);

    // Set an even shorter timeout for the database connection (2.5s instead of 3s)
    // This gives more time for the actual route handler to execute within Vercel's 10s limit
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database connection timeout')), 2500);
    });

    try {
      // Race the connection against the timeout
      await Promise.race([connectToDatabase(), timeoutPromise]);

      // Log successful connection time
      const connectionTime = Date.now() - requestStartTime;
      console.log(`MongoDB connected in ${connectionTime}ms for ${req.path}`);

      // Add connection status to response headers for debugging
      res.setHeader('X-MongoDB-Connection-Time', connectionTime.toString());

      next();
    } catch (error) {
      // If the error is a timeout, try to return a helpful error message
      if (error.message === 'Database connection timeout') {
        console.error(`Database connection timed out after ${Date.now() - requestStartTime}ms`);
        return res.status(503).json({
          message: 'Database connection timed out. Please try again later.',
          error: 'Connection timeout',
          status: 'service_unavailable',
          retryAfter: 1 // Suggest retry after 1 second
        });
      }

      // For ECONNRESET errors, provide a specific message
      if (error.code === 'ECONNRESET') {
        console.error('ECONNRESET in middleware:', error.message);
        return res.status(503).json({
          message: 'Connection to database was reset. This may be due to network issues.',
          error: 'ECONNRESET',
          status: 'service_unavailable',
          retryAfter: 2 // Suggest retry after 2 seconds
        });
      }

      // For other errors, pass through to the general error handler
      throw error;
    }
  } catch (error) {
    // Log detailed error information
    console.error('Database connection failed:', {
      error: error.message,
      code: error.code,
      name: error.name,
      path: req.path,
      method: req.method,
      timeElapsed: Date.now() - requestStartTime
    });

    // Return a user-friendly error response
    return res.status(500).json({
      message: 'Database connection failed. Please try again later.',
      error: error.message,
      status: 'error',
      retryAfter: 3 // Suggest retry after 3 seconds
    });
  }
});

// Enhanced error handling middleware
app.use((err, _req, res, _next) => {
  // Log the error with stack trace
  console.error('Error:', err.stack);

  // Determine the appropriate status code based on the error
  let statusCode = 500;
  let errorMessage = 'Something went wrong!';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorMessage = 'Validation error';
  } else if (err.name === 'CastError') {
    statusCode = 400;
    errorMessage = 'Invalid ID format';
  } else if (err.name === 'MongooseError' || err.name === 'MongoError') {
    statusCode = 503;
    errorMessage = 'Database error';
  } else if (err.code === 'ECONNRESET') {
    statusCode = 503;
    errorMessage = 'Connection reset by database';
  } else if (err.message && err.message.includes('timeout')) {
    statusCode = 504;
    errorMessage = 'Request timed out';
  }

  // Return a structured error response
  res.status(statusCode).json({
    message: errorMessage,
    error: err.message,
    status: statusCode >= 500 ? 'error' : 'fail',
    timestamp: new Date().toISOString()
  });
});

// For local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export for Vercel
module.exports = app;
