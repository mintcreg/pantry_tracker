# Changelog

## [Version 1.0.52](https://www.google.com)

- General styling improvements
- Fixed Add Product/ Edit Product display modals
- Companion app specific styling


## [Version 1.0.51](https://github.com/mintcreg/pantry_tracker/releases/tag/v1.0.51) (Skipped 1.0.5)

### Breaking Changes

Version 1.0.51 will not automatically work with databases from 1.0.4 due to schema changes.

Please ensure you follow the checklist below to retain product data.


### Update Checklist (Retain data)

1. Backup database from 'Backup & Restore'
2. Remove all products and categories _(Verify they have been removed within HA)_
3. DELETE database from _(addon_configs/pantry_tracker/pantry_data/pantry_data.db)_
> [!CAUTION]
> Failure to delete the database from addon_configs will result in a partially working webui
4. Update Addon
5. Update Pantry Tracker Components to 1.0.4
6. Update configuration.yaml (remove source)
9. Restart HA
8. Upload previous database 


```yaml
sensor:
 - platform: pantry_tracker
   scan_interval: 1  # Defaults to 30 seconds if not set
``` 
> [!IMPORTANT]
> If you do not need to save a copy of your database complete the above steps (EXCEPT step 1)

## Updates 
- Styling updates
- Improved error handling
- Improved Logging
- OpenFoodFacts Attributions added
- ChatGPT/OpenAI Attributions added
- Changed Add Product route to be more user friendly
- Ingress
- Integration for OpenFoodFacts API
- Barcode Attribute (Optional)
- Scan a barcode via mobile (populates the Add Product form)
- Populate 'Add Product' with barcode data
- Edit categories/products (retains all data within HA except history)

## [Version 1.0.4](https://github.com/mintcreg/pantry_tracker/releases/tag/v1.0.4)
- Fixed release for 1.0.3

## [Version 1.0.3](https://github.com/mintcreg/pantry_tracker/releases/tag/v1.0.3)
- Styling changes
- Backup & Restore Database Facility added

## [Version 1.0.2](https://github.com/mintcreg/pantry_tracker/releases/tag/v1.0.2)
- Allow spacing within category and product names

## [Version 1.0.1](https://github.com/mintcreg/pantry_tracker/releases/tag/v1.0.1)
- Change to update_count to ensure capitalisation doesn't affect updates
- Categories list updates on load (previously had to load categories page)
- Alphanumeric verification for category & product names

## Version 1.0.0
- Initial release of the Pantry Tracker add-on.
