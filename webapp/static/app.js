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
        const response = await fetch('/categories', {
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
        const response = await fetch('/categories', {
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
        const response = await fetch('/categories', {
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

// Fetch products from the backend
const fetchProducts = async () => {
    try {
        const response = await fetch('/products', {
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

            // Conditional link to OpenFoodFacts if barcode exists
            const productLink = product.barcode
                ? `<a href="https://world.openfoodfacts.org/product/${product.barcode}" target="_blank" rel="noopener noreferrer">${product.name}</a>`
                : product.name;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${productLink}</td>
                <td>${product.category}</td>
                <td>
                    ${imageUrl ? `<img src="${imageUrl}" alt="${imageAlt}" class="product-image">` : 'No Image'}
                </td>
                <td>${product.barcode ? product.barcode : 'N/A'}</td>
                <td>
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

    // Add product form below the table
    const addProductTable = document.createElement('table');
    addProductTable.classList.add('add-product-table');
    addProductTable.innerHTML = `
        <thead>
            <tr>
                <th colspan="5">Add Product</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>
                    <input type="text" id="new-product-name" class="input-field" placeholder="Product Name">
                </td>
                <td>
                    <select id="new-product-category" class="input-field">
                        <option value="">Select Category</option>
                        ${categories.map(category => `<option value="${category}">${category}</option>`).join('')}
                    </select>
                </td>
                <td>
                    <input type="text" id="new-product-url" class="input-field" placeholder="Image URL">
                </td>
                <td>
                    <input type="text" id="new-product-barcode" class="input-field" placeholder="Barcode (Optional)">
                    <button onclick="fetchBarcode()" class="fetch-barcode-btn">Fetch</button>
                    <!-- Scan Barcode Button -->
                    <button onclick="openBarcodeModal()" class="fetch-barcode-btn">Scan Barcode</button>
                </td>
                <td>
                    <button class="add-row-btn green-btn" onclick="addProductFromForm()">Add Product</button>
                </td>
            </tr>
        </tbody>
    `;
    productsContainer.appendChild(addProductTable);
};

// Add a product from form inputs
const addProductFromForm = async () => {
    const productName = document.getElementById('new-product-name').value.trim();
    const categoryName = document.getElementById('new-product-category').value;
    const productUrl = document.getElementById('new-product-url').value.trim();
    const productBarcode = document.getElementById('new-product-barcode').value.trim();

    addProduct(productName, categoryName, productUrl, productBarcode);
};

// Add a new product via API
const addProduct = async (productName, categoryName, productUrl, productBarcode) => {
    if (!productName || !categoryName || !productUrl) {
        alert('Product name, category, and image URL are required');
        return;
    }

    // Check if productName and categoryName are alphanumeric
    if (!isAlphanumeric(productName)) {
        alert('Product name must be alphanumeric');
        return;
    }

    if (!isAlphanumeric(categoryName)) {
        alert('Category name must be alphanumeric');
        return;
    }

    // If barcode is provided, ensure it's numeric and of valid length (e.g., 8-13 digits)
    if (productBarcode && !/^\d{8,13}$/.test(productBarcode)) {
        alert('Barcode must be numeric and between 8 to 13 digits');
        return;
    }

    try {
        const response = await fetch('/products', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: productName,
                category: categoryName,
                url: productUrl,
                barcode: productBarcode || null
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || `Failed to add product: ${response.statusText}`);
        }

        alert('Product added successfully');
        fetchProducts(); // Refresh the product list
    } catch (error) {
        console.error('Error adding product:', error);
        alert(error.message);
    }
};

// Remove a product via API
const removeProduct = async (productName) => {
    if (!confirm(`Are you sure you want to remove the product "${productName}"?`)) {
        return;
    }

    try {
        const response = await fetch('/products', {
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

// Open the barcode scanner modal
function openBarcodeModal() {
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
    document.getElementById('new-product-barcode').value = code;
    // Optionally, close the modal automatically after detection
    closeBarcodeModal();
    // Fetch product data from OpenFoodFacts
    fetchProductData(code);
}

// Fetch product data from OpenFoodFacts based on the scanned barcode
const fetchProductData = async (barcode) => {
    try {
        const response = await fetch(`/fetch_product?barcode=${barcode}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        if (response.ok && result.status === 'ok') {
            const product = result.product;
            // Pre-fill the form fields with fetched data
            document.getElementById('new-product-name').value = product.name || '';
            document.getElementById('new-product-category').value = product.category || '';
            document.getElementById('new-product-url').value = product.image_front_small_url || '';
            // Barcode is already filled
            // Optionally, display a success message
            alert(`Product "${product.name}" fetched successfully!`);
        } else {
            alert('Product not found in OpenFoodFacts. Please enter details manually.');
        }
    } catch (error) {
        console.error('Error fetching product data:', error);
        alert('Failed to fetch product data. Please enter details manually.');
    }
};

// ==============================
// Additional Functionality
// ==============================

// Fetch product data based on manually entered barcode via the "Fetch" button
const fetchBarcode = () => {
    const barcode = document.getElementById('new-product-barcode').value.trim();
    if (barcode) {
        fetchProductData(barcode);
    } else {
        alert('Please enter a barcode to fetch product data.');
    }
};
