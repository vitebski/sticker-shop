const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticate, isAdmin } = require('../middleware/auth');
const { upload, handleVercelUpload } = require('../middleware/vercelUpload');

// Public routes
router.get('/', productController.getProducts);
router.get('/:id', productController.getProductById);

// Admin routes
router.post(
  '/',
  authenticate,
  isAdmin,
  upload.single('image'),
  handleVercelUpload,
  productController.createProduct
);
router.put(
  '/:id',
  authenticate,
  isAdmin,
  upload.single('image'),
  handleVercelUpload,
  productController.updateProduct
);
router.delete('/:id', authenticate, isAdmin, productController.deleteProduct);

module.exports = router;
