# pantry_tracker/webapp/app.py

from flask import Flask, request, jsonify, render_template, send_file, redirect, url_for
import os
import logging
import configparser
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from models import Base, Category, Product, Count
from schemas import CategorySchema, UpdateCategorySchema, ProductSchema, UpdateProductSchema
from marshmallow import ValidationError
import requests  # For interacting with OpenFoodFacts
from migrate import migrate_database
from werkzeug.middleware.proxy_fix import ProxyFix
from functools import wraps
import secrets 
from filelock import FileLock, Timeout
import shutil
import datetime

app = Flask(__name__)

# Apply ProxyFix middleware to handle Ingress headers correctly
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_port=1, x_prefix=1)

# Configure logging
logging.basicConfig(level=logging.DEBUG)  # Set to DEBUG for detailed logs
logger = logging.getLogger(__name__)

CONFIG_FILE = "/config/pantry_data/config.ini"
config = configparser.ConfigParser()

# Function to generate a secure API key
def generate_api_key(length=32):
    api_key = secrets.token_urlsafe(length)
    logger.debug("Generated new API key.")
    return api_key

# Initialize config
def initialize_config():
    try:
        logger.debug(f"Checking existence of config file at: {CONFIG_FILE}")
        if not os.path.exists(CONFIG_FILE):
            logger.debug("Config file does not exist. Creating a new one with default settings and API key.")
            config['Settings'] = {
                'theme': 'light',
                'api_key': generate_api_key()
            }
            os.makedirs(os.path.dirname(CONFIG_FILE), exist_ok=True)  # Ensure directory exists
            with open(CONFIG_FILE, 'w') as f:
                config.write(f)
            logger.info("Created config.ini with a new API key.")
        else:
            # Read the existing config file
            config.read(CONFIG_FILE)
            logger.debug("Config file found. Reading existing settings.")

            # Ensure 'Settings' section exists
            if 'Settings' not in config:
                logger.debug("'Settings' section missing. Adding with default theme and API key.")
                config['Settings'] = {
                    'theme': 'light',
                    'api_key': generate_api_key()
                }
                with open(CONFIG_FILE, 'w') as f:
                    config.write(f)
                logger.info("Added 'Settings' section with a new API key.")
            else:
                # Ensure 'theme' key exists
                if 'theme' not in config['Settings']:
                    logger.debug("'theme' key missing. Setting default to 'light'.")
                    config['Settings']['theme'] = 'light'

                # Check if 'api_key' exists and is non-empty
                api_key_exists = config.has_option('Settings', 'api_key')
                api_key_value = config.get('Settings', 'api_key') if api_key_exists else ''

                if not api_key_exists or not api_key_value.strip():
                    logger.debug("'api_key' missing or empty. Generating a new API key.")
                    config['Settings']['api_key'] = generate_api_key()
                    logger.info("Generated a new API key and added it to config.ini.")
                else:
                    logger.debug("'api_key' already exists and is valid.")

                # Write any missing defaults or new API key back to file
                with open(CONFIG_FILE, 'w') as f:
                    config.write(f)
                logger.debug("Written updated settings to config.ini.")
    except Exception as e:
        logger.exception(f"Failed to initialize configuration: {e}")
        raise  # Re-raise exception after logging

initialize_config()

# Define the path to the database within the container
DB_FILE = "/config/pantry_data/pantry_data.db"

# Ensure the pantry_data directory exists
DB_DIR = os.path.dirname(DB_FILE)
os.makedirs(DB_DIR, exist_ok=True)

# If needed, ensure the database schema is valid
# migrate_database(DB_FILE)  # (commented if no migrations needed)

# Initialize the database
try:
    logger.debug(f"Initializing database at: sqlite:///{DB_FILE}")
    engine = create_engine(f'sqlite:///{DB_FILE}', connect_args={'check_same_thread': False}, echo=False)
    Base.metadata.create_all(engine)
    logger.info("Database initialized successfully.")
except Exception as e:
    logger.exception(f"Failed to initialize the database: {e}")
    raise

# Create a configured "Session" class
SessionFactory = sessionmaker(bind=engine)
# Create a scoped session
Session = scoped_session(SessionFactory)

