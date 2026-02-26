#!/bin/bash

# 1. Clean previous
rm -rf functions/server

# 2. Copy server code to functions
# Firebase Functions uploads the 'functions' folder in isolation, 
# so we need the server code inside it.
cp -R server functions/server

# 3. Copy shared db folder logic if needed, but it's inside server now
# Ensure database.js uses /tmp for Firebase too
# (I already updated database.js to check process.env.VERCEL, let's update it for FIREBASE too)

echo "✅ Server code prepared in functions/server"
echo "👉 Now run: firebase deploy"