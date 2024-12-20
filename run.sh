#!/usr/bin/with-contenv bash
# Start the Flask app with SSL

# Enable debug mode for the shell script (optional but helpful for troubleshooting)
set -x

# Define absolute paths to the SSL certificates
CERT_FILE="/config/pantry_data/keys/cert.pem"
KEY_FILE="/config/pantry_data/keys/key.pem"

# Ensure the keys directory exists
mkdir -p /config/pantry_data/keys

# Function to generate self-signed SSL certificates
generate_certificates() {
    echo "Generating self-signed SSL certificates..."
    openssl req -x509 -newkey rsa:4096 -nodes \
        -keyout "$KEY_FILE" -out "$CERT_FILE" \
        -days 365 -subj "/CN=localhost"
    if [ $? -eq 0 ]; then
        echo "Certificates generated successfully at $CERT_FILE and $KEY_FILE"
    else
        echo "Failed to generate SSL certificates."
        exit 1
    fi
}

# Check if certificates already exist
if [ ! -f "$CERT_FILE" ] || [ ! -f "$KEY_FILE" ]; then
    generate_certificates
else
    echo "SSL certificates already exist. Skipping generation."
fi

# Verify that certificates exist after generation
if [ -f "$CERT_FILE" ] && [ -f "$KEY_FILE" ]; then
    echo "SSL certificates are present."
else
    echo "Failed to generate SSL certificates."
    exit 1
fi

# Start the Flask app with SSL using exec to replace the shell with the Flask process
echo "Starting Flask app with SSL..."
exec python /opt/webapp/app.py