def sanitize_entity_id(name: str) -> str:
    """Sanitize the product name to create a unique entity ID without category."""
    return f"sensor.product_{name.lower().replace(' ', '_').replace('-', '_')}"

# -----------------------------
# Global API Key Authentication
# -----------------------------

@app.before_request
def before_request_func():
    """
    Enforce API key authentication for external requests.
    Skip authentication for requests coming through Home Assistant's Ingress and exempted routes.
    """
    try:
        # Exempted routes that do not require API key
        exempt_paths = ['/health']

        # If the request path is exempted, skip authentication
        if request.path in exempt_paths:
            logger.debug(f"Exempt path accessed: {request.path}. Skipping API key authentication.")
            return  # Proceed to the requested route

        # Detect if the request is coming via Ingress by checking for 'X-Ingress-Path' header
        if 'X-Ingress-Path' in request.headers:
            logger.debug("Request via Ingress detected. Skipping API key authentication.")
            return  # Proceed to the requested route

        # Retrieve the API key from config
        api_key = config['Settings'].get('api_key')
        if not api_key:
            logger.error("API key not found in config.ini.")
            return jsonify({"status": "error", "message": "Server configuration error."}), 500

        # Retrieve the API key from request headers or query parameters
        request_api_key = request.headers.get('X-API-KEY') or request.args.get('api_key')

        if not request_api_key:
            logger.warning("API key missing in request.")
            return jsonify({"status": "error", "message": "API key is missing."}), 401

        if request_api_key != api_key:
            logger.warning("Invalid API key attempt: %s", request_api_key)
            return jsonify({"status": "error", "message": "Invalid API key."}), 403

        logger.debug("API key authentication successful for request.")
    except Exception as e:
        logger.exception(f"Error during API key authentication: {e}")
        return jsonify({"status": "error", "message": "Authentication failed."}), 500

# -----------------------------
# Routes
# -----------------------------

@app.route("/")
def index():
    """Root endpoint to render the HTML UI with the current API key."""
    api_key = config['Settings'].get('api_key', '')
    logger.debug("Rendering index.html with API key")
    return render_template("index.html", api_key=api_key)

@app.route("/index.html")
def index_html():
    """Route to render index.html with the current API key."""
    api_key = config['Settings'].get('api_key', '')
    logger.debug("Rendering index.html via /index.html with API key")
    return render_template("index.html", api_key=api_key)

# -----------------------------
# Categories
# -----------------------------
@app.route("/categories", methods=["GET", "POST", "DELETE"])
def categories_route():
    session = Session()
    if request.method == "GET":
        try:
            categories = session.query(Category).all()
            category_names = [cat.name for cat in categories]
            logger.info("Fetched categories: %s", category_names)
            return jsonify(category_names)
        except Exception as e:
            logger.error("Error fetching categories: %s", e)
            return jsonify({"status": "error", "message": "Failed to fetch categories"}), 500
        finally:
            Session.remove()

    if request.method == "POST":
        try:
            data = CategorySchema().load(request.get_json())
        except ValidationError as err:
            logger.warning("Validation error on adding category: %s", err.messages)
            return jsonify({"status": "error", "errors": err.messages}), 400

        cat_name = data.get("name")
        try:
            existing_cat = session.query(Category).filter_by(name=cat_name).first()
            if existing_cat:
                logger.warning("Duplicate category attempted: %s", cat_name)
                return jsonify({"status": "error", "message": "Duplicate category"}), 400

            new_category = Category(name=cat_name)
            session.add(new_category)
            session.commit()
            logger.info(f"Added new category: {cat_name}")

            category_names = [cat.name for cat in session.query(Category).all()]
            return jsonify({"status": "ok", "categories": category_names})
        except Exception as e:
            session.rollback()
            logger.error(f"Error adding category '{cat_name}': {e}")
            return jsonify({"status": "error", "message": "Failed to add category"}), 500
        finally:
            Session.remove()

    if request.method == "DELETE":
        data = request.get_json()
        category_name = data.get("name")
        if not category_name:
            logger.warning("Category name missing in delete request")
            return jsonify({"status": "error", "message": "Category name is required for deletion"}), 400

        try:
            category = session.query(Category).filter_by(name=category_name).first()
            if not category:
                logger.warning("Attempted to delete non-existent category: %s", category_name)
                return jsonify({"status": "error", "message": "Category not found"}), 404

            # Define the default category name
            default_category_name = "Uncategorized"
            default_category = session.query(Category).filter_by(name=default_category_name).first()

            # If default category doesn't exist, create it
            if not default_category:
                default_category = Category(name=default_category_name)
                session.add(default_category)
                session.commit()
                logger.info(f"Created default category: {default_category_name}")

            # Reassign all products under the target category to the default category
            associated_products = session.query(Product).filter_by(category_id=category.id).all()
            for product in associated_products:
                product.category = default_category
                logger.info(f"Reassigned product '{product.name}' to category '{default_category_name}'")

            session.commit()

            # Proceed to delete the original category
            session.delete(category)
            session.commit()
            logger.info(f"Deleted category: {category_name}")

            category_names = [cat.name for cat in session.query(Category).all()]
            return jsonify({"status": "ok", "categories": category_names})
        except Exception as e:
            session.rollback()
            logger.error(f"Error deleting category '{category_name}': {e}")
            return jsonify({"status": "error", "message": "Failed to delete category"}), 500
        finally:
            Session.remove()

