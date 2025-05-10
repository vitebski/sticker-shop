import { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaSearch, FaExclamationCircle } from 'react-icons/fa';
import axios from 'axios';
import Spinner from '../../components/ui/Spinner';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    stock: '',
    featured: false,
    dimensions: {
      width: '',
      height: '',
    },
    tags: '',
    image: null,
  });
  const [formError, setFormError] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    show: false,
    productId: null,
  });

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        params.append('page', currentPage);
        params.append('pageSize', 10);

        if (searchTerm) {
          params.append('search', searchTerm);
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
  }, [currentPage, searchTerm]);

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
  };

  // Handle pagination
  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  // Open modal for adding a product
  const openAddModal = () => {
    setModalMode('add');
    setFormData({
      name: '',
      description: '',
      price: '',
      category: categories.length > 0 ? categories[0]._id : '',
      stock: '',
      featured: false,
      dimensions: {
        width: '',
        height: '',
      },
      tags: '',
      image: null,
    });
    setFormError('');
    setShowModal(true);
  };

  // Open modal for editing a product
  const openEditModal = (product) => {
    setModalMode('edit');
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      category: product.category._id,
      stock: product.stock.toString(),
      featured: product.featured,
      dimensions: {
        width: product.dimensions?.width?.toString() || '',
        height: product.dimensions?.height?.toString() || '',
      },
      tags: product.tags ? product.tags.join(', ') : '',
      image: null, // Can't pre-fill file input
    });
    setFormError('');
    setShowModal(true);
  };

  // Handle input change
  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;

    if (name === 'image') {
      setFormData({
        ...formData,
        image: files[0],
      });
    } else if (type === 'checkbox') {
      setFormData({
        ...formData,
        [name]: checked,
      });
    } else if (name.includes('.')) {
      // Handle nested fields (dimensions)
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

    // Clear form error when user types
    setFormError('');
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    if (!formData.name || !formData.description || !formData.price || !formData.category) {
      setFormError('Please fill in all required fields');
      return;
    }

    if (modalMode === 'add' && !formData.image) {
      setFormError('Please upload an image');
      return;
    }

    try {
      // Create FormData object for file upload
      const productData = new FormData();
      productData.append('name', formData.name);
      productData.append('description', formData.description);
      productData.append('price', formData.price);
      productData.append('category', formData.category);
      productData.append('stock', formData.stock || 0);
      productData.append('featured', formData.featured);

      if (formData.dimensions.width && formData.dimensions.height) {
        productData.append('dimensions[width]', formData.dimensions.width);
        productData.append('dimensions[height]', formData.dimensions.height);
      }

      if (formData.tags) {
        productData.append('tags', formData.tags);
      }

      if (formData.image) {
        productData.append('image', formData.image);
      }

      if (modalMode === 'add') {
        // Create new product
        await axios.post('/api/products', productData);
      } else {
        // Update existing product
        await axios.put(`/api/products/${selectedProduct._id}`, productData);
      }

      // Refresh product list
      setCurrentPage(1);
      setShowModal(false);

      // Fetch updated products
      const response = await axios.get('/api/products?page=1&pageSize=10');
      setProducts(response.data.products);
      setTotalPages(response.data.pages);
    } catch (error) {
      console.error('Error saving product:', error);
      setFormError(error.response?.data?.message || 'Failed to save product');
    }
  };

  // Open delete confirmation
  const openDeleteConfirmation = (productId) => {
    setDeleteConfirmation({
      show: true,
      productId,
    });
  };

  // Close delete confirmation
  const closeDeleteConfirmation = () => {
    setDeleteConfirmation({
      show: false,
      productId: null,
    });
  };

  // Handle product deletion
  const handleDeleteProduct = async () => {
    try {
      await axios.delete(`/api/products/${deleteConfirmation.productId}`);

      // Refresh product list
      const response = await axios.get(`/api/products?page=${currentPage}&pageSize=10`);
      setProducts(response.data.products);
      setTotalPages(response.data.pages);

      // If current page is now empty and not the first page, go to previous page
      if (response.data.products.length === 0 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }

      closeDeleteConfirmation();
    } catch (error) {
      console.error('Error deleting product:', error);
      setError('Failed to delete product. Please try again.');
      closeDeleteConfirmation();
    }
  };

  return (
    <div className="admin-products-page">
      <div className="container">
        <div className="page-header">
          <h1>Manage Products</h1>
          <button className="btn btn-primary" onClick={openAddModal}>
            <FaPlus /> Add Product
          </button>
        </div>

        <div className="search-bar">
          <form onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button type="submit">
              <FaSearch />
            </button>
          </form>
        </div>

        {loading ? (
          <Spinner />
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : products.length === 0 ? (
          <div className="no-products">
            <p>No products found.</p>
            <button className="btn btn-primary" onClick={openAddModal}>
              Add Your First Product
            </button>
          </div>
        ) : (
          <>
            <div className="products-table">
              <div className="table-header">
                <div className="header-image">Image</div>
                <div className="header-name">Name</div>
                <div className="header-price">Price</div>
                <div className="header-category">Category</div>
                <div className="header-stock">Stock</div>
                <div className="header-actions">Actions</div>
              </div>

              {products.map((product) => (
                <div className="table-row" key={product._id}>
                  <div className="cell-image">
                    <img
                      src={product.image}
                      alt={product.name}
                    />
                  </div>
                  <div className="cell-name">{product.name}</div>
                  <div className="cell-price">${product.price.toFixed(2)}</div>
                  <div className="cell-category">{product.category.name}</div>
                  <div className="cell-stock">{product.stock}</div>
                  <div className="cell-actions">
                    <button
                      className="btn btn-sm btn-edit"
                      onClick={() => openEditModal(product)}
                    >
                      <FaEdit />
                    </button>
                    <button
                      className="btn btn-sm btn-delete"
                      onClick={() => openDeleteConfirmation(product._id)}
                    >
                      <FaTrash />
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

        {/* Add/Edit Product Modal */}
        {showModal && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h2>{modalMode === 'add' ? 'Add New Product' : 'Edit Product'}</h2>
                <button className="close-btn" onClick={() => setShowModal(false)}>
                  &times;
                </button>
              </div>

              <div className="modal-body">
                {formError && (
                  <div className="form-error">
                    <FaExclamationCircle /> {formError}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label htmlFor="name">Product Name *</label>
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
                    <label htmlFor="description">Description *</label>
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      required
                    ></textarea>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="price">Price ($) *</label>
                      <input
                        type="number"
                        id="price"
                        name="price"
                        min="0"
                        step="0.01"
                        value={formData.price}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="stock">Stock *</label>
                      <input
                        type="number"
                        id="stock"
                        name="stock"
                        min="0"
                        value={formData.stock}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="category">Category *</label>
                    <select
                      id="category"
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      required
                    >
                      {categories.map((category) => (
                        <option key={category._id} value={category._id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="width">Width (inches)</label>
                      <input
                        type="number"
                        id="width"
                        name="dimensions.width"
                        min="0"
                        step="0.1"
                        value={formData.dimensions.width}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="height">Height (inches)</label>
                      <input
                        type="number"
                        id="height"
                        name="dimensions.height"
                        min="0"
                        step="0.1"
                        value={formData.dimensions.height}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="tags">Tags (comma separated)</label>
                    <input
                      type="text"
                      id="tags"
                      name="tags"
                      value={formData.tags}
                      onChange={handleChange}
                      placeholder="e.g. funny, cute, animals"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="image">
                      {modalMode === 'add' ? 'Product Image *' : 'Product Image (leave empty to keep current)'}
                    </label>
                    <input
                      type="file"
                      id="image"
                      name="image"
                      accept="image/*"
                      onChange={handleChange}
                      required={modalMode === 'add'}
                    />
                  </div>

                  <div className="form-group checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        name="featured"
                        checked={formData.featured}
                        onChange={handleChange}
                      />
                      Featured Product
                    </label>
                  </div>

                  <div className="modal-actions">
                    <button type="button" className="btn" onClick={() => setShowModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      {modalMode === 'add' ? 'Add Product' : 'Update Product'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmation.show && (
          <div className="modal-overlay">
            <div className="modal delete-modal">
              <div className="modal-header">
                <h2>Confirm Deletion</h2>
                <button className="close-btn" onClick={closeDeleteConfirmation}>
                  &times;
                </button>
              </div>

              <div className="modal-body">
                <p>Are you sure you want to delete this product? This action cannot be undone.</p>

                <div className="modal-actions">
                  <button className="btn" onClick={closeDeleteConfirmation}>
                    Cancel
                  </button>
                  <button className="btn btn-danger" onClick={handleDeleteProduct}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Products;
