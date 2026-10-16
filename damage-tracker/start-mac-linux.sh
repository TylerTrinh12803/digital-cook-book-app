#!/bin/sh
# Starts FXN HT Incoming Damage on this computer: http://localhost:8081
cd "$(dirname "$0")" || exit 1
exec python3 server.py "$@"
