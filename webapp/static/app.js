//////////////////////////////////////
// Define a dynamic base path based on the current location
//////////////////////////////////////
const basePath = window.location.pathname.endsWith('/')
  ? window.location.pathname
  : window.location.pathname + '/';

//////////////////////////////////////
// Global arrays for categories and products
//////////////////////////////////////
let categories = [];
let products = [];
let productSortOrder = {
  name: "asc",     // Default sort order for product name
  category: "asc"  // Default sort order for product category
};

//////////////////////////////////////
// A helper function to check if a string is alphanumeric and can contain spaces
//////////////////////////////////////
function isAlphanumeric(str) {
  return /^[a-zA-Z0-9 ]+$/.test(str);
}

//////////////////////////////////////
// Show the selected tab
//////////////////////////////////////
function showTab(tab) {
  // Hide all tab containers
  document.getElementById('categories-container').style.display = 'none';
  document.getElementById('products-container').style.display = 'none';
  document.getElementById('backup-container').style.display = 'none';
  // NEW: Also hide the settings container
  const settingsContainer = document.getElementById('settings-container');
  if (settingsContainer) {
    settingsContainer.style.display = 'none';
  }

  // Always show the attribution (in case it got hidden by bad nesting)
  const attribution = document.querySelector('.attribution');
  if (attribution) {
    attribution.style.display = 'block';
  }

  if (tab === 'categories') {
    document.getElementById('categories-container').style.display = 'block';
    fetchCategories(); // Load categories when switching to this tab
  } else if (tab === 'products') {
    document.getElementById('products-container').style.display = 'block';
    fetchProducts(); // Load products when switching to this tab
  } else if (tab === 'backup') {
    document.getElementById('backup-container').style.display = 'block';
    // Optionally fetch backup status here if needed
  }
  // NEW: else if for 'settings'
  else if (tab === 'settings') {
    // Only show the settings container if it exists
    if (settingsContainer) {
      settingsContainer.style.display = 'block';
    }
    // Optionally fetch or refresh any settings
  }
}

//////////////////////////////////////
// Fetch categories from the backend
//////////////////////////////////////
const fetchCategories = async () => {
  try {
    const response = await fetch(`${basePath}categories`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch categories: ${response.statusText}`);
    }

    categories = await response.json();
    displayCategories(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
  }
};

//////////////////////////////////////
// Display categories in a table layout
//////////////////////////////////////
const displayCategories = (categories) => {
  const categoriesContainer = document.getElementById('categories-container');
  categoriesContainer.innerHTML = ''; // Clear existing content

  if (categories.length > 0) {
    const table = document.createElement('table');
    const tableHead = `
      <thead>
        <tr>
          <th onclick="sortCategories()">Category Name</th>
          <th>Actions</th>
        </tr>
      </thead>
    `;
    const tableBody = document.createElement('tbody');

    categories.forEach(category => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${category}</td>
        <td>
          <button class="edit-btn" onclick="openEditCategoryModal('${category}')">Edit</button>
          <button class="remove-btn" onclick="removeCategory('${category}')">Remove</button>
        </td>
      `;
      tableBody.appendChild(row);
    });

    table.innerHTML = tableHead;
    table.appendChild(tableBody);

    // Wrap table in a scrollable container
    const tableContainer = document.createElement('div');
    tableContainer.classList.add('table-container');
    tableContainer.appendChild(table);

    categoriesContainer.appendChild(tableContainer);
  } else {
    categoriesContainer.innerHTML = `
      <p style="text-align: center; font-weight: bold; color: red;">
        No categories available.
      </p>
    `;
  }

  // Add category form below the table
  const addCategoryTable = document.createElement('table');
  addCategoryTable.classList.add('add-category-table'); // Add a specific class to the table
  addCategoryTable.innerHTML = `
    <thead>
      <tr>
        <th colspan="2">Add Category</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          <input type="text" id="new-category-input" class="input-field" placeholder="New Category Name">
        </td>
        <td>
          <button class="add-row-btn green-btn" onclick="addCategory()">Add Category</button>
        </td>
      </tr>
    </tbody>
  `;

  // Wrap addCategoryTable in a uniquely identifiable container
  const addCategoryTableContainer = document.createElement('div');
  addCategoryTableContainer.classList.add('add-category-container'); // Add a specific class to the container
  addCategoryTableContainer.appendChild(addCategoryTable);

  categoriesContainer.appendChild(addCategoryTableContainer);
};

