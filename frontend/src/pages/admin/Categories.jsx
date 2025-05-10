import { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaExclamationCircle } from 'react-icons/fa';
import axios from 'axios';
import Spinner from '../../components/ui/Spinner';

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [formError, setFormError] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    show: false,
    categoryId: null,
  });

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await axios.get('/api/categories');
        setCategories(response.data);
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching categories:', error);
        setError('Failed to load categories. Please try again.');
        setLoading(false);
      }
    };
    
    fetchCategories();
  }, []);

  // Open modal for adding a category
  const openAddModal = () => {
    setModalMode('add');
    setFormData({
      name: '',
      description: '',
    });
    setFormError('');
    setShowModal(true);
  };

  // Open modal for editing a category
  const openEditModal = (category) => {
    setModalMode('edit');
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
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
    if (!formData.name) {
      setFormError('Category name is required');
      return;
    }
    
    try {
      if (modalMode === 'add') {
        // Create new category
        await axios.post('/api/categories', formData);
      } else {
        // Update existing category
        await axios.put(`/api/categories/${selectedCategory._id}`, formData);
      }
      
      // Refresh category list
      const response = await axios.get('/api/categories');
      setCategories(response.data);
      
      setShowModal(false);
    } catch (error) {
      console.error('Error saving category:', error);
      setFormError(error.response?.data?.message || 'Failed to save category');
    }
  };

  // Open delete confirmation
  const openDeleteConfirmation = (categoryId) => {
    setDeleteConfirmation({
      show: true,
      categoryId,
    });
  };

  // Close delete confirmation
  const closeDeleteConfirmation = () => {
    setDeleteConfirmation({
      show: false,
      categoryId: null,
    });
  };

  // Handle category deletion
  const handleDeleteCategory = async () => {
    try {
      await axios.delete(`/api/categories/${deleteConfirmation.categoryId}`);
      
      // Refresh category list
      const response = await axios.get('/api/categories');
      setCategories(response.data);
      
      closeDeleteConfirmation();
    } catch (error) {
      console.error('Error deleting category:', error);
      setError('Failed to delete category. Please try again.');
      closeDeleteConfirmation();
    }
  };

  return (
    <div className="admin-categories-page">
      <div className="container">
        <div className="page-header">
          <h1>Manage Categories</h1>
          <button className="btn btn-primary" onClick={openAddModal}>
            <FaPlus /> Add Category
          </button>
        </div>
        
        {loading ? (
          <Spinner />
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : categories.length === 0 ? (
          <div className="no-categories">
            <p>No categories found.</p>
            <button className="btn btn-primary" onClick={openAddModal}>
              Add Your First Category
            </button>
          </div>
        ) : (
          <div className="categories-table">
            <div className="table-header">
              <div className="header-name">Name</div>
              <div className="header-slug">Slug</div>
              <div className="header-description">Description</div>
              <div className="header-actions">Actions</div>
            </div>
            
            {categories.map((category) => (
              <div className="table-row" key={category._id}>
                <div className="cell-name">{category.name}</div>
                <div className="cell-slug">{category.slug}</div>
                <div className="cell-description">{category.description || '-'}</div>
                <div className="cell-actions">
                  <button
                    className="btn btn-sm btn-edit"
                    onClick={() => openEditModal(category)}
                  >
                    <FaEdit />
                  </button>
                  <button
                    className="btn btn-sm btn-delete"
                    onClick={() => openDeleteConfirmation(category._id)}
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Add/Edit Category Modal */}
        {showModal && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h2>{modalMode === 'add' ? 'Add New Category' : 'Edit Category'}</h2>
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
                    <label htmlFor="name">Category Name *</label>
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
                    <label htmlFor="description">Description</label>
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                    ></textarea>
                  </div>
                  
                  <div className="modal-actions">
                    <button type="button" className="btn" onClick={() => setShowModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      {modalMode === 'add' ? 'Add Category' : 'Update Category'}
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
                <p>
                  Are you sure you want to delete this category? This will also affect all products in this category.
                  This action cannot be undone.
                </p>
                
                <div className="modal-actions">
                  <button className="btn" onClick={closeDeleteConfirmation}>
                    Cancel
                  </button>
                  <button className="btn btn-danger" onClick={handleDeleteCategory}>
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

export default Categories;
