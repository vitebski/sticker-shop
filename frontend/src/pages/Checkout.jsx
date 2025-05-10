import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaLock, FaExclamationCircle } from 'react-icons/fa';
import { CardElement, useStripe, useElements, Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import CartContext from '../context/CartContext';
import Spinner from '../components/ui/Spinner';

// Stripe promise placeholder - will be replaced with actual publishable key
const stripePromise = loadStripe('pk_test_placeholder');

const CheckoutForm = () => {
  const { user } = useContext(AuthContext);
  const { cart, clearCart } = useContext(CartContext);
  const navigate = useNavigate();
  const stripe = useStripe();
  const elements = useElements();
  
  const [orderSummary, setOrderSummary] = useState({
    subtotal: 0,
    tax: 0,
    shipping: 0,
    total: 0,
  });
  const [shippingAddress, setShippingAddress] = useState({
    street: user?.address?.street || '',
    city: user?.address?.city || '',
    state: user?.address?.state || '',
    zipCode: user?.address?.zipCode || '',
    country: user?.address?.country || 'US',
  });
  const [paymentError, setPaymentError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [orderCompleted, setOrderCompleted] = useState(false);
  const [orderId, setOrderId] = useState('');
  
  // Fetch order total
  useEffect(() => {
    const calculateTotal = async () => {
      try {
        const response = await axios.get('/api/payment/calculate-total');
        setOrderSummary(response.data);
        
        // Create payment intent
        const intentRes = await axios.post('/api/payment/create-payment-intent', {
          total: response.data.total,
        });
        
        setClientSecret(intentRes.data.clientSecret);
      } catch (error) {
        console.error('Error calculating total:', error);
        setPaymentError('Failed to calculate order total. Please try again.');
      }
    };
    
    if (cart.items.length > 0) {
      calculateTotal();
    } else {
      navigate('/cart');
    }
  }, [cart.items, navigate]);
  
  // Handle shipping address change
  const handleAddressChange = (e) => {
    setShippingAddress({
      ...shippingAddress,
      [e.target.name]: e.target.value,
    });
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }
    
    // Validate shipping address
    const { street, city, state, zipCode, country } = shippingAddress;
    if (!street || !city || !state || !zipCode || !country) {
      setPaymentError('Please fill in all shipping address fields');
      return;
    }
    
    setProcessing(true);
    setPaymentError('');
    
    try {
      // Confirm card payment
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: {
            name: user.name,
            email: user.email,
          },
        },
      });
      
      if (result.error) {
        setPaymentError(result.error.message);
        setProcessing(false);
      } else if (result.paymentIntent.status === 'succeeded') {
        // Create order
        const orderData = {
          shippingAddress,
          paymentInfo: {
            id: result.paymentIntent.id,
            status: result.paymentIntent.status,
            method: 'stripe',
          },
          subtotal: orderSummary.subtotal,
          tax: orderSummary.tax,
          shipping: orderSummary.shipping,
          total: orderSummary.total,
        };
        
        const orderRes = await axios.post('/api/orders', orderData);
        
        // Clear cart
        await clearCart();
        
        // Set order completed
        setOrderCompleted(true);
        setOrderId(orderRes.data._id);
        
        // Redirect to order confirmation after a delay
        setTimeout(() => {
          navigate(`/order/${orderRes.data._id}`);
        }, 3000);
      }
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentError('Payment failed. Please try again.');
      setProcessing(false);
    }
  };
  
  if (orderCompleted) {
    return (
      <div className="order-success">
        <div className="success-icon">✓</div>
        <h2>Order Placed Successfully!</h2>
        <p>Your order #{orderId} has been placed.</p>
        <p>You will be redirected to the order details page shortly...</p>
      </div>
    );
  }
  
  return (
    <div className="checkout-form">
      {paymentError && (
        <div className="payment-error">
          <FaExclamationCircle /> {paymentError}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-section">
          <h3>Shipping Address</h3>
          <div className="form-group">
            <label htmlFor="street">Street Address</label>
            <input
              type="text"
              id="street"
              name="street"
              value={shippingAddress.street}
              onChange={handleAddressChange}
              required
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="city">City</label>
              <input
                type="text"
                id="city"
                name="city"
                value={shippingAddress.city}
                onChange={handleAddressChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="state">State</label>
              <input
                type="text"
                id="state"
                name="state"
                value={shippingAddress.state}
                onChange={handleAddressChange}
                required
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="zipCode">Zip Code</label>
              <input
                type="text"
                id="zipCode"
                name="zipCode"
                value={shippingAddress.zipCode}
                onChange={handleAddressChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="country">Country</label>
              <select
                id="country"
                name="country"
                value={shippingAddress.country}
                onChange={handleAddressChange}
                required
              >
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="GB">United Kingdom</option>
                <option value="AU">Australia</option>
                {/* Add more countries as needed */}
              </select>
            </div>
          </div>
        </div>
        
        <div className="form-section">
          <h3>Payment Information</h3>
          <div className="card-element-container">
            <div className="card-element">
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: '#424770',
                      '::placeholder': {
                        color: '#aab7c4',
                      },
                    },
                    invalid: {
                      color: '#9e2146',
                    },
                  },
                }}
              />
            </div>
            <div className="secure-badge">
              <FaLock /> Secure Payment
            </div>
          </div>
        </div>
        
        <div className="order-summary-section">
          <h3>Order Summary</h3>
          <div className="summary-details">
            <div className="summary-row">
              <span>Subtotal:</span>
              <span>${orderSummary.subtotal.toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Tax:</span>
              <span>${orderSummary.tax.toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Shipping:</span>
              <span>
                {orderSummary.shipping === 0
                  ? 'Free'
                  : `$${orderSummary.shipping.toFixed(2)}`}
              </span>
            </div>
            <div className="summary-row total">
              <span>Total:</span>
              <span>${orderSummary.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        <button
          type="submit"
          className="btn btn-primary btn-block place-order-btn"
          disabled={!stripe || processing || !clientSecret}
        >
          {processing ? 'Processing...' : 'Place Order'}
        </button>
      </form>
    </div>
  );
};

const Checkout = () => {
  const [stripeKey, setStripeKey] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Fetch Stripe publishable key
  useEffect(() => {
    const getStripeKey = async () => {
      try {
        const response = await axios.get('/api/payment/config');
        setStripeKey(response.data.publishableKey);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching Stripe key:', error);
        setLoading(false);
      }
    };
    
    getStripeKey();
  }, []);
  
  if (loading) {
    return (
      <div className="checkout-page">
        <div className="container">
          <Spinner />
        </div>
      </div>
    );
  }
  
  return (
    <div className="checkout-page">
      <div className="container">
        <div className="page-header">
          <h1>Checkout</h1>
        </div>
        
        <div className="checkout-content">
          {stripeKey ? (
            <Elements stripe={loadStripe(stripeKey)}>
              <CheckoutForm />
            </Elements>
          ) : (
            <div className="error-message">
              Payment system is currently unavailable. Please try again later.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Checkout;