//////////////////////////////////////
// Add a new category via API
//////////////////////////////////////
const addCategory = async () => {
  const categoryName = document.getElementById('new-category-input').value.trim();
  if (!categoryName) {
    alert('Category name cannot be empty');
    return;
  }

  // Check if categoryName is alphanumeric
  if (!isAlphanumeric(categoryName)) {
    alert('Category name must be alphanumeric');
    return;
  }

  try {
    const response = await fetch(`${basePath}categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: categoryName })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Failed to add category: ${response.statusText}`);
    }

    alert('Category added successfully');
    fetchCategories(); // Refresh the category list

    // Clear the input field
    document.getElementById('new-category-input').value = '';
  } catch (error) {
    console.error('Error adding category:', error);
    alert(error.message);
  }
};

//////////////////////////////////////
// Remove a category via API
//////////////////////////////////////
const removeCategory = async (categoryName) => {
  if (!confirm(`Are you sure you want to remove the category "${categoryName}"? All associated products will be moved to "Uncategorized".`)) {
    return;
  }

  try {
    const response = await fetch(`${basePath}categories`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: categoryName })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Failed to remove category: ${response.statusText}`);
    }

    alert('Category removed successfully');
    fetchCategories(); // Refresh the category list
  } catch (error) {
    console.error('Error removing category:', error);
    alert(error.message);
  }
};

//////////////////////////////////////
// Open the edit category modal
//////////////////////////////////////
function openEditCategoryModal(categoryName) {
  // Populate the input with the current category name
  document.getElementById('edit-category-input').value = categoryName;
  document.getElementById('edit-category-old-name').value = categoryName; // Hidden input to keep track of old name

  // Show the modal
  document.getElementById('edit-category-modal').style.display = 'block';
}

//////////////////////////////////////
// Close the edit category modal
//////////////////////////////////////
function closeEditCategoryModal() {
  // Clear the form fields
  document.getElementById('edit-category-input').value = '';
  document.getElementById('edit-category-old-name').value = '';

  document.getElementById('edit-category-modal').style.display = 'none';
}

//////////////////////////////////////
// Save the edited category
//////////////////////////////////////
const saveEditedCategory = async () => {
  const newName = document.getElementById('edit-category-input').value.trim();
  const oldName = document.getElementById('edit-category-old-name').value.trim();

  if (!newName) {
    alert('New category name cannot be empty');
    return;
  }

  // Check if newName is alphanumeric
  if (!isAlphanumeric(newName)) {
    alert('Category name must be alphanumeric');
    return;
  }

  try {
    const response = await fetch(`${basePath}categories/${encodeURIComponent(oldName)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ new_name: newName })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || `Failed to edit category: ${response.statusText}`);
    }

    alert('Category updated successfully');
    closeEditCategoryModal();
    fetchCategories(); // Refresh the category list
  } catch (error) {
    console.error('Error editing category:', error);
    alert(error.message);
  }
};

