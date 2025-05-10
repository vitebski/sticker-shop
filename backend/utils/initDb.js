const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');

// Load environment variables
dotenv.config();

// Sample data
const sampleCategories = [
  {
    name: 'Animals',
    description: 'Cute and funny animal stickers',
    slug: 'animals',
  },
  {
    name: 'Tech',
    description: 'Stickers for tech enthusiasts',
    slug: 'tech',
  },
  {
    name: 'Funny',
    description: 'Humorous stickers to brighten your day',
    slug: 'funny',
  },
  {
    name: 'Nature',
    description: 'Beautiful nature-inspired stickers',
    slug: 'nature',
  },
];

const sampleProducts = [
  {
    name: 'Cute Cat Sticker',
    description: 'An adorable cat sticker that will look great on your laptop or water bottle.',
    price: 2.99,
    image: '/uploads/sample-cat.jpg',
    stock: 100,
    featured: true,
    dimensions: {
      width: 3,
      height: 3,
    },
    tags: ['cat', 'cute', 'animal'],
  },
  {
    name: 'JavaScript Logo',
    description: 'Show your love for JavaScript with this sleek logo sticker.',
    price: 3.49,
    image: '/uploads/sample-js.jpg',
    stock: 75,
    featured: true,
    dimensions: {
      width: 2.5,
      height: 2.5,
    },
    tags: ['javascript', 'programming', 'tech'],
  },
  {
    name: 'Mountain Landscape',
    description: 'Beautiful mountain landscape sticker for nature lovers.',
    price: 3.99,
    image: '/uploads/sample-mountain.jpg',
    stock: 50,
    featured: false,
    dimensions: {
      width: 4,
      height: 2,
    },
    tags: ['mountain', 'landscape', 'nature'],
  },
  {
    name: 'Funny Meme Sticker',
    description: 'A hilarious meme sticker that will make everyone laugh.',
    price: 2.49,
    image: '/uploads/sample-meme.jpg',
    stock: 120,
    featured: true,
    dimensions: {
      width: 3,
      height: 3,
    },
    tags: ['meme', 'funny', 'humor'],
  },
];

// Connect to MongoDB
const connectDB = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sticker-shop';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected');
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    return false;
  }
};

// Initialize database with sample data
const initializeDB = async () => {
  try {
    // Connect to database
    const connected = await connectDB();
    if (!connected) {
      console.error('Failed to connect to database. Exiting...');
      process.exit(1);
    }

    // Check if admin user exists
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      console.log('Creating admin user...');
      await User.create({
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'admin123',
        role: 'admin',
      });
      console.log('Admin user created');
    } else {
      console.log('Admin user already exists');
    }

    // Check if categories exist
    const categoriesCount = await Category.countDocuments();
    if (categoriesCount === 0) {
      console.log('Creating sample categories...');
      const categories = await Category.insertMany(sampleCategories);
      console.log(`${categories.length} categories created`);

      // Create sample products with category references
      console.log('Creating sample products...');
      const categoryMap = {};
      categories.forEach(category => {
        categoryMap[category.slug] = category._id;
      });

      // Assign categories to products
      const productsWithCategories = sampleProducts.map(product => {
        let categoryId;
        if (product.name.includes('Cat')) {
          categoryId = categoryMap['animals'];
        } else if (product.name.includes('JavaScript')) {
          categoryId = categoryMap['tech'];
        } else if (product.name.includes('Mountain')) {
          categoryId = categoryMap['nature'];
        } else if (product.name.includes('Meme')) {
          categoryId = categoryMap['funny'];
        } else {
          // Default category
          categoryId = categoryMap['animals'];
        }
        return { ...product, category: categoryId };
      });

      const products = await Product.insertMany(productsWithCategories);
      console.log(`${products.length} products created`);
    } else {
      console.log('Categories already exist');
    }

    console.log('Database initialization completed');
    process.exit(0);
  } catch (error) {
    console.error('Database initialization error:', error);
    process.exit(1);
  }
};

// Run the initialization
initializeDB();
