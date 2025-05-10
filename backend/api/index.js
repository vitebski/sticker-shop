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

// Cached connection for serverless environment
let cachedDb = null;
let connectionPromise = null;

const connectToDatabase = async () => {
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
    console.log('Connecting to MongoDB...');

    // Create a new connection promise with retry logic
    connectionPromise = (async () => {
      // Implement retry logic
      let retries = 3;
      let lastError = null;

      while (retries > 0) {
        try {
          // Optimized options for serverless environments with ECONNRESET protection
          const options = {
            // These options are deprecated in newer MongoDB driver versions
            // but keeping them for backward compatibility
            useNewUrlParser: true,
            useUnifiedTopology: true,

            // Critical timeouts for serverless
            serverSelectionTimeoutMS: 2500, // Faster timeout for serverless
            connectTimeoutMS: 2500, // Faster connection timeout
            socketTimeoutMS: 20000, // Reduced from 30s to 20s

            // Network and pooling optimizations
            family: 4, // Use IPv4, skip trying IPv6
            maxPoolSize: 1, // Smaller pool size for serverless functions
            minPoolSize: 0, // Don't maintain connections when not in use

            // Auto-reconnect settings - critical for ECONNRESET
            heartbeatFrequencyMS: 5000, // More frequent heartbeats (was 10000)
            retryWrites: true,
            retryReads: true, // Add retry for reads
            w: 'majority', // Write concern for data durability

            // For Atlas specifically
            compressors: 'zlib', // Enable compression

            // Auto reconnect settings - critical for ECONNRESET
            autoReconnect: true,
            reconnectTries: 3,
            reconnectInterval: 500,

            // Keep alive settings to prevent ECONNRESET
            keepAlive: true,
            keepAliveInitialDelay: 5000,
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

          // Special handling for ECONNRESET
          if (error.code === 'ECONNRESET') {
            console.log('Connection reset by MongoDB server. This may be due to network issues or IP restrictions.');
          }

          if (retries > 0) {
            // Wait before retrying (exponential backoff)
            const delay = 500 * Math.pow(2, 3 - retries);
            console.log(`Retrying in ${delay}ms...`);
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
  try {
    // Skip health check route and root route from DB connection requirement
    if (req.path === '/api/health' || req.path === '/api') {
      return next();
    }

    // Set a shorter timeout for the database connection (3s instead of 10s)
    // This gives more time for the actual route handler to execute within Vercel's 10s limit
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database connection timeout')), 3000);
    });

    try {
      // Race the connection against the timeout
      await Promise.race([connectToDatabase(), timeoutPromise]);
      next();
    } catch (error) {
      // If the error is a timeout, try to return a helpful error message
      if (error.message === 'Database connection timeout') {
        console.error('Database connection timed out');
        return res.status(503).json({
          message: 'Database connection timed out. Please try again later.',
          error: 'Connection timeout',
          status: 'service_unavailable'
        });
      }

      // For other errors, pass through to the general error handler
      throw error;
    }
  } catch (error) {
    console.error('Database connection failed:', error.message);
    return res.status(500).json({
      message: 'Database connection failed',
      error: error.message,
      uri: MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@') // Hide credentials
    });
  }
});

// Error handling middleware
app.use((err, _req, res, _next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
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