# -----------------------------
# Edit Category
# -----------------------------
@app.route("/categories/<old_name>", methods=["PUT"])
def edit_category(old_name):
    """
    Edit an existing category's name.
    Payload: {"new_name": "New Category Name"}
    """
    session = Session()
    try:
        data = UpdateCategorySchema().load(request.get_json())
        new_name = data.get("new_name")

        # Check if new_name already exists
        existing_cat = session.query(Category).filter_by(name=new_name).first()
        if existing_cat:
            logger.warning("Attempted to rename to an existing category: %s", new_name)
            return jsonify({"status": "error", "message": "Category with the new name already exists"}), 400

        # Fetch the category to be edited
        category = session.query(Category).filter_by(name=old_name).first()
        if not category:
            logger.warning("Category '%s' not found for editing", old_name)
            return jsonify({"status": "error", "message": "Category not found"}), 404

        # Update the category name
        category.name = new_name
        session.commit()
        logger.info(f"Category renamed from '{old_name}' to '{new_name}'")

        # Return updated list of categories
        category_names = [cat.name for cat in session.query(Category).all()]
        return jsonify({"status": "ok", "categories": category_names})

    except ValidationError as err:
        logger.warning("Validation error on editing category: %s", err.messages)
        return jsonify({"status": "error", "errors": err.messages}), 400

    except Exception as e:
        session.rollback()
        logger.error(f"Error editing category '{old_name}': {e}")
        return jsonify({"status": "error", "message": "Failed to edit category"}), 500

    finally:
        Session.remove()

