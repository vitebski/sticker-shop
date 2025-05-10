import { useContext, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaShoppingCart, FaUser, FaBars, FaTimes } from 'react-icons/fa';
import AuthContext from '../../context/AuthContext';
import CartContext from '../../context/CartContext';
import axios from 'axios';

const Header = () => {
  const { user, isAuthenticated, isAdmin, logout } = useContext(AuthContext);
  const { getCartTotals } = useContext(CartContext);
  const [categories, setCategories] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  
  const { itemCount } = getCartTotals();

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get('/api/categories');
        setCategories(response.data);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    
    fetchCategories();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          <div className="logo">
            <Link to="/">Sticker Shop</Link>
          </div>
          
          <div className="mobile-toggle" onClick={toggleMobileMenu}>
            {mobileMenuOpen ? <FaTimes /> : <FaBars />}
          </div>
          
          <nav className={`nav-menu ${mobileMenuOpen ? 'active' : ''}`}>
            <ul>
              <li>
                <Link to="/" onClick={() => setMobileMenuOpen(false)}>Home</Link>
              </li>
              <li>
                <Link to="/products" onClick={() => setMobileMenuOpen(false)}>All Stickers</Link>
              </li>
              {categories.length > 0 && (
                <li className="dropdown">
                  <span>Categories</span>
                  <ul className="dropdown-menu">
                    {categories.map((category) => (
                      <li key={category._id}>
                        <Link 
                          to={`/products/category/${category._id}`}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          {category.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              )}
              {isAdmin && (
                <li className="dropdown">
                  <span>Admin</span>
                  <ul className="dropdown-menu">
                    <li>
                      <Link to="/admin" onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
                    </li>
                    <li>
                      <Link to="/admin/products" onClick={() => setMobileMenuOpen(false)}>Products</Link>
                    </li>
                    <li>
                      <Link to="/admin/categories" onClick={() => setMobileMenuOpen(false)}>Categories</Link>
                    </li>
                    <li>
                      <Link to="/admin/orders" onClick={() => setMobileMenuOpen(false)}>Orders</Link>
                    </li>
                  </ul>
                </li>
              )}
            </ul>
          </nav>
          
          <div className="header-actions">
            <Link to="/cart" className="cart-icon">
              <FaShoppingCart />
              {itemCount > 0 && <span className="cart-count">{itemCount}</span>}
            </Link>
            
            {isAuthenticated ? (
              <div className="user-menu dropdown">
                <span className="user-icon">
                  <FaUser />
                  <span className="user-name">{user.name}</span>
                </span>
                <ul className="dropdown-menu">
                  <li>
                    <Link to="/profile">My Profile</Link>
                  </li>
                  <li>
                    <Link to="/orders">My Orders</Link>
                  </li>
                  <li>
                    <button onClick={handleLogout}>Logout</button>
                  </li>
                </ul>
              </div>
            ) : (
              <div className="auth-buttons">
                <Link to="/login" className="btn btn-sm">Login</Link>
                <Link to="/register" className="btn btn-sm btn-primary">Register</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
