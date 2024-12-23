# pantry_tracker/webapp/app.py

from flask import Flask, request, jsonify, render_template, send_file, redirect, url_for
import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from models import Base, Category, Product, Count
from schemas import CategorySchema, UpdateCategorySchema, ProductSchema, UpdateProductSchema
from marshmallow import ValidationError
import requests  # For interacting with OpenFoodFacts
from migrate import migrate_database
from werkzeug.middleware.proxy_fix import ProxyFix

app = Flask(__name__)

# Apply ProxyFix middleware to handle Ingress headers correctly
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_port=1, x_prefix=1)


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define the path to the database within the container
DB_FILE = "/config/pantry_data/pantry_data.db"

# Ensure the pantry_data directory exists
DB_DIR = os.path.dirname(DB_FILE)
os.makedirs(DB_DIR, exist_ok=True)

# Ensure the database schema is valid
#migrate_database(DB_FILE)

# Initialize the database
engine = create_engine(f'sqlite:///{DB_FILE}', connect_args={'check_same_thread': False}, echo=False)
Base.metadata.create_all(engine)

# Create a configured "Session" class
SessionFactory = sessionmaker(bind=engine)
# Create a scoped session
Session = scoped_session(SessionFactory)

def sanitize_entity_id(name: str) -> str:
    """Sanitize the product name to create a unique entity ID without category."""
    return f"sensor.product_{name.lower().replace(' ', '_').replace('-', '_')}"

@app.route("/")
def index():
    """Root endpoint to render the HTML UI."""
    return render_template("index.html")
	
@app.route("/index.html")
def index_html():
    return render_template("index.html")

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

# ==============================
# New Endpoints for Editing Categories and Products
# ==============================

