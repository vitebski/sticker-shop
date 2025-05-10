const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate, isAdmin } = require('../middleware/auth');

// All order routes are protected
router.use(authenticate);

// User routes
router.get('/myorders', orderController.getUserOrders);
router.post('/', orderController.createOrder);
router.get('/:id', orderController.getOrderById);

// Admin routes
router.get('/', isAdmin, orderController.getOrders);
router.put('/:id/status', isAdmin, orderController.updateOrderStatus);

module.exports = router;
