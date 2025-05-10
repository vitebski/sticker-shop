import { useState, useEffect } from 'react';
import { FaEye, FaSearch, FaExclamationCircle } from 'react-icons/fa';
import axios from 'axios';
import Spinner from '../../components/ui/Spinner';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [formData, setFormData] = useState({
    status: '',
    trackingNumber: '',
  });
  const [formError, setFormError] = useState('');

  // Fetch orders
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const params = new URLSearchParams();
        params.append('page', currentPage);
        params.append('pageSize', 10);
        
        if (searchTerm) {
          params.append('search', searchTerm);
        }
        
        if (statusFilter) {
          params.append('status', statusFilter);
        }
        
        const response = await axios.get(`/api/orders?${params.toString()}`);
        
        setOrders(response.data.orders);
        setTotalPages(response.data.pages);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching orders:', error);
        setError('Failed to load orders. Please try again.');
        setLoading(false);
      }
    };
    
    fetchOrders();
  }, [currentPage, searchTerm, statusFilter]);

  // Format date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  // Handle pagination
  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  // Open order details modal
  const openOrderModal = (order) => {
    setSelectedOrder(order);
    setFormData({
      status: order.status,
      trackingNumber: order.trackingNumber || '',
    });
    setFormError('');
    setShowModal(true);
  };

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData({
      ...formData,
      [name]: value,
    });
    
    // Clear form error when user types
    setFormError('');
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.status) {
      setFormError('Please select an order status');
      return;
    }
    
    try {
      await axios.put(`/api/orders/${selectedOrder._id}/status`, formData);
      
      // Refresh order list
      const params = new URLSearchParams();
      params.append('page', currentPage);
      params.append('pageSize', 10);
      
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      
      if (statusFilter) {
        params.append('status', statusFilter);
      }
      
      const response = await axios.get(`/api/orders?${params.toString()}`);
      setOrders(response.data.orders);
      
      setShowModal(false);
    } catch (error) {
      console.error('Error updating order:', error);
      setFormError(error.response?.data?.message || 'Failed to update order');
    }
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
    <div className="admin-orders-page">
      <div className="container">
        <div className="page-header">
          <h1>Manage Orders</h1>
        </div>
        
        <div className="filters-row">
          <div className="search-bar">
            <form onSubmit={handleSearch}>
              <input
                type="text"
                placeholder="Search by order ID or customer name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button type="submit">
                <FaSearch />
              </button>
            </form>
          </div>
          
          <div className="status-filter">
            <label htmlFor="statusFilter">Filter by Status:</label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
        
        {loading ? (
          <Spinner />
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : orders.length === 0 ? (
          <div className="no-orders">
            <p>No orders found.</p>
          </div>
        ) : (
          <>
            <div className="orders-table">
              <div className="table-header">
                <div className="header-id">Order ID</div>
                <div className="header-customer">Customer</div>
                <div className="header-date">Date</div>
                <div className="header-total">Total</div>
                <div className="header-status">Status</div>
                <div className="header-actions">Actions</div>
              </div>
              
              {orders.map((order) => (
                <div className="table-row" key={order._id}>
                  <div className="cell-id">#{order._id.substring(0, 8)}</div>
                  <div className="cell-customer">{order.user.name}</div>
                  <div className="cell-date">{formatDate(order.createdAt)}</div>
                  <div className="cell-total">${order.total.toFixed(2)}</div>
                  <div className="cell-status">
                    <span className={`status-badge ${getStatusBadgeClass(order.status)}`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </div>
                  <div className="cell-actions">
                    <button
                      className="btn btn-sm btn-view"
                      onClick={() => openOrderModal(order)}
                    >
                      <FaEye />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                
                {[...Array(totalPages).keys()].map((page) => (
                  <button
                    key={page + 1}
                    className={currentPage === page + 1 ? 'active' : ''}
                    onClick={() => handlePageChange(page + 1)}
                  >
                    {page + 1}
                  </button>
                ))}
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
        
        {/* Order Details Modal */}
        {showModal && selectedOrder && (
          <div className="modal-overlay">
            <div className="modal order-modal">
              <div className="modal-header">
                <h2>Order #{selectedOrder._id.substring(0, 8)}</h2>
                <button className="close-btn" onClick={() => setShowModal(false)}>
                  &times;
                </button>
              </div>
              
              <div className="modal-body">
                <div className="order-details">
                  <div className="order-info">
                    <p>
                      <strong>Date:</strong> {formatDate(selectedOrder.createdAt)}
                    </p>
                    <p>
                      <strong>Customer:</strong> {selectedOrder.user.name}
                    </p>
                    <p>
                      <strong>Email:</strong> {selectedOrder.user.email}
                    </p>
                  </div>
                  
                  <div className="order-items">
                    <h3>Order Items</h3>
                    <div className="items-list">
                      {selectedOrder.items.map((item) => (
                        <div className="order-item" key={item._id}>
                          <div className="item-info">
                            <p className="item-name">{item.product.name}</p>
                            <p className="item-price">
                              ${item.price.toFixed(2)} x {item.quantity}
                            </p>
                          </div>
                          <div className="item-total">
                            ${(item.price * item.quantity).toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="order-summary">
                      <div className="summary-row">
                        <span>Subtotal:</span>
                        <span>${selectedOrder.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="summary-row">
                        <span>Tax:</span>
                        <span>${selectedOrder.tax.toFixed(2)}</span>
                      </div>
                      <div className="summary-row">
                        <span>Shipping:</span>
                        <span>
                          {selectedOrder.shipping === 0
                            ? 'Free'
                            : `$${selectedOrder.shipping.toFixed(2)}`}
                        </span>
                      </div>
                      <div className="summary-row total">
                        <span>Total:</span>
                        <span>${selectedOrder.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="shipping-address">
                    <h3>Shipping Address</h3>
                    <p>{selectedOrder.shippingAddress.street}</p>
                    <p>
                      {selectedOrder.shippingAddress.city},{' '}
                      {selectedOrder.shippingAddress.state}{' '}
                      {selectedOrder.shippingAddress.zipCode}
                    </p>
                    <p>{selectedOrder.shippingAddress.country}</p>
                  </div>
                  
                  <div className="payment-info">
                    <h3>Payment Information</h3>
                    <p>
                      <strong>Method:</strong>{' '}
                      {selectedOrder.paymentInfo.method.charAt(0).toUpperCase() +
                        selectedOrder.paymentInfo.method.slice(1)}
                    </p>
                    <p>
                      <strong>Status:</strong>{' '}
                      {selectedOrder.paymentInfo.status.charAt(0).toUpperCase() +
                        selectedOrder.paymentInfo.status.slice(1)}
                    </p>
                  </div>
                  
                  {formError && (
                    <div className="form-error">
                      <FaExclamationCircle /> {formError}
                    </div>
                  )}
                  
                  <form onSubmit={handleSubmit} className="update-order-form">
                    <h3>Update Order</h3>
                    
                    <div className="form-group">
                      <label htmlFor="status">Order Status</label>
                      <select
                        id="status"
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        required
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                    
                    {formData.status === 'shipped' && (
                      <div className="form-group">
                        <label htmlFor="trackingNumber">Tracking Number</label>
                        <input
                          type="text"
                          id="trackingNumber"
                          name="trackingNumber"
                          value={formData.trackingNumber}
                          onChange={handleChange}
                          placeholder="Enter tracking number"
                        />
                      </div>
                    )}
                    
                    <button type="submit" className="btn btn-primary">
                      Update Order
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;