//////////////////////////////////////
// Fetch products from the backend
//////////////////////////////////////
const fetchProducts = async () => {
  try {
    const response = await fetch(`${basePath}products`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.statusText}`);
    }

    products = await response.json();
    displayProducts(products);
  } catch (error) {
    console.error('Error fetching products:', error);
  }
};

//////////////////////////////////////
// Display products in a table
//////////////////////////////////////
const displayProducts = (products) => {
  const productsContainer = document.getElementById('products-container');
  productsContainer.innerHTML = ''; // Clear existing content

  if (products.length > 0) {
    const table = document.createElement('table');
    const tableHead = `
      <thead>
        <tr>
          <th class="sortable" onclick="sortProducts('name')">Product Name</th>
          <th class="sortable" onclick="sortProducts('category')">Category</th>
          <th>Image</th>
          <th>Barcode</th>
          <th>Actions</th>
        </tr>
      </thead>
    `;
    const tableBody = document.createElement('tbody');

    products.forEach(product => {
      const imageUrl = product.image_front_small_url ? product.image_front_small_url : product.url;
      const imageAlt = product.image_front_small_url ? `${product.name} Image` : `${product.name} Image (Manual)`;

      const barcodeLink = product.barcode
        ? `<a href="https://world.openfoodfacts.org/product/${product.barcode}" target="_blank" rel="noopener noreferrer">${product.barcode}</a>`
        : 'N/A';

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${product.name}</td>
        <td>${product.category}</td>
        <td>
          ${imageUrl ? `<img src="${imageUrl}" alt="${imageAlt}" class="product-image">` : 'No Image'}
        </td>
        <td>${barcodeLink}</td>
        <td>
          <button class="edit-btn" onclick="initEditProductModal('${encodeURIComponent(product.name)}')">Edit</button>
          <button class="remove-btn" onclick="removeProduct('${product.name}')">Remove</button>
        </td>
      `;
      tableBody.appendChild(row);
    });

    table.innerHTML = tableHead;
    table.appendChild(tableBody);

    // Wrap table in a scrollable container
    const tableContainer = document.createElement('div');
    tableContainer.classList.add('table-container');
    tableContainer.appendChild(table);

    productsContainer.appendChild(tableContainer);
  } else {
    productsContainer.innerHTML = `
      <p style="text-align: center; font-weight: bold; color: red;">
        No products available.
      </p>
    `;
  }

  // Add the large "Add Product" button
  const addProductButtonContainer = document.createElement('div');
  addProductButtonContainer.classList.add('add-product-button-container');

  const addProductButton = document.createElement('button');
  addProductButton.classList.add('add-product-btn');
  addProductButton.textContent = 'Add Product';
  addProductButton.onclick = () => {
    openAddProductModal();
  };

  addProductButtonContainer.appendChild(addProductButton);
  productsContainer.appendChild(addProductButtonContainer);
};

//////////////////////////////////////
// Initialize edit product modal with product data
//////////////////////////////////////
const initEditProductModal = async (encodedProductName) => {
  const productName = decodeURIComponent(encodedProductName);
  try {
    // Fetch products
    const productResponse = await fetch(`${basePath}products`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!productResponse.ok) {
      throw new Error(`Failed to fetch products: ${productResponse.statusText}`);
    }
    const allProducts = await productResponse.json();
    const product = allProducts.find(p => p.name === productName);

    if (!product) {
      alert('Product not found.');
      return;
    }

    // Fetch categories
    const categoryResponse = await fetch(`${basePath}categories`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!categoryResponse.ok) {
      throw new Error(`Failed to fetch categories: ${categoryResponse.statusText}`);
    }
    categories = await categoryResponse.json(); // Update the global categories array

    // Open modal with product and categories
    openEditProductModal(product);
  } catch (error) {
    console.error('Error initializing edit product modal:', error);
    alert('Failed to load product data.');
  }
};

//////////////////////////////////////
// Open the edit product modal
//////////////////////////////////////
function openEditProductModal(product) {
  // Populate the input fields with the current product details
  document.getElementById('edit-product-name').value = product.name;
  document.getElementById('edit-product-url').value = product.url;
  document.getElementById('edit-product-barcode').value = product.barcode || '';
  document.getElementById('edit-product-old-name').value = product.name; // Hidden input to keep track of old name

  // Populate the category dropdown
  const categoryDropdown = document.getElementById('edit-product-category');
  categoryDropdown.innerHTML = `<option value="">Select Category</option>`;
  categories.forEach(category => {
    const selected = category === product.category ? 'selected' : '';
    categoryDropdown.innerHTML += `<option value="${category}" ${selected}>${category}</option>`;
  });

  // Show the modal
  document.getElementById('edit-product-modal').style.display = 'block';
}

