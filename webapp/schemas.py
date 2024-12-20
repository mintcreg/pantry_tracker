# pantry_tracker/webapp/schemas.py

from marshmallow import Schema, fields, validate, validates, ValidationError

class CategorySchema(Schema):
    """
    Schema for creating a new category.
    """
    name = fields.Str(required=True, validate=validate.Length(min=1, max=50))


class UpdateCategorySchema(Schema):
    """
    Schema for updating an existing category's name.
    """
    new_name = fields.Str(required=True, validate=validate.Length(min=1, max=50))
    
    @validates('new_name')
    def validate_new_name(self, value):
        if not value.strip():
            raise ValidationError("New category name cannot be empty or whitespace.")


class ProductSchema(Schema):
    """
    Schema for creating a new product.
    """
    name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    url = fields.Url(required=True, validate=validate.Length(max=200))
    category = fields.Str(required=True, validate=validate.Length(min=1, max=50))
    barcode = fields.Str(required=False, allow_none=True, validate=validate.Length(min=8, max=13))
    image_front_small_url = fields.Str(required=False, allow_none=True, validate=validate.URL())

    @validates('barcode')
    def validate_barcode(self, value):
        if value and not value.isdigit():
            raise ValidationError("Barcode must be numeric.")
        if value and not (8 <= len(value) <= 13):
            raise ValidationError("Barcode must be between 8 to 13 digits.")


class UpdateProductSchema(Schema):
    """
    Schema for updating an existing product's details.
    All fields are optional to allow partial updates.
    """
    new_name = fields.Str(required=False, validate=validate.Length(min=1, max=100))
    category = fields.Str(required=False, validate=validate.Length(min=1, max=50))
    url = fields.Url(required=False, validate=validate.Length(max=200))
    barcode = fields.Str(required=False, allow_none=True, validate=validate.Length(min=8, max=13))
    image_front_small_url = fields.Str(required=False, allow_none=True, validate=validate.URL())

    @validates('barcode')
    def validate_barcode(self, value):
        if value is not None:
            if value and not value.isdigit():
                raise ValidationError("Barcode must be numeric.")
            if value and not (8 <= len(value) <= 13):
                raise ValidationError("Barcode must be between 8 to 13 digits.")
