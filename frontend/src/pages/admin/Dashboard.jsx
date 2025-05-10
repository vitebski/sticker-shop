import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaBox, FaShoppingCart, FaUsers, FaTag, FaChartLine } from 'react-icons/fa';
import axios from 'axios';
import Spinner from '../../components/ui/Spinner';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalUsers: 0,
    totalCategories: 0,
    recentOrders: [],
    topProducts: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch dashboard stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // In a real application, you would have a dedicated endpoint for dashboard stats
        // For this example, we'll make separate requests and combine the data
        
        const productsRes = await axios.get('/api/products?limit=1');
        const ordersRes = await axios.get('/api/orders?limit=5');
        const categoriesRes = await axios.get('/api/categories');
        
        // Simulate user count (would come from a real endpoint)
        const userCount = 25;
        
        setStats({
          totalProducts: productsRes.data.total || 0,
          totalOrders: ordersRes.data.total || 0,
          totalUsers: userCount,
          totalCategories: categoriesRes.data.length || 0,
          recentOrders: ordersRes.data.orders || [],
          topProducts: [], // Would come from a dedicated endpoint
        });
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        setError('Failed to load dashboard data. Please try again.');
        setLoading(false);
      }
    };
    
    fetchStats();
  }, []);

  // Format date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="container">
          <Spinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard">
        <div className="container">
          <div className="error-message">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="container">
        <div className="page-header">
          <h1>Admin Dashboard</h1>
        </div>
        
        <div className="dashboard-content">
          {/* Stats Cards */}
          <div className="stats-cards">
            <div className="stat-card">
              <div className="stat-icon products-icon">
                <FaBox />
              </div>
              <div className="stat-details">
                <h3>Products</h3>
                <p className="stat-value">{stats.totalProducts}</p>
                <Link to="/admin/products" className="stat-link">
                  View All
                </Link>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon orders-icon">
                <FaShoppingCart />
              </div>
              <div className="stat-details">
                <h3>Orders</h3>
                <p className="stat-value">{stats.totalOrders}</p>
                <Link to="/admin/orders" className="stat-link">
                  View All
                </Link>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon users-icon">
                <FaUsers />
              </div>
              <div className="stat-details">
                <h3>Users</h3>
                <p className="stat-value">{stats.totalUsers}</p>
                <Link to="/admin/users" className="stat-link">
                  View All
                </Link>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon categories-icon">
                <FaTag />
              </div>
              <div className="stat-details">
                <h3>Categories</h3>
                <p className="stat-value">{stats.totalCategories}</p>
                <Link to="/admin/categories" className="stat-link">
                  View All
                </Link>
              </div>
            </div>
          </div>
          
          {/* Recent Orders */}
          <div className="dashboard-section">
            <div className="section-header">
              <h2>
                <FaShoppingCart /> Recent Orders
              </h2>
              <Link to="/admin/orders" className="view-all-link">
                View All
              </Link>
            </div>
            
            <div className="recent-orders">
              {stats.recentOrders.length === 0 ? (
                <p>No recent orders found.</p>
              ) : (
                <div className="orders-table">
                  <div className="orders-header">
                    <div className="order-header-id">Order ID</div>
                    <div className="order-header-customer">Customer</div>
                    <div className="order-header-date">Date</div>
                    <div className="order-header-total">Total</div>
                    <div className="order-header-status">Status</div>
                  </div>
                  
                  {stats.recentOrders.map((order) => (
                    <Link
                      to={`/admin/orders/${order._id}`}
                      className="order-item"
                      key={order._id}
                    >
                      <div className="order-id">#{order._id.substring(0, 8)}</div>
                      <div className="order-customer">{order.user.name}</div>
                      <div className="order-date">{formatDate(order.createdAt)}</div>
                      <div className="order-total">${order.total.toFixed(2)}</div>
                      <div className="order-status">
                        <span className={`status-badge status-${order.status}`}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Sales Overview */}
          <div className="dashboard-section">
            <div className="section-header">
              <h2>
                <FaChartLine /> Sales Overview
              </h2>
            </div>
            
            <div className="sales-overview">
              <p>Sales chart would go here in a real application.</p>
              <div className="placeholder-chart">
                <div className="chart-bar" style={{ height: '60%' }}></div>
                <div className="chart-bar" style={{ height: '80%' }}></div>
                <div className="chart-bar" style={{ height: '40%' }}></div>
                <div className="chart-bar" style={{ height: '70%' }}></div>
                <div className="chart-bar" style={{ height: '90%' }}></div>
                <div className="chart-bar" style={{ height: '50%' }}></div>
                <div className="chart-bar" style={{ height: '75%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
