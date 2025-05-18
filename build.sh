#!/bin/bash

# Remove existing node_modules and lock file if they exist
rm -rf node_modules package-lock.json

# Install dependencies with legacy peer deps
npm install --legacy-peer-deps

# Build the application
npm run build 