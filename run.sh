#!/usr/bin/with-contenv bash
# Start the Flask app with SSL

# Enable debug mode for the shell script (optional but helpful for troubleshooting)
#set -x


# Start the Flask app with SSL using exec to replace the shell with the Flask process
echo "Starting Pantry Tracker"
exec python /opt/webapp/app.py
