import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaEye, FaExclamationCircle } from 'react-icons/fa';
import axios from 'axios';
import Spinner from '../components/ui/Spinner';

const OrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch user's orders
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await axios.get('/api/orders/myorders');
        setOrders(response.data);
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching orders:', error);
        setError('Failed to load your orders. Please try again.');
        setLoading(false);
      }
    };
    
    fetchOrders();
  }, []);

  // Format date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Get status badge class
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending':
        return 'status-pending';
      case 'processing':
        return 'status-processing';
      case 'shipped':
        return 'status-shipped';
      case 'delivered':
        return 'status-delivered';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return '';
    }
  };

  return (
    <div className="order-history-page">
      <div className="container">
        <div className="page-header">
          <h1>My Orders</h1>
        </div>
        
        {loading ? (
          <Spinner />
        ) : error ? (
          <div className="error-message">
            <FaExclamationCircle /> {error}
          </div>
        ) : orders.length === 0 ? (
          <div className="no-orders">
            <h2>No Orders Found</h2>
            <p>You haven't placed any orders yet.</p>
            <Link to="/products" className="btn btn-primary">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="orders-container">
            <div className="orders-table">
              <div className="orders-header">
                <div className="order-header-id">Order ID</div>
                <div className="order-header-date">Date</div>
                <div className="order-header-total">Total</div>
                <div className="order-header-status">Status</div>
                <div className="order-header-actions">Actions</div>
              </div>
              
              {orders.map((order) => (
                <div className="order-item" key={order._id}>
                  <div className="order-id">#{order._id.substring(0, 8)}</div>
                  <div className="order-date">{formatDate(order.createdAt)}</div>
                  <div className="order-total">${order.total.toFixed(2)}</div>
                  <div className="order-status">
                    <span className={`status-badge ${getStatusBadgeClass(order.status)}`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </div>
                  <div className="order-actions">
                    <Link to={`/order/${order._id}`} className="btn btn-sm">
                      <FaEye /> View
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderHistory;