@app.route("/categories/<old_name>", methods=["PUT"])
def edit_category(old_name):
    """
    Edit an existing category's name.
    Payload:
    {
        "new_name": "New Category Name"
    }
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


@app.route("/products/<old_name>", methods=["PUT"])
def edit_product(old_name):
    """
    Edit an existing product's details.
    Payload can include any of the following fields:
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

            category = session.query(Category).filter_by(name=category_name).first()
            if not category:
                logger.warning("Category '%s' not found for product edit", category_name)
                return jsonify({"status": "error", "message": "Category does not exist"}), 400

            product.category = category
            logger.info(f"Product '{product.name}' category updated to '{category_name}'")

        # Update URL if provided
        if url:
            url = url.strip()
            if not url:
                logger.warning("Invalid URL provided for product edit")
                return jsonify({"status": "error", "message": "Invalid URL"}), 400
            product.url = url
            logger.info(f"Product '{product.name}' URL updated to '{url}'")

        # Update barcode if provided
        if barcode is not None:  # Allow setting barcode to null
            if barcode:
                barcode = barcode.strip()
                if not barcode.isdigit() or not (8 <= len(barcode) <= 13):
                    logger.warning("Invalid barcode provided for product edit: '%s'", barcode)
                    return jsonify({"status": "error", "message": "Barcode must be numeric and between 8 to 13 digits"}), 400

                # Check if barcode already exists
                existing_barcode = session.query(Product).filter_by(barcode=barcode).first()
                if existing_barcode and existing_barcode.id != product.id:
                    logger.warning("Attempted to set duplicate barcode: %s", barcode)
                    return jsonify({"status": "error", "message": "Barcode already exists"}), 400

                product.barcode = barcode
                logger.info(f"Product '{product.name}' barcode updated to '{barcode}'")
            else:
                # If barcode is set to null or empty, remove it
                product.barcode = None
                logger.info(f"Product '{product.name}' barcode removed")

        session.commit()
        logger.info(f"Product '{old_name}' edited successfully")

        # Return updated list of products
        products = session.query(Product).all()
        product_list = [
            {"name": prod.name, "url": prod.url, "category": prod.category.name, "barcode": prod.barcode} for prod in products
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

@app.route("/products", methods=["GET", "POST", "DELETE"])
def products_route():
    session = Session()
    if request.method == "GET":
        try:
            products = session.query(Product).all()
            product_list = [
                {"name": prod.name, "url": prod.url, "category": prod.category.name, "barcode": prod.barcode} for prod in products
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
        barcode = data.get("barcode")  # Optional barcode
        
        try:
            # Check if category exists
            category = session.query(Category).filter_by(name=category_name).first()
            if not category:
                logger.warning("Attempted to add product to non-existent category: %s", category_name)
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
            
            new_product = Product(name=name, url=url, category=category, barcode=barcode)
            session.add(new_product)
            
            # Initialize count to 0
            new_count = Count(product=new_product, count=0)
            session.add(new_count)
            
            session.commit()
            logger.info(f"Added new product: {name}")
            
            products = session.query(Product).all()
            product_list = [
                {"name": prod.name, "url": prod.url, "category": prod.category.name, "barcode": prod.barcode} for prod in products
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
                {"name": prod.name, "url": prod.url, "category": prod.category.name, "barcode": prod.barcode} for prod in products
            ]
            return jsonify({"status": "ok", "products": product_list})
        except Exception as e:
            session.rollback()
            logger.error("Error deleting product '%s': %s", product_name, e)
            return jsonify({"status": "error", "message": "Failed to delete product"}), 500
        finally:
            Session.remove()

@app.route("/update_count", methods=["POST"])
def update_count():
    session = Session()
    data = request.get_json()
    product_name = data.get("product_name")  # Use product_name directly now
    action = data.get("action")
    amount = data.get("amount", 1)

    # Check that we have the required parameters
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
    return jsonify({"status": "healthy"}), 200

###################################
# Backup & Restore Functionality
###################################

# Display the backup/restore page
@app.route("/backup", methods=["GET"], endpoint="backup_page")
def backup():
    # The real prefix used by Home Assistant’s Ingress
    # e.g. "/api/hassio_ingress/1ab2c3d4e5f6abcdef"
    ingress_prefix = request.headers.get("X-Ingress-Path", "")
    if not ingress_prefix.endswith("/"):
        ingress_prefix += "/"

    # Now, "ingress_prefix" is the real path the user is on
    # e.g. "/api/hassio_ingress/1ab2c3d4e5f6abcdef/"
    # So linking to ingress_prefix + "index.html" yields a proper path.
    return render_template("backup.html", base_path=ingress_prefix)


# Download the current database file
@app.route("/download_db", methods=["GET"])
def download_db():
    if os.path.exists(DB_FILE):
        return send_file(DB_FILE, as_attachment=True, download_name="pantry_data.db")
    else:
        return "Database file not found.", 404

# Upload a new database file
@app.route("/upload_db", methods=["POST"])
def upload_db():
    if 'file' not in request.files:
        return jsonify({"status": "error", "message": "No file part in the request."}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"status": "error", "message": "No file selected."}), 400

    # Save the uploaded database file
    temp_db_path = os.path.join(DB_DIR, "uploaded_temp.db")
    file.save(temp_db_path)

    # Validate and migrate the uploaded database
    try:
        migrate_database(temp_db_path)
    except Exception as e:
        logger.error(f"Error migrating the uploaded database: {e}")
        os.remove(temp_db_path)  # Cleanup temporary file
        return jsonify({"status": "error", "message": "Failed to migrate the uploaded database."}), 500

    # Replace the current database with the uploaded one
    try:
        os.replace(temp_db_path, DB_FILE)  # Atomically replace the database
        logger.info("Uploaded database successfully replaced the existing database.")
    except Exception as e:
        logger.error(f"Error replacing the database: {e}")
        return jsonify({"status": "error", "message": "Failed to replace the database."}), 500

    # Reinitialize the database session
    global engine
    global Session
    engine.dispose()
    engine = create_engine(f'sqlite:///{DB_FILE}', connect_args={'check_same_thread': False}, echo=False)
    SessionFactory = sessionmaker(bind=engine)
    Session = scoped_session(SessionFactory)

    #
    # 1) Use X-Ingress-Path to get the real HA Ingress prefix (with the UUID).
    # 2) We'll do a client-side JS redirect with "window.location.href" to stay *in the same iframe*.
    #
    ingress_prefix = request.headers.get("X-Ingress-Path", "")
    if not ingress_prefix.endswith("/"):
        ingress_prefix += "/"
    # If you prefer the root route, replace with: redirect_url = ingress_prefix
    redirect_url = ingress_prefix

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Redirecting</title>
        <script>
            // Reload inside the *same* iframe, staying in HA
            window.location.href = "{redirect_url}";
        </script>
    </head>
    <body>
        <p>Database uploaded successfully. Reloading page...</p>
    </body>
    </html>
    """


###################################
# OpenFoodFacts Integration
###################################

def fetch_product_from_openfoodfacts(barcode: str):
    """Fetch product data from OpenFoodFacts using the barcode."""
    url = f"https://world.openfoodfacts.org/api/v0/product/{barcode}.json"
    
    # Define a custom User-Agent
    headers = {
        "User-Agent": "PantryManager/1.0.5 (mint@mintcreg.co.uk)"
    }
    
    try:
        # Include the custom headers in the request
        response = requests.get(url, headers=headers, timeout=5)
        response.raise_for_status()
        data = response.json()
        if data.get('status') == 1:
            product_data = data.get('product', {})
            # Extract desired fields. Modify as needed.
            extracted_data = {
                "name": product_data.get('product_name', 'Unknown Product'),
                "barcode": barcode,
                "category": product_data.get('categories', 'Uncategorized').split(',')[0].strip(),
                "image_front_small_url": product_data.get('image_front_small_url', None)  # New field
                # Add more fields as needed
            }
            return extracted_data
        else:
            logger.warning(f"Product with barcode {barcode} not found in OpenFoodFacts.")
            return None
    except requests.RequestException as e:
        logger.error(f"Error fetching product from OpenFoodFacts: {e}")
        return None


@app.route("/fetch_product", methods=["GET"])
def fetch_product():
    """Endpoint to fetch product data from OpenFoodFacts using a barcode."""
    barcode = request.args.get('barcode')
    if not barcode:
        logger.warning("Barcode not provided in fetch_product request.")
        return jsonify({"status": "error", "message": "Barcode is required"}), 400
    
    product_data = fetch_product_from_openfoodfacts(barcode)
    if product_data:
        return jsonify({"status": "ok", "product": product_data})
    else:
        return jsonify({"status": "error", "message": "Product not found or failed to fetch data"}), 404

if __name__ == "__main__":
    # Do not run app.run() since Gunicorn handles it
    app.run(host="0.0.0.0", port=8099)
