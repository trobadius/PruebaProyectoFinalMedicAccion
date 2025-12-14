#!/bin/bash

# Check if PORT is set, otherwise default to 8000
PORT=${PORT:-8000}

# Start Gunicorn
gunicorn --bind :$PORT --workers 4 project.wsgi