# -----------------------------
# Edit Product
# -----------------------------
@app.route("/products/<old_name>", methods=["PUT"])
def edit_product(old_name):
    """
    Edit an existing product's details.
    Payload can include any fields:
    {
      "new_name": "New Product Name",
      "category": "New Category Name",
      "url": "New Image URL",
      "barcode": "New Barcode"
    }
    """
    session = Session()
    try:
        data = UpdateProductSchema().load(request.get_json())

        # Extract fields
        new_name = data.get("new_name")
        category_name = data.get("category")
        url = data.get("url")
        barcode = data.get("barcode")

        # Fetch the product to be edited
        product = session.query(Product).filter_by(name=old_name).first()
        if not product:
            logger.warning("Product '%s' not found for editing", old_name)
            return jsonify({"status": "error", "message": "Product not found"}), 404

        # Update product name if provided
        if new_name:
            new_name = new_name.strip()
            if not new_name:
                logger.warning("Invalid new product name provided")
                return jsonify({"status": "error", "message": "Invalid new product name"}), 400

            # Check if new_name already exists
            existing_product = session.query(Product).filter_by(name=new_name).first()
            if existing_product and existing_product.id != product.id:
                logger.warning("Attempted to rename to an existing product: %s", new_name)
                return jsonify({"status": "error", "message": "Product with the new name already exists"}), 400

            product.name = new_name
            logger.info(f"Product name updated from '{old_name}' to '{new_name}'")

        # Update category if provided
        if category_name:
            category_name = category_name.strip()
            if not category_name:
                logger.warning("Invalid category name provided for product edit")
                return jsonify({"status": "error", "message": "Invalid category name"}), 400

            found_category = session.query(Category).filter_by(name=category_name).first()
            if not found_category:
                logger.warning("Category '%s' not found for product edit", category_name)
                return jsonify({"status": "error", "message": "Category does not exist"}), 400

            product.category = found_category
            logger.info(f"Product '{product.name}' category updated to '{category_name}'")

        # Update URL if provided
        if url:
            url = url.strip()
            if not url:
                logger.warning("Invalid URL provided for product edit")
                return jsonify({"status": "error", "message": "Invalid URL"}), 400
            product.url = url
            logger.info(f"Product '{product.name}' URL updated to '{url}'")

        # Update barcode if provided (including possibility of null)
        if barcode is not None:
            if barcode:
                barcode = barcode.strip()
                if not barcode.isdigit() or not (8 <= len(barcode) <= 13):
                    logger.warning("Invalid barcode: '%s'", barcode)
                    return jsonify({"status": "error", "message": "Barcode must be numeric and 8-13 digits"}), 400

                # Check if barcode already exists
                existing_barcode = session.query(Product).filter_by(barcode=barcode).first()
                if existing_barcode and existing_barcode.id != product.id:
                    logger.warning("Attempted to set duplicate barcode: %s", barcode)
                    return jsonify({"status": "error", "message": "Barcode already exists"}), 400

                product.barcode = barcode
                logger.info(f"Product '{product.name}' barcode updated to '{barcode}'")
            else:
                # If barcode is empty, remove it
                product.barcode = None
                logger.info(f"Product '{product.name}' barcode removed")

        session.commit()
        logger.info(f"Product '{old_name}' edited successfully")

        # Return updated list of products
        products = session.query(Product).all()
        product_list = [
            {"name": prod.name, "url": prod.url, "category": prod.category.name, "barcode": prod.barcode}
            for prod in products
        ]
        return jsonify({"status": "ok", "products": product_list})

    except ValidationError as err:
        logger.warning("Validation error on editing product: %s", err.messages)
        return jsonify({"status": "error", "errors": err.messages}), 400

    except Exception as e:
        session.rollback()
        logger.error(f"Error editing product '{old_name}': {e}")
        return jsonify({"status": "error", "message": "Failed to edit product"}), 500

    finally:
        Session.remove()

