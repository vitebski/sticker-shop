const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');

// Public route for config
router.get('/config', paymentController.getPaymentConfig);

// Protected routes
router.use(authenticate);

router.post('/create-payment-intent', paymentController.createPaymentIntent);
router.get('/calculate-total', paymentController.calculateOrderTotal);

module.exports = router;
