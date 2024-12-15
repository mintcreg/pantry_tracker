# custom_components/pantry_tracker/__init__.py

import logging
import os
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_registry import async_get_registry
from homeassistant.helpers.typing import ConfigType, DiscoveryInfoType

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

async def async_setup(hass: HomeAssistant, config: ConfigType):
    """Set up the Pantry Tracker integration."""
    hass.data.setdefault(DOMAIN, {})
    return True

async def async_setup_entry(hass: HomeAssistant, entry):
    """Set up Pantry Tracker from a config entry."""
    hass.data[DOMAIN][entry.entry_id] = {}
    
    # Your existing setup code, like adding sensors
    # ...

    _LOGGER.info("Pantry Tracker integration set up successfully.")
    return True

async def async_unload_entry(hass: HomeAssistant, entry):
    """Unload a config entry."""
    _LOGGER.info("Unloading Pantry Tracker integration.")

    # Remove all entities associated with this integration
    registry = await async_get_registry(hass)
    entities_to_remove = [
        entity.entity_id for entity in registry.entities.values()
        if entity.platform == DOMAIN
    ]

    for entity_id in entities_to_remove:
        registry.async_remove(entity_id)
        _LOGGER.info(f"Removed entity {entity_id} as part of cleanup.")

    # Delete the data file
    data_file = hass.config.path("custom_components", DOMAIN, "pantry_data.json")
    if os.path.exists(data_file):
        try:
            os.remove(data_file)
            _LOGGER.info(f"Deleted data file {data_file} upon cleanup.")
        except Exception as e:
            _LOGGER.error(f"Error deleting data file {data_file}: {e}")
    else:
        _LOGGER.info(f"Data file {data_file} does not exist. No need to delete.")

    # Remove integration data
    hass.data[DOMAIN].pop(entry.entry_id)

    _LOGGER.info("Pantry Tracker integration unloaded successfully.")
    return True
