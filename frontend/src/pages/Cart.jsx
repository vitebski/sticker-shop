import { useContext, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaTrash, FaMinus, FaPlus, FaArrowLeft } from 'react-icons/fa';
import CartContext from '../context/CartContext';
import AuthContext from '../context/AuthContext';
import Spinner from '../components/ui/Spinner';
import axios from 'axios';

const Cart = () => {
  const { cart, loading, error, updateCartItem, removeFromCart, clearCart } = useContext(CartContext);
  const { isAuthenticated } = useContext(AuthContext);
  const [orderSummary, setOrderSummary] = useState({
    subtotal: 0,
    tax: 0,
    shipping: 0,
    total: 0,
  });
  const [calculatingTotal, setCalculatingTotal] = useState(false);
  const navigate = useNavigate();

  // Calculate order total
  useEffect(() => {
    const calculateTotal = async () => {
      if (cart.items.length === 0) {
        setOrderSummary({
          subtotal: 0,
          tax: 0,
          shipping: 0,
          total: 0,
        });
        return;
      }

      if (isAuthenticated) {
        try {
          setCalculatingTotal(true);
          const response = await axios.get('/api/payment/calculate-total');
          setOrderSummary(response.data);
          setCalculatingTotal(false);
        } catch (error) {
          console.error('Error calculating total:', error);
          setCalculatingTotal(false);
        }
      } else {
        // Calculate locally for non-authenticated users
        const subtotal = cart.items.reduce(
          (total, item) => total + (item.product?.price || 0) * item.quantity,
          0
        );
        const tax = subtotal * 0.08;
        const shipping = subtotal > 50 ? 0 : 5.99;
        const total = subtotal + tax + shipping;

        setOrderSummary({
          subtotal: parseFloat(subtotal.toFixed(2)),
          tax: parseFloat(tax.toFixed(2)),
          shipping: parseFloat(shipping.toFixed(2)),
          total: parseFloat(total.toFixed(2)),
        });
      }
    };

    calculateTotal();
  }, [cart.items, isAuthenticated]);

  // Handle quantity change
  const handleQuantityChange = async (productId, quantity) => {
    try {
      if (quantity < 1) return;
      await updateCartItem(productId, quantity);
    } catch (error) {
      console.error('Error updating quantity:', error);
    }
  };

  // Handle remove item
  const handleRemoveItem = async (productId) => {
    try {
      await removeFromCart(productId);
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };

  // Handle clear cart
  const handleClearCart = async () => {
    try {
      await clearCart();
    } catch (error) {
      console.error('Error clearing cart:', error);
    }
  };

  // Handle checkout
  const handleCheckout = () => {
    if (isAuthenticated) {
      navigate('/checkout');
    } else {
      navigate('/login?redirect=checkout');
    }
  };

  return (
    <div className="cart-page">
      <div className="container">
        <div className="page-header">
          <h1>Your Shopping Cart</h1>
        </div>

        {loading ? (
          <Spinner />
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : cart.items.length === 0 ? (
          <div className="empty-cart">
            <h2>Your cart is empty</h2>
            <p>Looks like you haven't added any stickers to your cart yet.</p>
            <Link to="/products" className="btn btn-primary">
              <FaArrowLeft /> Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="cart-content">
            <div className="cart-items">
              <div className="cart-header">
                <div className="cart-header-product">Product</div>
                <div className="cart-header-price">Price</div>
                <div className="cart-header-quantity">Quantity</div>
                <div className="cart-header-total">Total</div>
                <div className="cart-header-actions"></div>
              </div>

              {cart.items.map((item) => (
                <div className="cart-item" key={item.product._id}>
                  <div className="cart-item-product">
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                    />
                    <div className="cart-item-details">
                      <h3>{item.product.name}</h3>
                      {item.product.stock < 5 && (
                        <p className="stock-warning">
                          Only {item.product.stock} left in stock
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="cart-item-price">
                    ${item.product.price.toFixed(2)}
                  </div>

                  <div className="cart-item-quantity">
                    <button
                      className="quantity-btn"
                      onClick={() =>
                        handleQuantityChange(item.product._id, item.quantity - 1)
                      }
                      disabled={item.quantity <= 1}
                    >
                      <FaMinus />
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      className="quantity-btn"
                      onClick={() =>
                        handleQuantityChange(item.product._id, item.quantity + 1)
                      }
                      disabled={item.quantity >= item.product.stock}
                    >
                      <FaPlus />
                    </button>
                  </div>

                  <div className="cart-item-total">
                    ${(item.product.price * item.quantity).toFixed(2)}
                  </div>

                  <div className="cart-item-actions">
                    <button
                      className="remove-btn"
                      onClick={() => handleRemoveItem(item.product._id)}
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              ))}

              <div className="cart-actions">
                <button className="btn" onClick={handleClearCart}>
                  Clear Cart
                </button>
                <Link to="/products" className="btn">
                  Continue Shopping
                </Link>
              </div>
            </div>

            <div className="cart-summary">
              <h2>Order Summary</h2>
              {calculatingTotal ? (
                <div className="calculating">Calculating...</div>
              ) : (
                <div className="summary-details">
                  <div className="summary-row">
                    <span>Subtotal:</span>
                    <span>${orderSummary.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="summary-row">
                    <span>Tax (8%):</span>
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
              )}

              <button
                className="btn btn-primary checkout-btn"
                onClick={handleCheckout}
                disabled={cart.items.length === 0 || calculatingTotal}
              >
                Proceed to Checkout
              </button>

              {!isAuthenticated && (
                <div className="login-reminder">
                  <p>
                    Already have an account?{' '}
                    <Link to="/login?redirect=cart">Login</Link> for a faster
                    checkout experience.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;
