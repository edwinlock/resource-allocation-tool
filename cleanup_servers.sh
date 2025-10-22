#!/bin/bash

# Script to clean up orphaned http.server processes

echo "Looking for http.server processes..."
pids=$(ps aux | grep "http.server" | grep -v grep | awk '{print $2}')

if [ -z "$pids" ]; then
    echo "No http.server processes found."
else
    echo "Found http.server processes: $pids"
    echo "Killing them..."
    kill $pids 2>/dev/null
    echo "Done!"
fi

# Also show what's listening on common ports
echo ""
echo "Ports currently in use (8000-8010, 5000, 7000):"
lsof -i -P | grep LISTEN | grep -E ":(8000|8001|8002|8003|8004|8005|8006|8007|8008|8009|8010|5000|7000)" || echo "None of these ports are in use."
