import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaExclamationCircle, FaTruck } from 'react-icons/fa';
import axios from 'axios';
import Spinner from '../components/ui/Spinner';

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch order details
  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await axios.get(`/api/orders/${id}`);
        setOrder(response.data);

        setLoading(false);
      } catch (error) {
        console.error('Error fetching order:', error);
        setError('Failed to load order details. Please try again.');
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id]);

  // Format date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
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

  if (loading) {
    return (
      <div className="order-detail-page">
        <div className="container">
          <Spinner />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="order-detail-page">
        <div className="container">
          <div className="error-message">
            <FaExclamationCircle /> {error || 'Order not found'}
          </div>
          <button className="btn" onClick={() => navigate('/orders')}>
            <FaArrowLeft /> Back to Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="order-detail-page">
      <div className="container">
        <div className="page-header">
          <h1>Order Details</h1>
          <Link to="/orders" className="btn">
            <FaArrowLeft /> Back to Orders
          </Link>
        </div>

        <div className="order-detail-content">
          <div className="order-info-section">
            <div className="order-header">
              <div>
                <h2>Order #{order._id.substring(0, 8)}</h2>
                <p className="order-date">Placed on {formatDate(order.createdAt)}</p>
              </div>
              <div className="order-status">
                <span className={`status-badge ${getStatusBadgeClass(order.status)}`}>
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
              </div>
            </div>

            {order.status === 'shipped' && order.trackingNumber && (
              <div className="tracking-info">
                <FaTruck /> Your order has been shipped!
                <p>
                  Tracking Number: <strong>{order.trackingNumber}</strong>
                </p>
              </div>
            )}
          </div>

          <div className="order-details-grid">
            <div className="order-items-section">
              <h3>Order Items</h3>
              <div className="order-items">
                {order.items.map((item) => (
                  <div className="order-item" key={item._id}>
                    <div className="item-image">
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                      />
                    </div>
                    <div className="item-details">
                      <h4>{item.product.name}</h4>
                      <div className="item-price-qty">
                        <span>${item.price.toFixed(2)} x {item.quantity}</span>
                        <span className="item-total">
                          ${(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="order-summary-section">
              <h3>Order Summary</h3>
              <div className="summary-details">
                <div className="summary-row">
                  <span>Subtotal:</span>
                  <span>${order.subtotal.toFixed(2)}</span>
                </div>
                <div className="summary-row">
                  <span>Tax:</span>
                  <span>${order.tax.toFixed(2)}</span>
                </div>
                <div className="summary-row">
                  <span>Shipping:</span>
                  <span>
                    {order.shipping === 0
                      ? 'Free'
                      : `$${order.shipping.toFixed(2)}`}
                  </span>
                </div>
                <div className="summary-row total">
                  <span>Total:</span>
                  <span>${order.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="payment-info">
                <h4>Payment Information</h4>
                <p>
                  <strong>Method:</strong>{' '}
                  {order.paymentInfo.method.charAt(0).toUpperCase() +
                    order.paymentInfo.method.slice(1)}
                </p>
                <p>
                  <strong>Status:</strong>{' '}
                  {order.paymentInfo.status.charAt(0).toUpperCase() +
                    order.paymentInfo.status.slice(1)}
                </p>
              </div>
            </div>
          </div>

          <div className="shipping-section">
            <h3>Shipping Address</h3>
            <div className="address-details">
              <p>{order.shippingAddress.street}</p>
              <p>
                {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                {order.shippingAddress.zipCode}
              </p>
              <p>{order.shippingAddress.country}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
