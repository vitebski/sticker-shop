import { useState, useEffect, useContext } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaSearch, FaFilter, FaTimes, FaShoppingCart } from 'react-icons/fa';
import CartContext from '../context/CartContext';
import Spinner from '../components/ui/Spinner';

const ProductList = () => {
  const { categoryId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { addToCart } = useContext(CartContext);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(categoryId || '');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [sortBy, setSortBy] = useState('newest');

  // Get query params
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const page = queryParams.get('page');
    const search = queryParams.get('search');
    const sort = queryParams.get('sort');

    if (page) setCurrentPage(Number(page));
    if (search) setSearchTerm(search);
    if (sort) setSortBy(sort);
    if (categoryId) setSelectedCategory(categoryId);
  }, [location.search, categoryId]);

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);

        // Build query params
        const params = new URLSearchParams();
        params.append('page', currentPage);
        params.append('pageSize', 12);

        if (searchTerm) params.append('search', searchTerm);
        if (selectedCategory) params.append('category', selectedCategory);
        if (priceRange.min) params.append('minPrice', priceRange.min);
        if (priceRange.max) params.append('maxPrice', priceRange.max);

        // Sort options
        switch (sortBy) {
          case 'price-low':
            params.append('sort', 'price');
            break;
          case 'price-high':
            params.append('sort', '-price');
            break;
          case 'name-asc':
            params.append('sort', 'name');
            break;
          case 'name-desc':
            params.append('sort', '-name');
            break;
          default:
            params.append('sort', '-createdAt');
        }

        const response = await axios.get(`/api/products?${params.toString()}`);

        setProducts(response.data.products);
        setTotalPages(response.data.pages);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching products:', error);
        setError('Failed to load products. Please try again.');
        setLoading(false);
      }
    };

    fetchProducts();
  }, [currentPage, searchTerm, selectedCategory, priceRange, sortBy]);

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

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);

    // Update URL with search params
    const params = new URLSearchParams();
    if (searchTerm) params.append('search', searchTerm);
    if (selectedCategory) params.append('category', selectedCategory);
    if (sortBy !== 'newest') params.append('sort', sortBy);

    navigate(`/products?${params.toString()}`);
  };

  // Handle pagination
  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);

    // Update URL with page param
    const params = new URLSearchParams(location.search);
    params.set('page', page);
    navigate(`${location.pathname}?${params.toString()}`);
  };

  // Handle add to cart
  const handleAddToCart = async (productId) => {
    try {
      await addToCart(productId, 1);
      // Show success message
    } catch (error) {
      console.error('Error adding to cart:', error);
      // Show error message
    }
  };

  // Reset filters
  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setPriceRange({ min: '', max: '' });
    setSortBy('newest');
    setCurrentPage(1);
    navigate('/products');
  };

  return (
    <div className="product-list-page">
      <div className="container">
        <div className="page-header">
          <h1>
            {categoryId && categories.find(c => c._id === categoryId)
              ? `${categories.find(c => c._id === categoryId).name} Stickers`
              : 'All Stickers'}
          </h1>

          <div className="search-bar">
            <form onSubmit={handleSearch}>
              <input
                type="text"
                placeholder="Search stickers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button type="submit">
                <FaSearch />
              </button>
            </form>
          </div>
        </div>

        <div className="product-list-content">
          {/* Filters */}
          <div className={`filters-sidebar ${filterOpen ? 'active' : ''}`}>
            <div className="filters-header">
              <h3>Filters</h3>
              <button className="close-filters" onClick={() => setFilterOpen(false)}>
                <FaTimes />
              </button>
            </div>

            <div className="filter-section">
              <h4>Categories</h4>
              <ul className="category-filters">
                <li>
                  <label>
                    <input
                      type="radio"
                      name="category"
                      value=""
                      checked={selectedCategory === ''}
                      onChange={() => setSelectedCategory('')}
                    />
                    All Categories
                  </label>
                </li>
                {categories.map((category) => (
                  <li key={category._id}>
                    <label>
                      <input
                        type="radio"
                        name="category"
                        value={category._id}
                        checked={selectedCategory === category._id}
                        onChange={() => setSelectedCategory(category._id)}
                      />
                      {category.name}
                    </label>
                  </li>
                ))}
              </ul>
            </div>

            <div className="filter-section">
              <h4>Price Range</h4>
              <div className="price-range-inputs">
                <input
                  type="number"
                  placeholder="Min"
                  value={priceRange.min}
                  onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                />
                <span>to</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={priceRange.max}
                  onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                />
              </div>
            </div>

            <div className="filter-actions">
              <button className="btn btn-primary" onClick={handleSearch}>
                Apply Filters
              </button>
              <button className="btn" onClick={resetFilters}>
                Reset
              </button>
            </div>
          </div>

          {/* Products */}
          <div className="products-container">
            <div className="products-header">
              <button
                className="filter-toggle"
                onClick={() => setFilterOpen(!filterOpen)}
              >
                <FaFilter /> Filters
              </button>

              <div className="sort-options">
                <label>Sort by:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="newest">Newest</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="name-asc">Name: A to Z</option>
                  <option value="name-desc">Name: Z to A</option>
                </select>
              </div>
            </div>

            {loading ? (
              <Spinner />
            ) : error ? (
              <div className="error-message">{error}</div>
            ) : products.length === 0 ? (
              <div className="no-products">
                <p>No products found. Try adjusting your filters.</p>
                <button className="btn btn-primary" onClick={resetFilters}>
                  Clear Filters
                </button>
              </div>
            ) : (
              <>
                <div className="products-grid">
                  {products.map((product) => (
                    <div className="product-card" key={product._id}>
                      <div className="product-image">
                        <img
                          src={product.image}
                          alt={product.name}
                          onClick={() => navigate(`/product/${product._id}`)}
                        />
                      </div>
                      <div className="product-info">
                        <h3 onClick={() => navigate(`/product/${product._id}`)}>
                          {product.name}
                        </h3>
                        <p className="product-price">${product.price.toFixed(2)}</p>
                        <div className="product-actions">
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => navigate(`/product/${product._id}`)}
                          >
                            View Details
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleAddToCart(product._id)}
                            disabled={product.stock === 0}
                          >
                            <FaShoppingCart />
                          </button>
                        </div>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductList;
