#!/bin/bash

# This script is used to build the entire application

echo "Starting build process..."

# Build frontend
echo "Building frontend..."
cd frontend
npm install
npm run build
cd ..

# Check if frontend build was successful
if [ ! -d "frontend/dist" ]; then
  echo "ERROR: Frontend build failed! Dist directory not found."
  exit 1
fi

echo "Frontend build successful!"

# Build backend (not much to build, but we can install dependencies)
echo "Setting up backend..."
cd backend
npm install
cd ..

echo "Build process completed successfully!"