//////////////////////////////////////
// Close the edit product modal
//////////////////////////////////////
function closeEditProductModal() {
  // Clear the form fields
  document.getElementById('edit-product-name').value = '';
  document.getElementById('edit-product-url').value = '';
  document.getElementById('edit-product-barcode').value = '';
  document.getElementById('edit-product-old-name').value = '';

  document.getElementById('edit-product-modal').style.display = 'none';
}

//////////////////////////////////////
// Save the edited product
//////////////////////////////////////
const saveEditedProduct = async () => {
  const newName = document.getElementById('edit-product-name').value.trim();
  const newCategory = document.getElementById('edit-product-category').value;
  const newUrl = document.getElementById('edit-product-url').value.trim();
  const newBarcode = document.getElementById('edit-product-barcode').value.trim();
  const oldName = document.getElementById('edit-product-old-name').value.trim();

  if (!newName || !newCategory || !newUrl) {
    alert('Product name, category, and image URL are required');
    return;
  }

  // Check if newName and newCategory are alphanumeric
  if (!isAlphanumeric(newName)) {
    alert('Product name must be alphanumeric');
    return;
  }

  if (!isAlphanumeric(newCategory)) {
    alert('Category name must be alphanumeric');
    return;
  }

  // If barcode is provided, ensure it's numeric and of valid length (8-13 digits)
  if (newBarcode && !/^\d{8,13}$/.test(newBarcode)) {
    alert('Barcode must be numeric and between 8 to 13 digits');
    return;
  }

  try {
    const payload = {
      new_name: newName,
      category: newCategory,
      url: newUrl,
      barcode: newBarcode || null
    };

    const response = await fetch(`${basePath}products/${encodeURIComponent(oldName)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || `Failed to edit product: ${response.statusText}`);
    }

    alert('Product updated successfully');
    closeEditProductModal();
    fetchProducts(); // Refresh the product list
  } catch (error) {
    console.error('Error editing product:', error);
    alert(error.message);
  }
};

//////////////////////////////////////
// Define the addProductFromForm function
//////////////////////////////////////
const addProductFromForm = async () => {
  const name = document.getElementById('add-product-name').value.trim();
  const category = document.getElementById('add-product-category').value;
  const url = document.getElementById('add-product-url').value.trim();
  const barcode = document.getElementById('add-product-barcode').value.trim();

  if (!name || !category || !url) {
    alert('Product name, category, and image URL are required.');
    return;
  }

  if (!isAlphanumeric(name)) {
    alert('Product name must be alphanumeric.');
    return;
  }

  if (!isAlphanumeric(category)) {
    alert('Category name must be alphanumeric.');
    return;
  }

  if (barcode && !/^\d{8,13}$/.test(barcode)) {
    alert('Barcode must be numeric and between 8 to 13 digits.');
    return;
  }

  try {
    const payload = {
      name,
      category,
      url,
      barcode: barcode || null
    };

    const response = await fetch(`${basePath}products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Failed to add product: ${response.statusText}`);
    }

    alert('Product added successfully.');
    closeAddProductModal(); // Close the modal after adding
    fetchProducts(); // Refresh the product list
  } catch (error) {
    console.error('Error adding product:', error);
    alert(error.message);
  }
};

// Attach the function to the global scope
window.addProductFromForm = addProductFromForm;

//////////////////////////////////////
// Remove a product via API
//////////////////////////////////////
const removeProduct = async (productName) => {
  if (!confirm(`Are you sure you want to remove the product "${productName}"?`)) {
    return;
  }

  try {
    const response = await fetch(`${basePath}products`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: productName })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Failed to remove product: ${response.statusText}`);
    }

    alert('Product removed successfully');
    fetchProducts(); // Refresh the product list
  } catch (error) {
    console.error('Error removing product:', error);
    alert(error.message);
  }
};

