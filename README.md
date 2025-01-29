
# <p align="center"> Pantry Tracker - HomeAssistant </p>

<p align="center">
  <img alt="Release" src="https://img.shields.io/github/v/release/mintcreg/pantry_tracker?&cacheBust=true"/>
  <img alt="Maintenance" src="https://img.shields.io/maintenance/yes/2025"/>

</p>

<p align="center">
<img src="https://raw.githubusercontent.com/mintcreg/pantry_tracker/refs/heads/dev/images/logo.webp" alt="Alt Text" width="400" height="400">
</p>

> [!CAUTION]
> This is a work in progress and made using GPT and basic knowledge.

# Description
The Pantry Tracker add-on is a Home Assistant designed to help you keep track of products in your kitchen, pantry, or any other storage space. With a user-friendly interface and a powerful backend, this add-on simplifies the organization and management of your items by allowing you to create categories, assign products to them, and maintain an up-to-date inventory.

The add-on operates using a Flask API server hosted locally. All product and category data is stored persistently in a .db file using JSON, ensuring your data is retained across reboots.


# **Features**

🖥️ Responsive User Interface

The add-on provides a sleek, easy-to-navigate interface that adapts to different screen sizes for seamless use on both desktop and mobile devices.

📦 Product Management

Add, update, or remove products from your inventory.
Automatically track counts for individual products.

🗂️ Category Management

Create, edit, or delete custom categories.
Assign products to specific categories for better organization.

🔄 Real-Time Updates

Sensors in Home Assistant are updated in real time to reflect changes made via the API or the interface.

💾 Backup & Restore

The ability to save a copy of the database and restore an existing database

