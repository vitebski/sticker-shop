import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FaShoppingCart, FaMinus, FaPlus, FaArrowLeft } from 'react-icons/fa';
import axios from 'axios';
import CartContext from '../context/CartContext';
import Spinner from '../components/ui/Spinner';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useContext(CartContext);

  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addingToCart, setAddingToCart] = useState(false);

  // Fetch product details
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await axios.get(`/api/products/${id}`);
        setProduct(response.data);

        // Reset quantity when product changes
        setQuantity(1);

        setLoading(false);
      } catch (error) {
        console.error('Error fetching product:', error);
        setError('Failed to load product details. Please try again.');
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  // Fetch related products
  useEffect(() => {
    const fetchRelatedProducts = async () => {
      if (!product) return;

      try {
        const response = await axios.get(`/api/products?category=${product.category._id}&limit=4&exclude=${product._id}`);
        setRelatedProducts(response.data.products);
      } catch (error) {
        console.error('Error fetching related products:', error);
      }
    };

    if (product) {
      fetchRelatedProducts();
    }
  }, [product]);

  // Handle quantity change
  const handleQuantityChange = (value) => {
    const newQuantity = quantity + value;
    if (newQuantity > 0 && newQuantity <= product.stock) {
      setQuantity(newQuantity);
    }
  };

  // Handle add to cart
  const handleAddToCart = async () => {
    try {
      setAddingToCart(true);
      await addToCart(product._id, quantity);
      setAddingToCart(false);

      // Show success message or redirect to cart
      navigate('/cart');
    } catch (error) {
      console.error('Error adding to cart:', error);
      setAddingToCart(false);
    }
  };

  if (loading) {
    return (
      <div className="product-detail-page">
        <div className="container">
          <Spinner />
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="product-detail-page">
        <div className="container">
          <div className="error-message">
            {error || 'Product not found'}
          </div>
          <Link to="/products" className="btn">
            <FaArrowLeft /> Back to Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="product-detail-page">
      <div className="container">
        <div className="breadcrumb">
          <Link to="/">Home</Link> /
          <Link to="/products">Products</Link> /
          <Link to={`/products/category/${product.category._id}`}>{product.category.name}</Link> /
          <span>{product.name}</span>
        </div>

        <div className="product-detail">
          <div className="product-image">
            <img src={product.image} alt={product.name} />
          </div>

          <div className="product-info">
            <h1>{product.name}</h1>

            <div className="product-price">${product.price.toFixed(2)}</div>

            <div className="product-stock">
              {product.stock > 0 ? (
                <span className="in-stock">In Stock ({product.stock} available)</span>
              ) : (
                <span className="out-of-stock">Out of Stock</span>
              )}
            </div>

            <div className="product-description">
              <h3>Description</h3>
              <p>{product.description}</p>
            </div>

            {product.dimensions && (
              <div className="product-dimensions">
                <h3>Dimensions</h3>
                <p>
                  {product.dimensions.width}" x {product.dimensions.height}"
                </p>
              </div>
            )}

            {product.tags && product.tags.length > 0 && (
              <div className="product-tags">
                <h3>Tags</h3>
                <div className="tags-list">
                  {product.tags.map((tag, index) => (
                    <span key={index} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {product.stock > 0 && (
              <div className="product-actions">
                <div className="quantity-selector">
                  <button
                    className="quantity-btn"
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                  >
                    <FaMinus />
                  </button>
                  <span className="quantity">{quantity}</span>
                  <button
                    className="quantity-btn"
                    onClick={() => handleQuantityChange(1)}
                    disabled={quantity >= product.stock}
                  >
                    <FaPlus />
                  </button>
                </div>

                <button
                  className="btn btn-primary add-to-cart-btn"
                  onClick={handleAddToCart}
                  disabled={addingToCart || product.stock === 0}
                >
                  <FaShoppingCart /> {addingToCart ? 'Adding...' : 'Add to Cart'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="related-products">
            <h2>You May Also Like</h2>
            <div className="products-grid">
              {relatedProducts.map((relatedProduct) => (
                <div className="product-card" key={relatedProduct._id}>
                  <div className="product-image">
                    <img
                      src={relatedProduct.image}
                      alt={relatedProduct.name}
                      onClick={() => navigate(`/product/${relatedProduct._id}`)}
                    />
                  </div>
                  <div className="product-info">
                    <h3 onClick={() => navigate(`/product/${relatedProduct._id}`)}>
                      {relatedProduct.name}
                    </h3>
                    <p className="product-price">${relatedProduct.price.toFixed(2)}</p>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => navigate(`/product/${relatedProduct._id}`)}
                    >
                      View Details
                    </button>
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

export default ProductDetail;