//////////////////////////////////////
// Sort products by name or category
//////////////////////////////////////
const sortProducts = (field) => {
  const sortOrder = productSortOrder[field];
  products.sort((a, b) => {
    if (a[field] < b[field]) return sortOrder === 'asc' ? -1 : 1;
    if (a[field] > b[field]) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });
  productSortOrder[field] = sortOrder === 'asc' ? 'desc' : 'asc'; // Toggle sort order
  displayProducts(products);
};

//////////////////////////////////////
// Sort categories by name
//////////////////////////////////////
const sortCategories = () => {
  const sortOrder = productSortOrder.name;
  categories.sort((a, b) => {
    if (a < b) return sortOrder === 'asc' ? -1 : 1;
    if (a > b) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });
  productSortOrder.name = sortOrder === 'asc' ? 'desc' : 'asc'; // Toggle sort order
  displayCategories(categories);
};

//////////////////////////////////////
// Initialize the page
//////////////////////////////////////
document.addEventListener('DOMContentLoaded', async () => {
  // First, load the saved theme from the server
  await loadThemeFromServer();

  // Then, proceed with other initializations
  await fetchCategories();
  // Default tab: 'products'
  showTab('products');
});


//////////////////////////////////////
// Barcode Scanning Functionality
//////////////////////////////////////
function hideAddProductModal() {
  document.getElementById('add-product-modal').style.display = 'none';
}

// Open the barcode scanner modal
function openBarcodeModal() {
  // Hide the Add Product modal
  hideAddProductModal();

  // Show the barcode scanner modal
  const modal = document.getElementById('barcode-modal');
  modal.style.display = 'block';
  startBarcodeScanner();
}

// Close the barcode scanner modal
function closeBarcodeModal() {
  const modal = document.getElementById('barcode-modal');
  modal.style.display = 'none';
  stopBarcodeScanner();
}

// Start the barcode scanner using QuaggaJS
function startBarcodeScanner() {
  // Show loading spinner
  document.getElementById('loading-spinner').style.display = 'block';
  document.getElementById('barcode-scanner').style.display = 'none';

  Quagga.init({
    inputStream: {
      name: "Live",
      type: "LiveStream",
      target: document.querySelector('#barcode-scanner'),
      constraints: {
        width: 1280,
        height: 720,
        facingMode: "environment"
      },
    },
    decoder: {
      readers: ["ean_reader", "ean_8_reader", "code_128_reader"]
    },
  }, function(err) {
    if (err) {
      console.error('QuaggaJS initialization error:', err);
      alert('Error initializing barcode scanner. Please try again.');
      // Hide loading spinner
      document.getElementById('loading-spinner').style.display = 'none';
      document.getElementById('barcode-scanner').style.display = 'block';
      return;
    }
    console.log('QuaggaJS initialized successfully.');
    Quagga.start();
    // Hide loading spinner and show scanner
    document.getElementById('loading-spinner').style.display = 'none';
    document.getElementById('barcode-scanner').style.display = 'block';
  });

  Quagga.onDetected(onBarcodeDetected);
}

// Stop the barcode scanner
function stopBarcodeScanner() {
  Quagga.offDetected(onBarcodeDetected);
  Quagga.stop();
}

// Handle barcode detection
function onBarcodeDetected(result) {
  const code = result.codeResult.code;
  console.log('Barcode detected and processed : [' + code + ']');
  // Populate the barcode input field
  document.getElementById('add-product-barcode').value = code;
  // Close the barcode modal
  closeBarcodeModal();
  // Fetch product data from API
  fetchProductData(code);
}

