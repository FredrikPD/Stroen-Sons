#!/bin/bash

# Extract DATABASE_URL_PROD from .env
PROD_URL=$(grep "^DATABASE_URL_PROD=" .env | cut -d '=' -f2- | sed 's/^"//;s/"$//')

# Check if PROD_URL is set
if [ -n "$PROD_URL" ]; then
    echo "Using DATABASE_URL_PROD from .env"
    DATABASE_URL="$PROD_URL" npx prisma db push
else
    echo "DATABASE_URL_PROD not found in .env"
    echo "Please enter your PRODUCTION database connection string manually:"
    read URL
    if [ -z "$URL" ]; then
        echo "Error: URL is required."
        exit 1
    fi
    DATABASE_URL="$URL" npx prisma db push
fi
