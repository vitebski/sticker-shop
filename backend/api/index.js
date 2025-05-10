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

// Cached connection
let cachedDb = null;

const connectToDatabase = async () => {
  // If we have a cached connection, use it
  if (cachedDb) {
    console.log('Using cached database connection');
    return cachedDb;
  }

  try {
    console.log('Connecting to MongoDB...');

    // Important options for serverless environments
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout after 5s
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      family: 4, // Use IPv4, skip trying IPv6
      maxPoolSize: 10, // Maintain up to 10 socket connections
      minPoolSize: 5, // Maintain at least 5 socket connections
    };

    // Connect to the database
    const client = await mongoose.connect(MONGODB_URI, options);

    // Cache the database connection
    cachedDb = client;
    console.log('MongoDB connected successfully');
    return cachedDb;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// Connect to MongoDB before handling requests
app.use(async (req, res, next) => {
  try {
    // Skip health check route from DB connection requirement
    if (req.path === '/api/health') {
      return next();
    }

    // Set a timeout for the database connection
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database connection timeout')), 10000);
    });

    // Race the connection against the timeout
    await Promise.race([connectToDatabase(), timeoutPromise]);
    next();
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
app.use((err, req, res, next) => {
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