// Fetch product data from API based on the scanned barcode
const fetchProductData = async (barcode) => {
  try {
    const response = await fetch(`${basePath}fetch_product?barcode=${barcode}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();

    if (response.ok && result.status === 'ok') {
      const product = result.product;
      // Pre-fill the form fields with fetched data
      document.getElementById('add-product-name').value = product.name || '';
      document.getElementById('add-product-category').value = product.category || '';
      document.getElementById('add-product-url').value = product.image_front_small_url || '';
      // Barcode is already filled

      // Reopen the Add Product modal with pre-filled data
      document.getElementById('add-product-modal').style.display = 'block';

      // Optionally, display a success message
      alert(`Product "${product.name}" fetched successfully!`);
    } else {
      alert('Product not found in OpenFoodFacts. Please enter details manually.');
      // Reopen the Add Product modal for manual entry
      document.getElementById('add-product-modal').style.display = 'block';
    }
  } catch (error) {
    console.error('Error fetching product data:', error);
    alert('Failed to fetch product data. Please enter details manually.');
    // Reopen the Add Product modal for manual entry
    document.getElementById('add-product-modal').style.display = 'block';
  }
};

//////////////////////////////////////
// Fetch product data based on manually entered barcode via the "Fetch" button
//////////////////////////////////////
const fetchBarcode = () => {
  const barcode = document.getElementById('add-product-barcode').value.trim();
  if (barcode) {
    fetchProductData(barcode);
  } else {
    alert('Please enter a barcode to fetch product data.');
  }
};

//////////////////////////////////////
// Open the Add Product Modal
//////////////////////////////////////
function openAddProductModal() {
  // Populate the category dropdown in the modal
  const categoryDropdown = document.getElementById('add-product-category');
  categoryDropdown.innerHTML = `<option value="">Select Category</option>`;
  categories.forEach(category => {
    categoryDropdown.innerHTML += `<option value="${category}">${category}</option>`;
  });

  // Show the modal
  document.getElementById('add-product-modal').style.display = 'block';
}

//////////////////////////////////////
// Close the Add Product Modal (clears the form)
//////////////////////////////////////
function closeAddProductModal() {
  // Clear the form fields
  document.getElementById('add-product-name').value = '';
  document.getElementById('add-product-category').value = '';
  document.getElementById('add-product-url').value = '';
  document.getElementById('add-product-barcode').value = '';

  document.getElementById('add-product-modal').style.display = 'none';
}

//////////////////////////////////////
// Ensure the modals close when clicking outside of them
//////////////////////////////////////
window.onclick = function(event) {
  const addProductModal = document.getElementById('add-product-modal');
  if (event.target === addProductModal) {
    closeAddProductModal();
  }

  const barcodeModal = document.getElementById('barcode-modal');
  if (event.target === barcodeModal) {
    closeBarcodeModal();
  }

  const editProductModal = document.getElementById('edit-product-modal');
  if (event.target === editProductModal) {
    closeEditProductModal();
  }

  const editCategoryModal = document.getElementById('edit-category-modal');
  if (event.target === editCategoryModal) {
    closeEditCategoryModal();
  }
};

//////////////////////////////////////
// ========== NEW: Backup Logic ==========
//////////////////////////////////////

// Trigger a backup download of the database
function triggerBackup() {
  // This calls your /download_db endpoint, which returns the .db file
  window.location.href = `${basePath}download_db`;
}

// Upload a database file to restore
async function uploadBackup() {
  const fileInput = document.getElementById('backupFileInput');
  if (!fileInput.files.length) {
    alert('Please choose a backup file first.');
    return;
  }

  const formData = new FormData();
  formData.append('file', fileInput.files[0]);

  try {
    const response = await fetch(`${basePath}upload_db`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Failed to upload database: ${response.statusText}`);
    }

    alert('Database uploaded successfully. The page may now reload.');
    // Optionally reload
    window.location.reload();
  } catch (error) {
    console.error('Error uploading database:', error);
    alert(error.message);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  // ... existing initialization code ...
  // For example:
  await fetchCategories();
  showTab('products');

  // ==========================
  // DELETE DATABASE LOGIC
  // ==========================

  const deleteBtn = document.getElementById('delete-database-btn');
  const overlay = document.getElementById('delete-modal-overlay');
  const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
  const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
  const deleteInput = document.getElementById('delete-input');

  // 1) Open modal when "Delete Database" is clicked
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      overlay.style.display = 'block';
    });
  }

  // 2) Cancel button to close modal
  if (cancelDeleteBtn) {
    cancelDeleteBtn.addEventListener('click', () => {
      overlay.style.display = 'none';
      deleteInput.value = '';
    });
  }

  // 3) Confirm delete action
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', async () => {
      // Must type DELETE in all caps
      if (deleteInput.value.trim().toUpperCase() === 'DELETE') {
        try {
          // Use the same basePath you use for all other requests
          const response = await fetch(`${basePath}delete_database`, {
            method: 'DELETE',
          });
          const data = await response.json();

          if (response.ok && data.status === 'ok') {
            alert('Database has been deleted.');
            overlay.style.display = 'none';
            deleteInput.value = '';

            // Optionally reload page or redirect
            // location.reload();

          } else {
            alert('Error deleting database: ' + data.message);
          }
        } catch (error) {
          console.error('Error deleting DB:', error);
          alert('An error occurred while deleting the database.');
        }
      } else {
        alert('You must type DELETE exactly to proceed.');
      }
    });
  }
});

