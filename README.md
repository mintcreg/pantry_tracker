# Pantry Tracker - HomeAssistant

# ***NOTE THIS IS A WIP ***

# Description
The Pantry Tracker add-on is a Home Assistant integration designed to help you keep track of products in your kitchen, pantry, or any other storage space. With a user-friendly interface and a powerful backend, this add-on simplifies the organization and management of your items by allowing you to create categories, assign products to them, and maintain an up-to-date inventory.

The add-on operates using a Flask API server hosted locally on port 5000 (restricted to the local network for security). All product and category data is stored persistently in a .db file using JSON, ensuring your data is retained across reboots.


# **Features**

🖥️ Responsive User Interface

The add-on provides a sleek, easy-to-navigate interface that adapts to different screen sizes for seamless use on both desktop and mobile devices.

📦 Product Management

Add, update, or remove products from your inventory.
Automatically track counts for individual products.

🗂️ Category Management

Create, edit, or delete custom categories.
Assign products to specific categories for better organization.

🔄 Real-Time Updates

Sensors in Home Assistant are updated in real time to reflect changes made via the API or the interface.

# Installation
1: Add [https://github.com/mintcreg/pantry_tracker/](https://github.com/mintcreg/pantry_tracker/) to repositories to the addon store

2: Install Addon from the addon store

3: Install [Pantry Tracker - Custom Components](https://github.com/mintcreg/pantry_tracker_components)

4: *(Optional) Install [Pantry Tracker Card](https://github.com/mintcreg/pantry_tracker_card)*

5: Navigate to http://(HA-LOCAL-IP):5000




## Screenshots & Video


 
![Early Preview](screenshots/Demo.gif)

![App Screenshot](https://github.com/mintcreg/simple_pantry/blob/main/screenshots/demo.gif?raw=true)



# Roadmap
```bash
  > Full ability to manage existing products
  
  > Integrate with UPC/EAN Database

  > Provide functionality for barcode scanning to add/remove/increase/decrease quantities
``` 


