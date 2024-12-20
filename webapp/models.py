# pantry_tracker/webapp/models.py

from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship

Base = declarative_base()

class Category(Base):
    __tablename__ = 'categories'
    
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)
    
    products = relationship("Product", back_populates="category", cascade="all, delete-orphan")

class Product(Base):
    __tablename__ = 'products'
    
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)
    url = Column(String, nullable=False)
    category_id = Column(Integer, ForeignKey('categories.id'), nullable=False)
    barcode = Column(String, unique=True, nullable=True)  # Existing optional barcode field
    image_front_small_url = Column(String, nullable=True)  # New optional image URL field
    
    category = relationship("Category", back_populates="products")
    count = relationship("Count", back_populates="product", uselist=False, cascade="all, delete-orphan")

class Count(Base):
    __tablename__ = 'counts'
    
    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey('products.id'), unique=True, nullable=False)
    count = Column(Integer, nullable=False, default=0)
    
    product = relationship("Product", back_populates="count")
