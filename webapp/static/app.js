// Define a dynamic base path based on the current location
const basePath = window.location.pathname.endsWith('/') ? window.location.pathname : window.location.pathname + '/';

// Global arrays for categories and products
let categories = [];
let products = [];
let productSortOrder = {
    name: "asc", // Default sort order for product name
    category: "asc" // Default sort order for product category
};

// A helper function to check if a string is alphanumeric and can contain spaces
function isAlphanumeric(str) {
    return /^[a-zA-Z0-9 ]+$/.test(str);
}

// Show the selected tab
function showTab(tab) {
    // Hide all tabs
    document.getElementById('categories-container').style.display = 'none';
    document.getElementById('products-container').style.display = 'none';

    if (tab === 'categories') {
        document.getElementById('categories-container').style.display = 'block';
        fetchCategories(); // Load categories when switching to this tab
    } else if (tab === 'products') {
        document.getElementById('products-container').style.display = 'block';
        fetchProducts(); // Load products when switching to this tab
    }
}

// Fetch categories from the backend
const fetchCategories = async () => {
    try {
        const response = await fetch(`${basePath}categories`, { // Updated to use basePath
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

// Display categories in a table layout
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
        categoriesContainer.appendChild(table);
    } else {
        categoriesContainer.innerHTML = `
            <p style="text-align: center; font-weight: bold; color: red;">
                No categories available.
            </p>
        `;
    }

    // Add category form below the table
    const addCategoryTable = document.createElement('table');
    addCategoryTable.classList.add('add-category-table');
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
    categoriesContainer.appendChild(addCategoryTable);
};

// Add a new category via API
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
        const response = await fetch(`${basePath}categories`, { // Updated to use basePath
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

// Remove a category via API
const removeCategory = async (categoryName) => {
    if (!confirm(`Are you sure you want to remove the category "${categoryName}"? All associated products will be moved to "Uncategorized".`)) {
        return;
    }

    try {
        const response = await fetch(`${basePath}categories`, { // Updated to use basePath
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

// ==============================
// Edit Functionality for Categories
// ==============================

// Open the edit category modal
function openEditCategoryModal(categoryName) {
    // Populate the input with the current category name
    document.getElementById('edit-category-input').value = categoryName;
    document.getElementById('edit-category-old-name').value = categoryName; // Hidden input to keep track of old name

    // Show the modal
    document.getElementById('edit-category-modal').style.display = 'block';
}

// Close the edit category modal
function closeEditCategoryModal() {
    // Clear the form fields
    document.getElementById('edit-category-input').value = '';
    document.getElementById('edit-category-old-name').value = '';

    document.getElementById('edit-category-modal').style.display = 'none';
}

// Save the edited category
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
        const response = await fetch(`${basePath}categories/${encodeURIComponent(oldName)}`, { // Updated to use basePath
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

// ==============================
// Fetch products from the backend
// ==============================

const fetchProducts = async () => {
    try {
        const response = await fetch(`${basePath}products`, { // Updated to use basePath
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

// Display products in a table
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

            // **Updated Section: Move link to Barcode**
            // Instead of linking the product name, link the barcode
            const barcodeLink = product.barcode
                ? `<a href="https://world.openfoodfacts.org/product/${product.barcode}" target="_blank" rel="noopener noreferrer">${product.barcode}</a>`
                : 'N/A';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${product.name}</td> <!-- Product Name as plain text -->
                <td>${product.category}</td>
                <td>
                    ${imageUrl ? `<img src="${imageUrl}" alt="${imageAlt}" class="product-image">` : 'No Image'}
                </td>
                <td>${barcodeLink}</td> <!-- Barcode with link if available -->
                <td>
                    <button class="edit-btn" onclick="initEditProductModal('${encodeURIComponent(product.name)}')">Edit</button>
                    <button class="remove-btn" onclick="removeProduct('${product.name}')">Remove</button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        table.innerHTML = tableHead;
        table.appendChild(tableBody);
        productsContainer.appendChild(table);
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
    addProductButton.classList.add('add-product-btn'); // Define this class in CSS for styling
    addProductButton.textContent = 'Add Product';
    addProductButton.onclick = () => {
        // Open the add product modal
        openAddProductModal();
    };

    addProductButtonContainer.appendChild(addProductButton);
    productsContainer.appendChild(addProductButtonContainer);
};

// Initialize edit product modal with product data
const initEditProductModal = async (encodedProductName) => {
    const productName = decodeURIComponent(encodedProductName);
    try {
        // Fetch products
        const productResponse = await fetch(`${basePath}products`, { // Updated to use basePath
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
        const categoryResponse = await fetch(`${basePath}categories`, { // Updated to use basePath
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

// Open the edit product modal with product data
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

// Close the edit product modal
function closeEditProductModal() {
    // Clear the form fields
    document.getElementById('edit-product-name').value = '';
    document.getElementById('edit-product-url').value = '';
    document.getElementById('edit-product-barcode').value = '';
    document.getElementById('edit-product-old-name').value = '';

    document.getElementById('edit-product-modal').style.display = 'none';
}

// Save the edited product
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

    // If barcode is provided, ensure it's numeric and of valid length (e.g., 8-13 digits)
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

        const response = await fetch(`${basePath}products/${encodeURIComponent(oldName)}`, { // Updated to use basePath
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

// Define the addProductFromForm function
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

        const response = await fetch(`${basePath}products`, { // Updated to use basePath
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

// Remove a product via API
const removeProduct = async (productName) => {
    if (!confirm(`Are you sure you want to remove the product "${productName}"?`)) {
        return;
    }

    try {
        const response = await fetch(`${basePath}products`, { // Updated to use basePath
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

// Sort products by name or category
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

// Sort categories by name
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

// Initialize the page
document.addEventListener('DOMContentLoaded', async () => {
    await fetchCategories(); 
    showTab('products'); 
});

//////////////////////////////////////
// Barcode Scanning Functionality
//////////////////////////////////////

// Function to hide the Add Product Modal without clearing the form
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
            target: document.querySelector('#barcode-scanner'), // Or '#yourElement' (optional)
            constraints: {
                width: 1280, // Increased width for better resolution
                height: 720, // Increased height for better resolution
                facingMode: "environment" // or user for front camera
            },
        },
        decoder: {
            readers: ["ean_reader", "ean_8_reader", "code_128_reader"] // Specify the barcode types you want to support
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
        const response = await fetch(`${basePath}fetch_product?barcode=${barcode}`, { // Updated to use basePath
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

// ==============================
// Additional Functionality
// ==============================

// Fetch product data based on manually entered barcode via the "Fetch" button
const fetchBarcode = () => {
    const barcode = document.getElementById('add-product-barcode').value.trim();
    if (barcode) {
        fetchProductData(barcode);
    } else {
        alert('Please enter a barcode to fetch product data.');
    }
};

// Open the Add Product Modal
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

// Close the Add Product Modal (clears the form)
function closeAddProductModal() {
    // Clear the form fields
    document.getElementById('add-product-name').value = '';
    document.getElementById('add-product-category').value = '';
    document.getElementById('add-product-url').value = '';
    document.getElementById('add-product-barcode').value = '';

    document.getElementById('add-product-modal').style.display = 'none';
}

// Ensure the modals close when clicking outside of them
window.onclick = function(event) {
    const addProductModal = document.getElementById('add-product-modal');
    if (event.target == addProductModal) {
        closeAddProductModal();
    }

    const barcodeModal = document.getElementById('barcode-modal');
    if (event.target == barcodeModal) {
        closeBarcodeModal();
    }

    const editProductModal = document.getElementById('edit-product-modal');
    if (event.target == editProductModal) {
        closeEditProductModal();
    }

    const editCategoryModal = document.getElementById('edit-category-modal');
    if (event.target == editCategoryModal) {
        closeEditCategoryModal();
    }
};
