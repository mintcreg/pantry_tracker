#ARG BUILD_FROM
#FROM $BUILD_FROM

# Install necessary packages
#RUN apk add --no-cache python3 py3-pip

# Create a virtual environment
#RUN python3 -m venv /opt/venv

# Install Python dependencies in the virtual environment
#COPY webapp/requirements.txt /tmp/
#RUN /opt/venv/bin/pip install --no-cache-dir -r /tmp/requirements.txt

# Copy the application files
#COPY webapp /opt/webapp
#COPY custom_components /opt/custom_components

# Copy the run script to s6-overlay services directory
#COPY run.sh /etc/services.d/pantry_tracker/run
#RUN chmod +x /etc/services.d/pantry_tracker/run

# Set the PATH to include the virtual environment
#ENV PATH="/opt/venv/bin:$PATH"





ARG BUILD_FROM
FROM $BUILD_FROM

# Install necessary packages
RUN apk add --no-cache python3 py3-pip

# Create a virtual environment
RUN python3 -m venv /opt/venv

# Install Python dependencies in the virtual environment
COPY webapp/requirements.txt /tmp/
RUN /opt/venv/bin/pip install --no-cache-dir -r /tmp/requirements.txt

# Copy the application files
COPY webapp /opt/webapp
#COPY custom_components /opt/custom_components

# Copy the run script to s6-overlay services directory
COPY run.sh /etc/services.d/pantry_tracker/run
RUN chmod +x /etc/services.d/pantry_tracker/run

# Set the PATH to include the virtual environment
ENV PATH="/opt/venv/bin:$PATH"
