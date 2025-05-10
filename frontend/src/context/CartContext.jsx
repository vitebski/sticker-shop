import { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import AuthContext from './AuthContext';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState({ items: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useContext(AuthContext);

  // Fetch cart when user changes
  useEffect(() => {
    if (user) {
      fetchCart();
    } else {
      // Clear cart when user logs out
      setCart({ items: [] });
    }
  }, [user]);

  // Fetch cart from API
  const fetchCart = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get('/api/cart');
      setCart(response.data);
      
      setLoading(false);
    } catch (error) {
      setLoading(false);
      const message = error.response?.data?.message || 'Failed to fetch cart';
      setError(message);
      console.error('Fetch cart error:', error);
    }
  };

  // Add item to cart
  const addToCart = async (productId, quantity = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.post('/api/cart/add', { productId, quantity });
      setCart(response.data);
      
      setLoading(false);
      return response.data;
    } catch (error) {
      setLoading(false);
      const message = error.response?.data?.message || 'Failed to add item to cart';
      setError(message);
      throw new Error(message);
    }
  };

  // Update cart item quantity
  const updateCartItem = async (productId, quantity) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.put('/api/cart/update', { productId, quantity });
      setCart(response.data);
      
      setLoading(false);
      return response.data;
    } catch (error) {
      setLoading(false);
      const message = error.response?.data?.message || 'Failed to update cart';
      setError(message);
      throw new Error(message);
    }
  };

  // Remove item from cart
  const removeFromCart = async (productId) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.delete(`/api/cart/remove/${productId}`);
      setCart(response.data);
      
      setLoading(false);
      return response.data;
    } catch (error) {
      setLoading(false);
      const message = error.response?.data?.message || 'Failed to remove item from cart';
      setError(message);
      throw new Error(message);
    }
  };

  // Clear cart
  const clearCart = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await axios.delete('/api/cart/clear');
      setCart({ items: [] });
      
      setLoading(false);
    } catch (error) {
      setLoading(false);
      const message = error.response?.data?.message || 'Failed to clear cart';
      setError(message);
      throw new Error(message);
    }
  };

  // Calculate cart totals
  const getCartTotals = () => {
    const itemCount = cart.items.reduce((total, item) => total + item.quantity, 0);
    const subtotal = cart.items.reduce(
      (total, item) => total + (item.product?.price || 0) * item.quantity,
      0
    );
    
    return {
      itemCount,
      subtotal: parseFloat(subtotal.toFixed(2)),
    };
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        error,
        fetchCart,
        addToCart,
        updateCartItem,
        removeFromCart,
        clearCart,
        getCartTotals,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export default CartContext;