# -----------------------------
# Products
# -----------------------------
@app.route("/products", methods=["GET", "POST", "DELETE"])
def products_route():
    session = Session()
    if request.method == "GET":
        try:
            products = session.query(Product).all()
            product_list = [
                {"name": prod.name, "url": prod.url, "category": prod.category.name, "barcode": prod.barcode}
                for prod in products
            ]
            logger.info("Fetched products: %s", product_list)
            return jsonify(product_list)
        except Exception as e:
            logger.error("Error fetching products: %s", e)
            return jsonify({"status": "error", "message": "Failed to fetch products"}), 500
        finally:
            Session.remove()

    elif request.method == "POST":
        try:
            data = ProductSchema().load(request.get_json())
        except ValidationError as err:
            logger.warning("Validation error on adding product: %s", err.messages)
            return jsonify({"status": "error", "errors": err.messages}), 400

        name = data.get("name")
        url = data.get("url")
        category_name = data.get("category")
        barcode = data.get("barcode")

        try:
            # Check if category exists
            found_category = session.query(Category).filter_by(name=category_name).first()
            if not found_category:
                logger.warning("Category not found: %s", category_name)
                return jsonify({"status": "error", "message": "Category does not exist"}), 400

            # Check for duplicate product
            existing_product = session.query(Product).filter_by(name=name).first()
            if existing_product:
                logger.warning("Duplicate product attempted: %s", name)
                return jsonify({"status": "error", "message": "Duplicate product"}), 400

            # If barcode is provided, ensure it's unique
            if barcode:
                existing_barcode = session.query(Product).filter_by(barcode=barcode).first()
                if existing_barcode:
                    logger.warning("Duplicate barcode attempted: %s", barcode)
                    return jsonify({"status": "error", "message": "Barcode already exists"}), 400

            new_product = Product(name=name, url=url, category=found_category, barcode=barcode)
            session.add(new_product)

            # Initialize count to 0
            new_count = Count(product=new_product, count=0)
            session.add(new_count)

            session.commit()
            logger.info(f"Added new product: {name}")

            products = session.query(Product).all()
            product_list = [
                {"name": prod.name, "url": prod.url, "category": prod.category.name, "barcode": prod.barcode}
                for prod in products
            ]
            return jsonify({"status": "ok", "products": product_list})
        except Exception as e:
            session.rollback()
            logger.error("Error adding product '%s': %s", name, e)
            return jsonify({"status": "error", "message": "Failed to add product"}), 500
        finally:
            Session.remove()

    elif request.method == "DELETE":
        data = request.get_json()
        product_name = data.get("name")
        if not product_name:
            logger.warning("Product name missing in delete request")
            return jsonify({"status": "error", "message": "Product name is required for deletion"}), 400

        try:
            product = session.query(Product).filter_by(name=product_name).first()
            if not product:
                logger.warning("Attempted to delete non-existent product: %s", product_name)
                return jsonify({"status": "error", "message": "Product not found"}), 404

            session.delete(product)
            session.commit()
            logger.info(f"Deleted product: {product_name}")

            products = session.query(Product).all()
            product_list = [
                {"name": prod.name, "url": prod.url, "category": prod.category.name, "barcode": prod.barcode}
                for prod in products
            ]
            return jsonify({"status": "ok", "products": product_list})
        except Exception as e:
            session.rollback()
            logger.error("Error deleting product '%s': %s", product_name, e)
            return jsonify({"status": "error", "message": "Failed to delete product"}), 500
        finally:
            Session.remove()

# -----------------------------
# Update Count
# -----------------------------
@app.route("/update_count", methods=["POST"])
def update_count():
    session = Session()
    data = request.get_json()
    product_name = data.get("product_name")
    action = data.get("action")
    amount = data.get("amount", 1)

    if not all([product_name, action]):
        logger.warning("Missing required parameters in update_count")
        return jsonify({"status": "error", "message": "Missing required parameters"}), 400

    try:
        product = session.query(Product).filter_by(name=product_name).first()
        if not product:
            logger.warning("Product '%s' not found in update_count", product_name)
            return jsonify({"status": "error", "message": "Product not found"}), 404

        count_entry = session.query(Count).filter_by(product_id=product.id).first()
        if not count_entry:
            # Initialize count if it doesn't exist
            count_entry = Count(product=product, count=0)
            session.add(count_entry)

        if action == "increase":
            count_entry.count += amount
        elif action == "decrease":
            count_entry.count = max(count_entry.count - amount, 0)
        else:
            logger.warning("Invalid action '%s' in update_count", action)
            return jsonify({"status": "error", "message": "Invalid action"}), 400

        session.commit()
        logger.info("Updated count for %s: %s", product_name, count_entry.count)
        return jsonify({"status": "ok", "count": count_entry.count})

    except Exception as e:
        session.rollback()
        logger.error("Error updating count for %s: %s", product_name, e)
        return jsonify({"status": "error", "message": "Failed to update count"}), 500

    finally:
        Session.remove()

# -----------------------------
# Get Counts
# -----------------------------
@app.route("/counts", methods=["GET"])
def get_counts():
    session = Session()
    try:
        counts = {}
        entries = session.query(Count).join(Product).all()
        for entry in entries:
            entity_id = sanitize_entity_id(entry.product.name)
            counts[entity_id] = entry.count
        logger.info("Fetched counts: %s", counts)
        return jsonify(counts)
    except Exception as e:
        logger.error("Error fetching counts: %s", e)
        return jsonify({"status": "error", "message": "Failed to fetch counts"}), 500
    finally:
        Session.remove()

