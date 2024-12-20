# pantry_tracker/webapp/schemas.py

from marshmallow import Schema, fields, validate

class CategorySchema(Schema):
    name = fields.Str(required=True, validate=validate.Length(min=1))

class ProductSchema(Schema):
    name = fields.Str(required=True, validate=validate.Length(min=1))
    url = fields.Url(required=True)
    category = fields.Str(required=True, validate=validate.Length(min=1))
    barcode = fields.Str(required=False, allow_none=True, validate=validate.Length(min=8, max=13))  # Existing optional barcode field
    image_front_small_url = fields.Str(required=False, allow_none=True, validate=validate.URL())  # New optional image URL field
