import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { FaArrowRight } from 'react-icons/fa';

const Home = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch featured products
        const productsRes = await axios.get('/api/products?featured=true&limit=4');
        setFeaturedProducts(productsRes.data.products);

        // Fetch categories
        const categoriesRes = await axios.get('/api/categories');
        setCategories(categoriesRes.data);

        setLoading(false);
      } catch (error) {
        console.error('Error fetching home data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <h1>Express Yourself with Our Stickers</h1>
            <p>
              Discover our collection of high-quality, durable stickers for any occasion.
              From laptops to water bottles, make everything uniquely yours.
            </p>
            <div className="hero-buttons">
              <Link to="/products" className="btn btn-primary">
                Shop Now
              </Link>
              <Link to="/products/category/new" className="btn btn-secondary">
                New Arrivals
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="featured-products">
        <div className="container">
          <div className="section-header">
            <h2>Featured Stickers</h2>
            <Link to="/products" className="view-all">
              View All <FaArrowRight />
            </Link>
          </div>

          <div className="products-grid">
            {loading ? (
              <p>Loading featured products...</p>
            ) : featuredProducts.length > 0 ? (
              featuredProducts.map((product) => (
                <div className="product-card" key={product._id}>
                  <div className="product-image">
                    <img src={product.image} alt={product.name} />
                  </div>
                  <div className="product-info">
                    <h3>{product.name}</h3>
                    <p className="product-price">${product.price.toFixed(2)}</p>
                    <Link to={`/product/${product._id}`} className="btn btn-primary btn-sm">
                      View Details
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <p>No featured products found.</p>
            )}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="categories-section">
        <div className="container">
          <div className="section-header">
            <h2>Shop by Category</h2>
          </div>

          <div className="categories-grid">
            {loading ? (
              <p>Loading categories...</p>
            ) : categories.length > 0 ? (
              categories.map((category) => (
                <Link
                  to={`/products/category/${category._id}`}
                  className="category-card"
                  key={category._id}
                >
                  <div className="category-content">
                    <h3>{category.name}</h3>
                    <span className="category-link">
                      Browse <FaArrowRight />
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <p>No categories found.</p>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features-section">
        <div className="container">
          <div className="features-grid">
            <div className="feature">
              <div className="feature-icon">🚚</div>
              <h3>Free Shipping</h3>
              <p>On orders over $50</p>
            </div>
            <div className="feature">
              <div className="feature-icon">🔒</div>
              <h3>Secure Payment</h3>
              <p>Safe & secure checkout</p>
            </div>
            <div className="feature">
              <div className="feature-icon">💯</div>
              <h3>Quality Guarantee</h3>
              <p>Durable, waterproof stickers</p>
            </div>
            <div className="feature">
              <div className="feature-icon">🔄</div>
              <h3>Easy Returns</h3>
              <p>30-day return policy</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
