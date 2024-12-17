# pantry_tracker/webapp/app.py

from flask import Flask, request, jsonify, render_template
import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from models import Base, Category, Product, Count
from schemas import CategorySchema, ProductSchema
from marshmallow import ValidationError

app = Flask(__name__)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define the path to the database within the container
DB_FILE = "/config/pantry_data/pantry_data.db"

# Ensure the pantry_data directory exists
DB_DIR = os.path.dirname(DB_FILE)
os.makedirs(DB_DIR, exist_ok=True)

# Initialize the database
engine = create_engine(f'sqlite:///{DB_FILE}', connect_args={'check_same_thread': False}, echo=False)
Base.metadata.create_all(engine)

# Create a configured "Session" class
SessionFactory = sessionmaker(bind=engine)
# Create a scoped session
Session = scoped_session(SessionFactory)

# Initialize Marshmallow Schemas
category_schema = CategorySchema()
product_schema = ProductSchema()

def sanitize_entity_id(name: str) -> str:
    """Sanitize the product name to create a unique entity ID without category."""
    return f"sensor.product_{name.lower().replace(' ', '_').replace('-', '_')}"

@app.route("/")
def index():
    """Root endpoint to render the HTML UI."""
    return render_template("index.html")

@app.route("/categories", methods=["GET", "POST", "DELETE"])
def categories():
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
            data = category_schema.load(request.get_json())
        except ValidationError as err:
            Session.remove()
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
            Session.remove()
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

@app.route("/products", methods=["GET", "POST", "DELETE"])
def products():
    session = Session()
    if request.method == "GET":
        try:
            products = session.query(Product).all()
            product_list = [
                {"name": prod.name, "url": prod.url, "category": prod.category.name} for prod in products
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
            data = product_schema.load(request.get_json())
        except ValidationError as err:
            Session.remove()
            logger.warning("Validation error on adding product: %s", err.messages)
            return jsonify({"status": "error", "errors": err.messages}), 400
        
        name = data.get("name")
        url = data.get("url")
        category_name = data.get("category")
        
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
            
            new_product = Product(name=name, url=url, category=category)
            session.add(new_product)
            
            # Initialize count to 0
            new_count = Count(product=new_product, count=0)
            session.add(new_count)
            
            session.commit()
            logger.info(f"Added new product: {name}")
            
            products = session.query(Product).all()
            product_list = [
                {"name": prod.name, "url": prod.url, "category": prod.category.name} for prod in products
            ]
            return jsonify({"status": "ok", "products": product_list})
        except Exception as e:
            session.rollback()
            logger.error(f"Error adding product '{name}': {e}")
            return jsonify({"status": "error", "message": "Failed to add product"}), 500
        finally:
            Session.remove()
    
    elif request.method == "DELETE":
        data = request.get_json()
        product_name = data.get("name")
        if not product_name:
            Session.remove()
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
                {"name": prod.name, "url": prod.url, "category": prod.category.name} for prod in products
            ]
            return jsonify({"status": "ok", "products": product_list})
        except Exception as e:
            session.rollback()
            logger.error(f"Error deleting product '{product_name}': {e}")
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
        Session.remove()
        return jsonify({"status": "error", "message": "Missing required parameters"}), 400

    try:
        product = session.query(Product).filter_by(name=product_name).first()
        if not product:
            logger.warning("Product '%s' not found in update_count", product_name)
            Session.remove()
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
            session.remove()
            return jsonify({"status": "error", "message": "Invalid action"}), 400

        session.commit()
        logger.info(f"Updated count for {product_name}: {count_entry.count}")
        return jsonify({"status": "ok", "count": count_entry.count})
    except Exception as e:
        session.rollback()
        logger.error(f"Error updating count for {product_name}: {e}")
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
        logger.error(f"Error fetching counts: {e}")
        return jsonify({"status": "error", "message": "Failed to fetch counts"}), 500
    finally:
        Session.remove()

@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({"status": "healthy"}), 200

if __name__ == "__main__":
    # For ingress, listen on port 5000
    app.run(host="0.0.0.0", port=5000)
