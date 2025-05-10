import axios from 'axios';

// Set base URL for production if needed
const isProduction = import.meta.env.PROD;
if (isProduction) {
  // In production, the API is on the same domain
  axios.defaults.baseURL = window.location.origin;
}

// Add request interceptor for debugging
axios.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Interceptor to handle errors globally
axios.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('API Response Error:', error);

    // Handle 401 Unauthorized errors
    if (error.response && error.response.status === 401) {
      // Check if not on login or register page
      if (
        !window.location.pathname.includes('/login') &&
        !window.location.pathname.includes('/register')
      ) {
        // Clear user data from localStorage
        localStorage.removeItem('user');

        // Redirect to login page
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default axios;
