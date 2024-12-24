import os
import sqlite3
from sqlalchemy import create_engine
from models import Base
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define the database file path
DB_FILE = "/config/pantry_data/pantry_data.db"


def migrate_database(db_file):
    """Ensure the database exists and matches the expected schema."""
    if not os.path.exists(db_file):
        logger.info("Database file not found. Creating a new one...")
        os.makedirs(os.path.dirname(db_file), exist_ok=True)
        engine = create_engine(f'sqlite:///{db_file}')
        Base.metadata.create_all(engine)
        logger.info("Database created with the required schema.")
        return

    logger.info("Database file exists. Validating schema...")

    conn = sqlite3.connect(db_file)
    cursor = conn.cursor()

    try:
        # Check if the 'products' table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='products';")
        table_exists = cursor.fetchone()
        if not table_exists:
            logger.info("Table 'products' not found. Creating it...")
            engine = create_engine(f'sqlite:///{db_file}')
            Base.metadata.create_all(engine)
            logger.info("Table 'products' created.")
            return

        # Check if 'barcode' and 'image_front_small_url' columns exist
        cursor.execute("PRAGMA table_info(products);")
        existing_columns = {row[1] for row in cursor.fetchall()}
        has_barcode = "barcode" in existing_columns
        has_image_url = "image_front_small_url" in existing_columns

        # Create a new table with the desired schema
        logger.info("Creating a temporary table with the updated schema...")
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS products_new (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            url TEXT NOT NULL,
            category_id INTEGER NOT NULL,
            barcode TEXT DEFAULT NULL,
            image_front_small_url TEXT DEFAULT NULL,
            FOREIGN KEY (category_id) REFERENCES categories (id)
        );
        """)

        # Build the data copy query dynamically based on existing columns
        logger.info("Copying data from the old table to the new table...")
        columns_to_copy = ["id", "name", "url", "category_id"]
        if has_barcode:
            columns_to_copy.append("barcode")
        else:
            logger.warning("Column 'barcode' not found in the old table. Setting default NULL.")
        if has_image_url:
            columns_to_copy.append("image_front_small_url")
        else:
            logger.warning("Column 'image_front_small_url' not found in the old table. Setting default NULL.")

        # Dynamically construct the SQL query for data copy
        select_columns = ", ".join(columns_to_copy)
        placeholders = ", ".join(f"COALESCE({col}, NULL)" if col not in existing_columns else col for col in columns_to_copy)
        cursor.execute(f"""
        INSERT INTO products_new ({select_columns})
        SELECT {placeholders} FROM products;
        """)

        # Drop the old table
        logger.info("Dropping the old 'products' table...")
        cursor.execute("DROP TABLE products;")

        # Rename the new table to the original table name
        logger.info("Renaming 'products_new' to 'products'...")
        cursor.execute("ALTER TABLE products_new RENAME TO products;")

        conn.commit()
        logger.info("Database migration completed successfully.")

    except Exception as e:
        conn.rollback()
        logger.error(f"Error during database migration: {e}")
        raise
    finally:
        conn.close()


# Main entry point for the migration script
if __name__ == "__main__":
    migrate_database(DB_FILE)
