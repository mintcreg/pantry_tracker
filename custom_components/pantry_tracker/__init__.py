"""Pantry Tracker Integration."""

import logging

DOMAIN = "pantry_tracker"

_LOGGER = logging.getLogger(__name__)

async def async_setup(hass, config):
    """Set up the Pantry Tracker integration."""
    hass.data[DOMAIN] = {}
    return True