@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint."""
    logger.debug("Health check accessed.")
    return jsonify({"status": "healthy"}), 200

# -----------------------------
# Backup & Restore
# -----------------------------
@app.route("/backup", methods=["GET"], endpoint="backup_page")
def backup():
    # Typically not used if in single-page approach, but leaving it
    ingress_prefix = request.headers.get("X-Ingress-Path", "")
    if not ingress_prefix.endswith("/"):
        ingress_prefix += "/"
    logger.debug("Rendering backup.html")
    return render_template("backup.html", base_path=ingress_prefix)

@app.route("/download_db", methods=["GET"])
def download_db():
    if os.path.exists(DB_FILE):
        logger.info("Database file requested for download.")
        return send_file(DB_FILE, as_attachment=True, download_name="pantry_data.db")
    else:
        logger.warning("Database file not found for download.")
        return "Database file not found.", 404

@app.route("/upload_db", methods=["POST"])
def upload_db():
    global engine, Session  # Declare as global to modify the global variables

    if 'file' not in request.files:
        logger.warning("No file part in the upload_db request.")
        return jsonify({"status": "error", "message": "No file part in the request."}), 400

    file = request.files['file']
    if file.filename == '':
        logger.warning("No file selected in the upload_db request.")
        return jsonify({"status": "error", "message": "No file selected."}), 400

    # Save the uploaded database file
    temp_db_path = os.path.join(DB_DIR, "uploaded_temp.db")
    file.save(temp_db_path)
    logger.debug(f"Uploaded database saved temporarily at: {temp_db_path}")

    # Validate and migrate the uploaded database
    try:
        migrate_database(temp_db_path)
        logger.info("Uploaded database migrated successfully.")
    except Exception as e:
        logger.error(f"Error migrating the uploaded database: {e}")
        os.remove(temp_db_path)
        return jsonify({"status": "error", "message": "Failed to migrate the uploaded database."}), 500

    # Replace the current database with the uploaded one
    try:
        os.replace(temp_db_path, DB_FILE)
        logger.info("Uploaded database successfully replaced the existing database.")
    except Exception as e:
        logger.error(f"Error replacing the database: {e}")
        return jsonify({"status": "error", "message": "Failed to replace the database."}), 500

    # Reinitialize the database session
    try:
        engine.dispose()
        engine = create_engine(f'sqlite:///{DB_FILE}', connect_args={'check_same_thread': False}, echo=False)
        SessionFactory = sessionmaker(bind=engine)
        Session = scoped_session(SessionFactory)
        logger.info("Database session reinitialized after upload.")
    except Exception as e:
        logger.error(f"Error reinitializing the database session: {e}")
        return jsonify({"status": "error", "message": "Failed to reinitialize the database."}), 500

    ingress_prefix = request.headers.get("X-Ingress-Path", "")
    if not ingress_prefix.endswith("/"):
        ingress_prefix += "/"
    redirect_url = ingress_prefix

    logger.debug(f"Redirecting to {redirect_url} after successful upload.")
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Redirecting</title>
        <script>
            window.location.href = "{redirect_url}";
        </script>
    </head>
    <body>
        <p>Database uploaded successfully. Reloading page...</p>
    </body>
    </html>
    """

# ------------------------------------------------
# OpenFoodFacts Integration
# ------------------------------------------------
def fetch_product_from_openfoodfacts(barcode: str):
    """Fetch product data from OpenFoodFacts using the barcode."""
    url = f"https://world.openfoodfacts.org/api/v0/product/{barcode}.json"
    headers = { "User-Agent": "PantryManager/1.0.5 (mint@mintcreg.co.uk)" }
    try:
        response = requests.get(url, headers=headers, timeout=5)
        response.raise_for_status()
        data = response.json()
        if data.get('status') == 1:
            product_data = data.get('product', {})
            extracted_data = {
                "name": product_data.get('product_name', 'Unknown Product'),
                "barcode": barcode,
                "category": product_data.get('categories', 'Uncategorized').split(',')[0].strip(),
                "image_front_small_url": product_data.get('image_front_small_url', None)
            }
            logger.info(f"Product fetched from OpenFoodFacts: {extracted_data}")
            return extracted_data
        else:
            logger.warning(f"Product with barcode {barcode} not found in OpenFoodFacts.")
            return None
    except requests.RequestException as e:
        logger.error(f"Error fetching product from OpenFoodFacts: {e}")
        return None

