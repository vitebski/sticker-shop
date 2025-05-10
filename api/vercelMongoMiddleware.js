/**
 * Middleware to handle MongoDB connections in Vercel serverless functions
 */

const { connectToMongoDB } = require('../backend/utils/vercelMongoConnect');

/**
 * Middleware that ensures MongoDB is connected before processing requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const vercelMongoMiddleware = async (req, res, next) => {
  try {
    // Skip for health check and static routes
    if (req.path === '/api/health' || 
        req.path === '/api/vercel-health' || 
        req.path === '/api' ||
        req.path.startsWith('/uploads/')) {
      return next();
    }

    // Get MongoDB URI from environment
    const MONGODB_URI = process.env.MONGODB_URI;
    
    if (!MONGODB_URI) {
      console.error('MongoDB URI not found in environment variables');
      return res.status(500).json({
        message: 'Database configuration error',
        error: 'MongoDB URI not found'
      });
    }

    // Set a timeout for the database connection
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database connection timeout')), 5000);
    });

    try {
      // Race the connection against the timeout
      await Promise.race([connectToMongoDB(MONGODB_URI), timeoutPromise]);
      next();
    } catch (error) {
      // If the error is a timeout, return a helpful error message
      if (error.message === 'Database connection timeout') {
        console.error('Database connection timed out');
        return res.status(503).json({
          message: 'Database connection timed out. Please try again later.',
          error: 'Connection timeout',
          status: 'service_unavailable'
        });
      }
      
      // For other errors, pass through
      throw error;
    }
  } catch (error) {
    console.error('Vercel MongoDB middleware error:', error);
    return res.status(500).json({
      message: 'Database connection failed',
      error: error.message
    });
  }
};

module.exports = vercelMongoMiddleware;
