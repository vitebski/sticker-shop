const Product = require('../models/Product');

// Get all products with pagination
exports.getProducts = async (req, res) => {
  // Set a timeout for the query
  const queryTimeout = setTimeout(() => {
    console.error('Product query timeout - taking too long');
  }, 5000); // 5 second warning
  
  try {
    console.log('Processing product query:', req.query);
    const startTime = Date.now();
    
    const pageSize = Number(req.query.pageSize) || 10;
    const page = Number(req.query.page) || 1;
    const category = req.query.category;
    const search = req.query.search;
    const sort = req.query.sort || '-createdAt';
    const minPrice = Number(req.query.minPrice) || 0;
    const maxPrice = Number(req.query.maxPrice) || Number.MAX_SAFE_INTEGER;
    const featured = req.query.featured === 'true' ? true : undefined;
    
    // Build query
    const query = {};
    
    // Add price range filter
    query.price = { $gte: minPrice };
    if (maxPrice < Number.MAX_SAFE_INTEGER) {
      query.price.$lte = maxPrice;
    }
    
    // Add category filter
    if (category) {
      query.category = category;
    }
    
    // Add featured filter
    if (featured !== undefined) {
      query.featured = featured;
    }
    
    // Add text search
    if (search) {
      query.$text = { $search: search };
    }
    
    console.log('MongoDB query:', JSON.stringify(query));
    
    // Use Promise.all to run count and find queries in parallel
    const [count, products] = await Promise.all([
      // Use estimatedDocumentCount for better performance when no filters
      Object.keys(query).length === 0 
        ? Product.estimatedDocumentCount() 
        : Product.countDocuments(query),
      
      Product.find(query)
        .select('name price image category stock featured dimensions tags createdAt updatedAt')
        .populate('category', 'name')
        .sort(sort)
        .limit(pageSize)
        .skip(pageSize * (page - 1))
        .lean() // Use lean() for better performance
    ]);
    
    const endTime = Date.now();
    console.log(`Query completed in ${endTime - startTime}ms`);
    
    clearTimeout(queryTimeout);
    
    res.json({
      products,
      page,
      pages: Math.ceil(count / pageSize),
      total: count,
    });
  } catch (error) {
    clearTimeout(queryTimeout);
    console.error('Get products error:', error);
    
    // Handle connection errors
    if (error.name === 'MongooseError' || error.name === 'MongoError' || error.code === 'ECONNRESET') {
      return res.status(503).json({ 
        message: 'Database connection error. Please try again later.',
        retry: true
      });
    }
    
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message
    });
  }
};

// Get a single product by ID
exports.getProductById = async (req, res) => {
  try {
    const productId = req.params.id;
    
    const product = await Product.findById(productId)
      .populate('category', 'name')
      .lean(); // Use lean() for better performance
    
    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    console.error('Get product error:', error);
    
    // Try to handle common errors
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid product ID format' });
    }
    
    // Handle connection errors
    if (error.name === 'MongooseError' || error.name === 'MongoError' || error.code === 'ECONNRESET') {
      console.log('Database connection error in getProductById');
      
      // Try to return a generic error that's more helpful
      return res.status(503).json({ 
        message: 'Database connection error. Please try again later.',
        retry: true
      });
    }
    
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create a new product
exports.createProduct = async (req, res) => {
  try {
    const { name, description, price, category, stock, dimensions, tags } = req.body;
    
    // Check if image was uploaded
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an image' });
    }
    
    const product = await Product.create({
      name,
      description,
      price,
      image: `/uploads/${req.file.filename}`,
      category,
      stock: stock || 0,
      dimensions: dimensions || {},
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
    });
    
    res.status(201).json(product);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update a product
exports.updateProduct = async (req, res) => {
  try {
    const { name, description, price, category, stock, featured, dimensions, tags } = req.body;
    
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Update fields
    product.name = name || product.name;
    product.description = description || product.description;
    product.price = price || product.price;
    product.category = category || product.category;
    product.stock = stock !== undefined ? stock : product.stock;
    product.featured = featured !== undefined ? featured : product.featured;
    
    if (dimensions) {
      product.dimensions = {
        ...product.dimensions,
        ...dimensions,
      };
    }
    
    if (tags) {
      product.tags = tags.split(',').map(tag => tag.trim());
    }
    
    // Update image if a new one was uploaded
    if (req.file) {
      product.image = `/uploads/${req.file.filename}`;
    }
    
    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete a product
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    await product.deleteOne();
    res.json({ message: 'Product removed' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