@app.route("/fetch_product", methods=["GET"])
def fetch_product():
    barcode = request.args.get('barcode')
    if not barcode:
        logger.warning("Barcode not provided in fetch_product request.")
        return jsonify({"status": "error", "message": "Barcode is required"}), 400

    product_data = fetch_product_from_openfoodfacts(barcode)
    if product_data:
        return jsonify({"status": "ok", "product": product_data})
    else:
        return jsonify({"status": "error", "message": "Product not found or failed to fetch data"}), 404

# ------------------------------------------------
# Delete Database
# ------------------------------------------------
# Import FileLock and Timeout at the top if not already done
# from filelock import FileLock, Timeout  # Already imported above

# Define the path for the lock file
LOCK_FILE_PATH = os.path.join(DB_DIR, "delete_database.lock")

# Initialize the file-based lock
delete_lock = FileLock(LOCK_FILE_PATH, timeout=0)  # timeout=0 for non-blocking

@app.route("/delete_database", methods=["DELETE"])
def delete_database():
    global engine, Session

    logger.debug("Received request to delete the database.")

    try:
        # Attempt to acquire the file-based lock without blocking
        delete_lock.acquire(timeout=0)
        logger.debug("File lock acquired successfully.")
    except Timeout:
        logger.warning("Delete operation is already in progress.")
        return jsonify({
            "status": "error",
            "message": "Delete operation is already in progress."
        }), 429  # 429 Too Many Requests

    try:
        if os.path.exists(DB_FILE):
            logger.info("Database file exists. Proceeding to delete.")

            try:
                # Create a backup before deletion
                backup_dir = os.path.join(DB_DIR, "backups")
                os.makedirs(backup_dir, exist_ok=True)
                timestamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
                backup_file = os.path.join(backup_dir, f"pantry_data_backup_{timestamp}.db")
                shutil.copy(DB_FILE, backup_file)
                logger.info(f"Backup created at {backup_file}")

                # Dispose the existing engine to release the database file
                engine.dispose()
                logger.debug("Engine disposed successfully.")

                # Remove the database file
                os.remove(DB_FILE)
                logger.info("Database file deleted successfully.")

                # Recreate the engine and session for a fresh database
                engine = create_engine(
                    f'sqlite:///{DB_FILE}',
                    connect_args={'check_same_thread': False},
                    echo=False
                )
                Base.metadata.create_all(engine)
                logger.info("Database schema created successfully after deletion.")

                # Reconfigure Session
                SessionFactory = sessionmaker(bind=engine)
                Session = scoped_session(SessionFactory)
                logger.info("Database session reinitialized after deletion.")

                return jsonify({
                    "status": "ok",
                    "message": "Database deleted and reinitialized."
                }), 200

            except Exception as e:
                logger.exception(f"Error during database deletion and reinitialization: {e}")
                return jsonify({
                    "status": "error",
                    "message": "Failed to delete and reinitialize the database."
                }), 500
        else:
            logger.warning("Attempted to delete a non-existent database file.")
            # To make the operation idempotent, return success even if the DB doesn't exist
            return jsonify({
                "status": "ok",
                "message": "Database already deleted."
            }), 200

    finally:
        # Ensure the file-based lock is always released
        delete_lock.release()
        logger.debug("File lock released.")

# ------------------------------------------------
# Theme Saving
# ------------------------------------------------
@app.route("/theme", methods=["GET"])
def get_theme():
    """Return the current theme from config.ini"""
    try:
        # Reload config from disk to catch any manual changes
        config.read(CONFIG_FILE)
        current_theme = config['Settings'].get('theme', 'light')
        logger.debug(f"Current theme retrieved: {current_theme}")
        return jsonify({"theme": current_theme})
    except Exception as e:
        logger.error(f"Error retrieving theme: {e}")
        return jsonify({"status": "error", "message": "Failed to retrieve theme"}), 500

