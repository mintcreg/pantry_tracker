# pantry_tracker/webapp/schemas.py

from marshmallow import Schema, fields, validate

class CategorySchema(Schema):
    name = fields.Str(required=True, validate=validate.Length(min=1))

class ProductSchema(Schema):
    name = fields.Str(required=True, validate=validate.Length(min=1))
    url = fields.Url(required=True)
    category = fields.Str(required=True, validate=validate.Length(min=1))
