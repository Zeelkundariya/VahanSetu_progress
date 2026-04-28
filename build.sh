#!/usr/bin/env bash
# exit on error
set -o errexit

# Install Python dependencies
pip install -r requirements.txt

# Install and Build Frontend
cd client
npm install
npm run build
cd ..

# Database setup (optional - creates db if not exists)
# python init_db.py
