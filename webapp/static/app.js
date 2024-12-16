// Global arrays for categories and products
let categories = [];
let products = [];
let productSortOrder = {
    name: "asc", // Default sort order for product name
    category: "asc" // Default sort order for product category
};

// A helper function to check if a string is alphanumeric
function isAlphanumeric(str) {
    return /^[a-zA-Z0-9]+$/.test(str);
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
                    <button class="add-row-btn" onclick="addCategory()">Add Category</button>
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
            throw new Error(`Failed to add category: ${response.statusText}`);
        }

        alert('Category added successfully');
        fetchCategories(); // Refresh the category list
    } catch (error) {
        console.error('Error adding category:', error);
    }
};

// Remove a category via API
const removeCategory = async (categoryName) => {
    try {
        const response = await fetch('/categories', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: categoryName })
        });

        if (!response.ok) {
            throw new Error(`Failed to remove category: ${response.statusText}`);
        }

        alert('Category removed successfully');
        fetchCategories(); // Refresh the category list
    } catch (error) {
        console.error('Error removing category:', error);
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
                    <th>Actions</th>
                </tr>
            </thead>
        `;
        const tableBody = document.createElement('tbody');

        products.forEach(product => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${product.name}</td>
                <td>${product.category}</td>
                <td>
                    <img src="${product.url}" alt="${product.name}" class="product-image">
                </td>
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
                <th colspan="4">Add Product</th>
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
                    <button class="add-row-btn" onclick="addProductFromForm()">Add Product</button>
                </td>
            </tr>
        </tbody>
    `;
    productsContainer.appendChild(addProductTable);
};

// Add a product from form inputs
const addProductFromForm = () => {
    const productName = document.getElementById('new-product-name').value.trim();
    const categoryName = document.getElementById('new-product-category').value;
    const productUrl = document.getElementById('new-product-url').value.trim();

    addProduct(productName, categoryName, productUrl);
};

// Add a new product via API
const addProduct = async (productName, categoryName, productUrl) => {
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

    try {
        const response = await fetch('/products', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: productName, category: categoryName, url: productUrl })
        });

        if (!response.ok) {
            throw new Error(`Failed to add product: ${response.statusText}`);
        }

        alert('Product added successfully');
        fetchProducts(); // Refresh the product list
    } catch (error) {
        console.error('Error adding product:', error);
    }
};

// Remove a product via API
const removeProduct = async (productName) => {
    try {
        const response = await fetch('/products', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: productName })
        });

        if (!response.ok) {
            throw new Error(`Failed to remove product: ${response.statusText}`);
        }

        alert('Product removed successfully');
        fetchProducts(); // Refresh the product list
    } catch (error) {
        console.error('Error removing product:', error);
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

