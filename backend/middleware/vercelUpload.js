const multer = require('multer');
const path = require('path');
const fs = require('fs');

// For Vercel deployment, we need to handle file uploads differently
// This is a simplified version that works for development and Vercel

// Determine if we're in Vercel production environment
const isVercelProduction = process.env.VERCEL === '1';

let storage;

if (isVercelProduction) {
  // In Vercel, we'll use memory storage and handle files differently
  // For a real production app, you would use a cloud storage service like AWS S3
  storage = multer.memoryStorage();
} else {
  // Ensure uploads directory exists
  const uploadDir = path.join(__dirname, '../uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Configure disk storage for development
  storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    },
  });
}

// File filter
const fileFilter = (req, file, cb) => {
  const allowedFileTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedFileTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedFileTypes.test(file.mimetype);
  
  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

// Initialize upload
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Middleware to handle file uploads in Vercel environment
const handleVercelUpload = (req, res, next) => {
  if (isVercelProduction && req.file) {
    // In a real app, you would upload the file to a cloud storage service here
    // For this example, we'll just create a URL for the file
    const filename = `${req.file.fieldname}-${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(req.file.originalname)}`;
    
    // Set the file path in the request
    req.file.filename = filename;
    req.file.path = `/uploads/${filename}`;
    
    // In a real app, you would store the file data and return a URL
    // For now, we'll just pass through
  }
  
  next();
};

module.exports = { upload, handleVercelUpload };
