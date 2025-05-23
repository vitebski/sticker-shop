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

// Add Vercel-specific headers for better performance in production
if (process.env.NODE_ENV === 'production') {
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
}

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
app.get('/api', (_req, res) => {
  res.json({ message: 'Sticker Shop API is running' });
});

// Vercel-specific health check route
app.get('/api/vercel-health', async (_req, res) => {
  try {
    // Log MongoDB URI (without password) for debugging
    console.log('Vercel MongoDB URI:', mongoConnect.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));

    // Try to connect to MongoDB using the centralized connection function
    await connectToDatabase();

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

// Enhanced health check route with connection pool information
app.get('/api/health', async (_req, res) => {
  try {
    // Check MongoDB connection
    const dbStatus = mongoose.connection.readyState;
    const dbStatusText = ['disconnected', 'connected', 'connecting', 'disconnecting'][dbStatus] || 'unknown';

    // Get connection pool information if available
    let poolInfo = null;
    if (dbStatus === 1 && mongoose.connection.db &&
        mongoose.connection.db.serverConfig &&
        mongoose.connection.db.serverConfig.s &&
        mongoose.connection.db.serverConfig.s.pool) {

      const pool = mongoose.connection.db.serverConfig.s.pool;
      poolInfo = {
        totalConnections: pool.totalConnectionCount,
        availableConnections: pool.availableConnectionCount,
        maxSize: pool.options.maxPoolSize || 'unknown',
        minSize: pool.options.minPoolSize || 'unknown',
        waitQueueSize: pool.waitQueueSize || 0
      };
    }

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
          maxPoolSize: 1, // Strict limit for free MongoDB Atlas tier
          minPoolSize: 0
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

    // Get MongoDB server information if available
    let serverInfo = null;
    try {
      if (dbStatus === 1 && mongoose.connection.db) {
        const admin = mongoose.connection.db.admin();
        const serverStatus = await admin.serverStatus();

        serverInfo = {
          version: serverStatus.version,
          uptime: serverStatus.uptime,
          connections: serverStatus.connections ? {
            current: serverStatus.connections.current,
            available: serverStatus.connections.available,
            totalCreated: serverStatus.connections.totalCreated
          } : null
        };
      }
    } catch (serverInfoError) {
      console.log('Could not get server info:', serverInfoError.message);
      // Non-critical, continue without server info
    }

    // Return enhanced health status
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatusText,
        statusCode: dbStatus,
        testResult: dbTestResult,
        error: dbError,
        pool: poolInfo,
        server: serverInfo
      },
      environment: process.env.NODE_ENV || 'development',
      mongodb_uri: MONGODB_URI ? 'set' : 'not_set',
      node_version: process.version,
      memory: process.memoryUsage(),
      uptime: process.uptime()
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Import dependencies
const mongoose = require('mongoose');

// Import the centralized MongoDB connection utility
const mongoConnect = require('../utils/mongoConnect');

// Log MongoDB URI (without password) for debugging
console.log('MongoDB URI:', mongoConnect.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));
console.log('Environment:', process.env.NODE_ENV || 'development');

// Use the centralized connectToDatabase function
const connectToDatabase = mongoConnect.connectToDatabase;

// Connect to MongoDB before handling requests
app.use(async (req, res, next) => {
  // Track request start time for performance monitoring
  const requestStartTime = Date.now();

  try {
    // Skip database connection for static routes and health checks
    if (req.path === '/api/health' ||
        req.path === '/api' ||
        req.path.startsWith('/uploads/') ||
        req.path.includes('.') ||
        req.method === 'OPTIONS') { // Also skip for CORS preflight requests
      return next();
    }

    // Log the request for debugging
    console.log(`DB connection middleware for: ${req.method} ${req.path}`);

    // Set a longer timeout for the database connection (5s instead of 2.5s)
    // This gives more time for the connection to be established
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database connection timeout')), 5000);
    });

    try {
      // Race the connection against the timeout
      await Promise.race([connectToDatabase(), timeoutPromise]);

      // Log successful connection time
      const connectionTime = Date.now() - requestStartTime;
      console.log(`MongoDB connected in ${connectionTime}ms for ${req.path}`);

      // Add connection status to response headers for debugging
      res.setHeader('X-MongoDB-Connection-Time', connectionTime.toString());

      // Add a flag to the request to indicate that we've connected to the database
      req.dbConnected = true;

      next();
    } catch (error) {
      // Check if the error is related to the circuit breaker
      if (error.message && error.message.includes('Circuit breaker open')) {
        console.error('Circuit breaker open in middleware:', error.message);
        return res.status(503).json({
          message: 'Database service temporarily unavailable due to connection issues. Please try again later.',
          error: 'Circuit breaker open',
          status: 'service_unavailable',
          retryAfter: 30 // Suggest retry after 30 seconds (circuit breaker timeout)
        });
      }

      // If the error is a timeout, try to return a helpful error message
      if (error.message === 'Database connection timeout') {
        console.error(`Database connection timed out after ${Date.now() - requestStartTime}ms`);
        return res.status(503).json({
          message: 'Database connection timed out. Please try again later.',
          error: 'Connection timeout',
          status: 'service_unavailable',
          retryAfter: 5 // Increased from 1s to 5s
        });
      }

      // For ECONNRESET errors, provide a specific message
      if (error.code === 'ECONNRESET') {
        console.error('ECONNRESET in middleware:', error.message);
        return res.status(503).json({
          message: 'Connection to database was reset. This may be due to network issues.',
          error: 'ECONNRESET',
          status: 'service_unavailable',
          retryAfter: 5 // Increased from 2s to 5s
        });
      }

      // For EPIPE errors, provide a specific message
      if (error.code === 'EPIPE') {
        console.error('EPIPE in middleware:', error.message);

        // Force mongoose connection state to disconnected to trigger a fresh connection on next request
        if (mongoose.connection) {
          mongoose.connection.readyState = 0;

          // Try to close the connection explicitly
          try {
            mongoose.connection.close();
          } catch (closeError) {
            console.error('Error closing connection after EPIPE:', closeError.message);
          }
        }

        return res.status(503).json({
          message: 'Connection to database was broken. The server will attempt to reconnect on your next request.',
          error: 'EPIPE',
          status: 'service_unavailable',
          retryAfter: 5 // Increased from 3s to 5s
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

    // Return a user-friendly error response with a longer retry time
    return res.status(503).json({
      message: 'Database connection failed. Please try again later.',
      error: error.message,
      status: 'service_unavailable',
      retryAfter: 10 // Increased from 3s to 10s
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
