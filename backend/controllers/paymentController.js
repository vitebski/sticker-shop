const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Cart = require('../models/Cart');

// Create payment intent
exports.createPaymentIntent = async (req, res) => {
  try {
    const { total } = req.body;
    
    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(total * 100), // Stripe expects amount in cents
      currency: 'usd',
      metadata: {
        userId: req.user._id.toString(),
      },
    });
    
    res.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({ message: 'Payment processing error' });
  }
};

// Get payment config
exports.getPaymentConfig = async (req, res) => {
  try {
    // Return public Stripe configuration
    res.json({
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder',
    });
  } catch (error) {
    console.error('Get payment config error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Calculate order total
exports.calculateOrderTotal = async (req, res) => {
  try {
    // Get user's cart
    const cart = await Cart.findOne({ user: req.user._id }).populate({
      path: 'items.product',
      select: 'price',
    });
    
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }
    
    // Calculate subtotal
    const subtotal = cart.items.reduce(
      (total, item) => total + item.product.price * item.quantity,
      0
    );
    
    // Calculate tax (e.g., 8%)
    const tax = subtotal * 0.08;
    
    // Calculate shipping (flat rate or based on total)
    const shipping = subtotal > 50 ? 0 : 5.99;
    
    // Calculate total
    const total = subtotal + tax + shipping;
    
    res.json({
      subtotal: parseFloat(subtotal.toFixed(2)),
      tax: parseFloat(tax.toFixed(2)),
      shipping: parseFloat(shipping.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
    });
  } catch (error) {
    console.error('Calculate order total error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