//////////////////////////////////////
// Load Theme from Server
//////////////////////////////////////
async function loadThemeFromServer() {
  console.log("Loading theme from server...");
  try {
    // Fetch the current theme from the server endpoint (e.g., /theme)
    const response = await fetch(`${basePath}theme`, { method: 'GET' });
    
    if (!response.ok) {
      // If the server can't be reached or returns an error, fallback to light mode
      console.warn("Couldn't fetch theme; defaulting to light mode.");
      return;
    }

    const data = await response.json();
    const currentTheme = data.theme || 'light';

    // If the server-saved theme is 'dark', add dark-mode to <body>
    if (currentTheme === 'dark') {
      document.body.classList.add('dark-mode');
      
      // If you have a checkbox toggle, set it to checked
      const toggle = document.getElementById('themeToggle');
      if (toggle) toggle.checked = true;
      
      // If you have a label, rename it to "Light Mode"
      const label = document.getElementById('themeLabel');
      if (label) label.textContent = 'Light Mode';

    } else {
      // It's 'light', ensure dark mode is removed
      document.body.classList.remove('dark-mode');
      
      const toggle = document.getElementById('themeToggle');
      if (toggle) toggle.checked = false;
      
      const label = document.getElementById('themeLabel');
      if (label) label.textContent = 'Dark Mode';
    }

  } catch (err) {
    console.error('Error loading theme from server:', err);
  }
}

//////////////////////////////////////
// Toggle Theme (Light/Dark) & Save to Server
//////////////////////////////////////
async function toggleTheme() {
  const body = document.body;
  const label = document.getElementById("themeLabel");
  const toggle = document.getElementById("themeToggle");

  // Flip dark mode on/off
  body.classList.toggle('dark-mode');

  let newTheme = 'light';
  if (body.classList.contains('dark-mode')) {
    newTheme = 'dark';
    if (label) label.textContent = 'Light Mode';
  } else {
    if (label) label.textContent = 'Dark Mode';
  }

  // POST the updated theme to your server so it's saved in config.ini
  try {
    const response = await fetch(`${basePath}theme`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: newTheme })
    });

    if (!response.ok) {
      console.warn("Failed to save theme. Server responded with:", response.statusText);
    }
  } catch (error) {
    console.error('Error saving theme:', error);
  }
}


