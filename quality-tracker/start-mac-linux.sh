#!/bin/sh
# Starts the FXN HT Quality Tracker on this computer: http://localhost:8080
cd "$(dirname "$0")" || exit 1
exec python3 server.py "$@"
