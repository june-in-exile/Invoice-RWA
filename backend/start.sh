#!/bin/sh

# ROFL Backend Startup Script
# This script initializes the database and starts the backend service

set -e

echo "=== Invoice RWA Backend Startup ==="
echo "Environment: $NODE_ENV"
echo "Database Type: $DB_TYPE"
echo "Database Path: $DB_PATH"

# Ensure the storage directory exists
mkdir -p /rofl/storage

# Check if database file exists
if [ ! -f "$DB_PATH" ]; then
    echo "Database not found. Initializing database..."
    node src/db/init.js
    echo "Database initialized successfully."
else
    echo "Database already exists at $DB_PATH"
fi

# Start the backend service
echo "Starting backend service..."
exec node src/index.js