# Installation
1: Add [https://github.com/mintcreg/pantry_tracker/](https://github.com/mintcreg/pantry_tracker/) to repositories to the addon store

[![Open your Home Assistant instance and show the add add-on repository dialog with a specific repository URL pre-filled.](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Fmintcreg%2Fpantry_tracker)

2: Install Addon from the addon store

> [!TIP]
> Visit the [Setup Guide](https://mintcreg.github.io/pantry_tracker/setup.html) for full installation instructions 


## Screenshots & Video

<details>
<summary>Products</summary>

<br>

![Categories](https://raw.githubusercontent.com/mintcreg/pantry_tracker/main/images/products.PNG)

</details>

<details>
<summary>Categories</summary>

<br>

![Categories](https://raw.githubusercontent.com/mintcreg/pantry_tracker/main/images/categories.PNG)

</details>


<details>
<summary>Demo</summary>

<br>

![Categories](https://raw.githubusercontent.com/mintcreg/pantry_tracker/main/images/demo.gif)

</details>


## API Endpoints

| **Endpoint**                | **Method** | **Description**                                                                                   | **Parameters**                                                                                                                                                                | **Response**                                                                                                                                                                                                                                                                  |
|-----------------------------|------------|---------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `/`                         | `GET`      | Root endpoint that serves the HTML UI with the current API key.                                   | **Headers:** `X-API-KEY` required                                                                                                                                             | **200:** Renders `index.html`.                                                                                                                                                                                                                                             |
| `/index.html`               | `GET`      | Route to render `index.html` with the current API key.                                           | **Headers:** `X-API-KEY` required                                                                                                                                             | **200:** Renders `index.html`.                                                                                                                                                                                                                                             |
| `/categories`               | `GET`      | Fetch all categories.                                                                            | **Headers:** `X-API-KEY` required                                                                                                                                             | **200:** List of category names. <br> *Example:* `["Fruits", "Vegetables"]` <br> **500:** Error message if fetch fails.                                                                                                                                                        |
| `/categories`               | `POST`     | Add a new category.                                                                              | **Headers:** `X-API-KEY` required <br> **Body:** `{"name": "CategoryName"}`                                                                                                 | **200:** Updated list of categories. <br> **400:** Validation errors or duplicate category. <br> **500:** Error message if addition fails.                                                                                                                                         |
| `/categories`               | `DELETE`   | Delete a category and reassign its products to "Uncategorized".                                  | **Headers:** `X-API-KEY` required <br> **Body:** `{"name": "CategoryName"}`                                                                                                 | **200:** Updated list of categories. <br> **400:** Validation errors. <br> **404:** Category not found. <br> **500:** Error message if deletion fails.                                                                                                                            |
| `/categories/<old_name>`    | `PUT`      | Edit an existing category's name.                                                                 | **Headers:** `X-API-KEY` required <br> **Path Parameter:** `<old_name>` <br> **Body:** `{"new_name": "New Category Name"}`                                               | **200:** Updated list of categories. <br> **400:** Validation errors or duplicate category. <br> **404:** Category not found. <br> **500:** Error message if editing fails.                                                                                                            |
| `/products`                 | `GET`      | Fetch all products along with their categories and URLs.                                         | **Headers:** `X-API-KEY` required                                                                                                                                             | **200:** List of products with their details. <br> *Example:* `[{"name": "Apple", "url": "image.jpg", "category": "Fruits"}]` <br> **500:** Error message if fetch fails.                                                                                                            |
| `/products`                 | `POST`     | Add a new product.                                                                               | **Headers:** `X-API-KEY` required <br> **Body:** `{"name": "ProductName", "url": "ProductImageURL", "category": "CategoryName", "barcode": "Barcode"}`                        | **200:** Updated list of products. <br> **400:** Validation errors or duplicate product/barcode. <br> **500:** Error message if addition fails.                                                                                                                                     |
| `/products`                 | `DELETE`   | Delete a product by name.                                                                        | **Headers:** `X-API-KEY` required <br> **Body:** `{"name": "ProductName"}`                                                                                                   | **200:** Updated list of products. <br> **400:** Validation errors. <br> **404:** Product not found. <br> **500:** Error message if deletion fails.                                                                                                                                     |
| `/products/<old_name>`      | `PUT`      | Edit an existing product's details.                                                               | **Headers:** `X-API-KEY` required <br> **Path Parameter:** `<old_name>` <br> **Body:** `{"new_name": "New Product Name", "category": "New Category Name", "url": "New Image URL", "barcode": "New Barcode"}` | **200:** Updated list of products. <br> **400:** Validation errors. <br> **404:** Product not found. <br> **500:** Error message if editing fails.                                                                                                                                |
| `/update_count`             | `POST`     | Update the count of a specific product by product name.                                          | **Headers:** `X-API-KEY` required <br> **Body:** `{"product_name": "ProductName", "action": "increase/decrease", "amount": 1}`                                                 | **200:** Updated count. <br> *Example:* `{"status": "ok", "count": 5}` <br> **400:** Validation errors. <br> **404:** Product not found. <br> **500:** Error message if update fails.                                                                                                  |
| `/counts`                   | `GET`      | Fetch the current count of all products.                                                           | **Headers:** `X-API-KEY` required                                                                                                                                             | **200:** Dictionary of product counts keyed by `entity_id`. <br> *Example:* `{"sensor.product_apple": 5}` <br> **500:** Error message if fetch fails.                                                                                                                           |
| `/health`                   | `GET`      | Health check endpoint to verify the service is running.                                          | **Headers:** None                                                                                                                                                              | **200:** Health status. <br> *Example:* `{"status": "healthy"}`                                                                                                                                                                                                           |
| `/backup`                   | `GET`      | Render the `backup.html` template for database backup and restore functionalities.                | **Headers:** `X-API-KEY` required                                                                                                                                             | **200:** Renders `backup.html`.                                                                                                                                                                                                                                          |
| `/download_db`              | `GET`      | Download the current database file as an attachment (`pantry_data.db`).                           | **Headers:** `X-API-KEY` required                                                                                                                                             | **200:** Sends the database file as an attachment. <br> **404:** Database file not found.                                                                                                                                                                                   |
| `/upload_db`                | `POST`     | Upload a database file to replace the existing database.                                         | **Headers:** `X-API-KEY` required <br> **Body:** File upload with key `file` (multipart/form-data).                                                                           | **200:** Redirects to base path after successful upload. <br> **400:** No file part or no file selected. <br> **500:** Failed to migrate, replace, or reinitialize the database.                                                                                                   |
| `/fetch_product`            | `GET`      | Fetch product data from OpenFoodFacts using the barcode.                                          | **Headers:** `X-API-KEY` required <br> **Query Parameter:** `barcode`                                                                                                         | **200:** `{"status": "ok", "product": {...}}` with product data. <br> **400:** Barcode is required. <br> **404:** Product not found or failed to fetch data.                                                                                                              |
| `/delete_database`          | `DELETE`   | Delete the database and reinitialize it, creating a backup beforehand.                           | **Headers:** `X-API-KEY` required                                                                                                                                             | **200:** `{"status": "ok", "message": "Database deleted and reinitialized."}` or `{"status": "ok", "message": "Database already deleted."}` <br> **429:** `{"status": "error", "message": "Delete operation is already in progress."}` <br> **500:** `{"status": "error", "message": "Failed to delete and reinitialize the database."}` |
| `/theme`                    | `GET`      | Return the current theme from `config.ini`.                                                        | **Headers:** `X-API-KEY` required                                                                                                                                             | **200:** `{"theme": "light"}` or `{"theme": "dark"}`. <br> **500:** Error message if retrieval fails.                                                                                                                                                                      |
| `/theme`                    | `POST`     | Save the selected theme (light/dark) to `config.ini`.                                            | **Headers:** `X-API-KEY` required <br> **Body:** `{"theme": "light/dark"}`                                                                                                   | **200:** `{"status": "ok", "theme": "light/dark"}`. <br> **400:** Invalid theme. <br> **500:** Error message if setting theme fails.                                                                                                                                        |
| `/get_api_key`              | `GET`      | Securely provide the API key to the frontend.                                                     | **Headers:** None (This endpoint is exempt from API key authentication.)                                                                                                       | **200:** `{"api_key": "the_api_key"}`. <br> **500:** Error message if retrieval fails.                                                                                                                                                                                       |
| `/regenerate_api_key` | `POST` | Regenerate the API key. **⚠️ Warning:** This route is sensitive and should be protected to prevent unauthorized access.                                                | **Required:** `X-API-KEY: your_current_api_key` | **200:** `{"status": "ok", "api_key": "new_api_key"}` <br> **401/403:** Unauthorized or Forbidden if `X-API-KEY` is missing or invalid. <br> **500:** Error message if regeneration fails.           |

                                                                                        


## Attribution

This project uses data and images provided by [OpenFoodFacts](https://world.openfoodfacts.org/).

![OpenFoodFacts Logo](https://static.openfoodfacts.org/images/logos/off-logo-horizontal-light.svg)

- Data and images are licensed under the [Open Database License (ODbL)](https://opendatacommons.org/licenses/odbl/1-0/) and the [Database Contents License (DbCL)](https://opendatacommons.org/licenses/dbcl/1-0/).
- You are encouraged to contribute to OpenFoodFacts by adding missing products and improving data accuracy.

Visit [OpenFoodFacts](https://world.openfoodfacts.org/) to learn more.


