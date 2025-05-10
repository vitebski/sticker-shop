import { useState, useContext, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaUser, FaEnvelope, FaLock, FaExclamationCircle, FaCheck } from 'react-icons/fa';
import AuthContext from '../context/AuthContext';
import Spinner from '../components/ui/Spinner';

const Profile = () => {
  const { user, updateProfile, loading, error } = useContext(AuthContext);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'US',
    },
  });
  
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState('profile');
  
  // Initialize form data with user data
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        password: '',
        confirmPassword: '',
        address: {
          street: user.address?.street || '',
          city: user.address?.city || '',
          state: user.address?.state || '',
          zipCode: user.address?.zipCode || '',
          country: user.address?.country || 'US',
        },
      });
    }
  }, [user]);
  
  // Update form error when context error changes
  useEffect(() => {
    if (error) {
      setFormError(error);
    }
  }, [error]);
  
  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      // Handle nested address fields
      const [parent, child] = name.split('.');
      setFormData({
        ...formData,
        [parent]: {
          ...formData[parent],
          [child]: value,
        },
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
    
    // Clear messages when user types
    setFormError('');
    setSuccessMessage('');
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    const { name, email, password, confirmPassword, address } = formData;
    
    // Validate form
    if (!name || !email) {
      setFormError('Name and email are required');
      return;
    }
    
    if (password && password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }
    
    try {
      // Prepare update data
      const updateData = {
        name,
        email,
        address,
      };
      
      // Only include password if it's provided
      if (password) {
        updateData.password = password;
      }
      
      await updateProfile(updateData);
      setSuccessMessage('Profile updated successfully');
      
      // Clear password fields
      setFormData({
        ...formData,
        password: '',
        confirmPassword: '',
      });
    } catch (error) {
      // Error is handled by the context and displayed via the useEffect
    }
  };
  
  if (!user) {
    return (
      <div className="profile-page">
        <div className="container">
          <Spinner />
        </div>
      </div>
    );
  }
  
  return (
    <div className="profile-page">
      <div className="container">
        <div className="page-header">
          <h1>My Account</h1>
        </div>
        
        <div className="profile-content">
          <div className="profile-tabs">
            <button
              className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              Profile
            </button>
            <button
              className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
              onClick={() => setActiveTab('orders')}
            >
              Orders
            </button>
            <button
              className={`tab-btn ${activeTab === 'address' ? 'active' : ''}`}
              onClick={() => setActiveTab('address')}
            >
              Address
            </button>
          </div>
          
          <div className="profile-tab-content">
            {activeTab === 'profile' && (
              <div className="profile-info-tab">
                <h2>Profile Information</h2>
                
                {formError && (
                  <div className="form-error">
                    <FaExclamationCircle /> {formError}
                  </div>
                )}
                
                {successMessage && (
                  <div className="form-success">
                    <FaCheck /> {successMessage}
                  </div>
                )}
                
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label htmlFor="name">
                      <FaUser /> Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="email">
                      <FaEnvelope /> Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="password">
                      <FaLock /> New Password (leave blank to keep current)
                    </label>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="confirmPassword">
                      <FaLock /> Confirm New Password
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                    />
                  </div>
                  
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? 'Updating...' : 'Update Profile'}
                  </button>
                </form>
              </div>
            )}
            
            {activeTab === 'orders' && (
              <div className="orders-tab">
                <h2>My Orders</h2>
                <p>View and track your orders.</p>
                <Link to="/orders" className="btn btn-primary">
                  View All Orders
                </Link>
              </div>
            )}
            
            {activeTab === 'address' && (
              <div className="address-tab">
                <h2>Shipping Address</h2>
                
                {formError && (
                  <div className="form-error">
                    <FaExclamationCircle /> {formError}
                  </div>
                )}
                
                {successMessage && (
                  <div className="form-success">
                    <FaCheck /> {successMessage}
                  </div>
                )}
                
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label htmlFor="street">Street Address</label>
                    <input
                      type="text"
                      id="street"
                      name="address.street"
                      value={formData.address.street}
                      onChange={handleChange}
                    />
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="city">City</label>
                      <input
                        type="text"
                        id="city"
                        name="address.city"
                        value={formData.address.city}
                        onChange={handleChange}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="state">State</label>
                      <input
                        type="text"
                        id="state"
                        name="address.state"
                        value={formData.address.state}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="zipCode">Zip Code</label>
                      <input
                        type="text"
                        id="zipCode"
                        name="address.zipCode"
                        value={formData.address.zipCode}
                        onChange={handleChange}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="country">Country</label>
                      <select
                        id="country"
                        name="address.country"
                        value={formData.address.country}
                        onChange={handleChange}
                      >
                        <option value="US">United States</option>
                        <option value="CA">Canada</option>
                        <option value="GB">United Kingdom</option>
                        <option value="AU">Australia</option>
                        {/* Add more countries as needed */}
                      </select>
                    </div>
                  </div>
                  
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? 'Updating...' : 'Update Address'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