@app.route("/theme", methods=["POST"])
def set_theme():
    """Save the selected theme (light/dark) to config.ini"""
    data = request.get_json()
    new_theme = data.get("theme", "light").lower()

    # Validate that theme is either 'light' or 'dark'
    if new_theme not in ["light", "dark"]:
        logger.warning("Invalid theme attempted: %s", new_theme)
        return jsonify({"status": "error", "message": "Invalid theme."}), 400

    # Update the theme in the config and write to disk
    try:
        config.read(CONFIG_FILE)  # Ensure we're reading the latest config
        config['Settings']['theme'] = new_theme
        with open(CONFIG_FILE, 'w') as f:
            config.write(f)
        logger.info(f"Theme updated to: {new_theme}")
        # Return a success response with the new theme
        return jsonify({"status": "ok", "theme": new_theme})
    except Exception as e:
        logger.error(f"Error setting theme: {e}")
        return jsonify({"status": "error", "message": "Failed to set theme."}), 500


# -----------------------------
# Route to Retrieve API Key
# -----------------------------

@app.route("/get_api_key", methods=["GET"])
def get_api_key():
    """
    Securely provide the API key to the frontend.
    Ensure this route is protected and only accessible from the frontend.
    """
    try:
        # Retrieve the API key from config
        api_key = config['Settings'].get('api_key', '')
        if not api_key:
            logger.error("API key not found in config.ini.")
            return jsonify({"status": "error", "message": "API key not configured."}), 500

        logger.debug("API key provided to frontend.")
        return jsonify({"api_key": api_key}), 200
    except Exception as e:
        logger.exception(f"Error retrieving API key: {e}")
        return jsonify({"status": "error", "message": "Failed to retrieve API key."}), 500

# ------------------------------------------------
# Regenerate API Key
# ------------------------------------------------

@app.route("/regenerate_api_key", methods=["POST"])
def regenerate_api_key():
    """
    Regenerate the API key.
    WARNING: This route is fully insecure. Exposing API key regeneration can lead to unauthorized access.
    Use cautiously and consider securing it in a production environment.
    """
    try:
        # Generate a new API key
        new_api_key = generate_api_key()
        logger.debug("Generated a new API key for regeneration.")

        # Update the config object
        config['Settings']['api_key'] = new_api_key

        # Write the updated config back to the file
        with open(CONFIG_FILE, 'w') as f:
            config.write(f)
        logger.info("API key regenerated and updated in config.ini.")

        # Return the new API key as JSON
        return jsonify({"status": "ok", "api_key": new_api_key}), 200

    except Exception as e:
        logger.exception(f"Failed to regenerate API key: {e}")
        return jsonify({"status": "error", "message": "Failed to regenerate API key."}), 500

# ------------------------------------------------
# Column Filtering Persistent Storage
# ------------------------------------------------
@app.route("/save_column_visibility", methods=["POST"])
def save_column_visibility():
    """
    Save column visibility settings to the config.ini file.
    """
    try:
        data = request.get_json()
        column_settings = data.get("settings", {})

        if not column_settings:
            return jsonify({"status": "error", "message": "No settings provided"}), 400

        # Save settings in config.ini
        if "ColumnVisibility" not in config:
            config.add_section("ColumnVisibility")

        for column, visible in column_settings.items():
            config.set("ColumnVisibility", column, str(visible).lower())

        with open(CONFIG_FILE, "w") as f:
            config.write(f)

        return jsonify({"status": "ok", "message": "Column visibility settings saved successfully."}), 200
    except Exception as e:
        logger.error(f"Error saving column visibility settings: {e}")
        return jsonify({"status": "error", "message": "Failed to save settings."}), 500


@app.route("/get_column_visibility", methods=["GET"])
def get_column_visibility():
    """
    Retrieve column visibility settings from the config.ini file.
    """
    try:
        if "ColumnVisibility" in config:
            settings = {
                key: config.getboolean("ColumnVisibility", key)
                for key in config["ColumnVisibility"]
            }
        else:
            # Default visibility settings if none exist
            settings = {
                "name": True,
                "category": True,
                "image": True,
                "barcode": True,
                "actions": True,
            }

        return jsonify({"status": "ok", "settings": settings}), 200
    except Exception as e:
        logger.error(f"Error retrieving column visibility settings: {e}")
        return jsonify({"status": "error", "message": "Failed to retrieve settings."}), 500



# -----------------------------
# Run the Application
# -----------------------------

if __name__ == "__main__":
    # Do not run app.run() since Gunicorn handles it
    app.run(host="0.0.0.0", port=8099)
