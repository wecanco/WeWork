#!/bin/bash
set -e

echo "🚀 Starting application with database initialization..."

# Function to wait for database to be ready
wait_for_db() {
    echo "⏳ Waiting for database to be ready..."
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if python -c "
import asyncio
from src.db.base import engine
from sqlalchemy import text

async def check_db():
    try:
        async with engine.connect() as conn:
            await conn.execute(text('SELECT 1'))
        print('Database is ready!')
        return True
    except Exception as e:
        print(f'Database not ready: {e}')
        return False

asyncio.run(check_db())
" 2>/dev/null; then
            echo "✅ Database is ready!"
            return 0
        fi
        
        echo "Attempt $attempt/$max_attempts - waiting for database..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo "❌ Database connection timeout after $max_attempts attempts"
    return 1
}

# Function to create database tables
create_tables() {
    echo "🗄️ Creating database tables..."
    
    if python -m src.db.create_tables; then
        echo "✅ Database tables created successfully!"
        return 0
    else
        echo "❌ Failed to create database tables!"
        return 1
    fi
}

# Main execution
echo "🔍 Checking database connection..."
if wait_for_db; then
    echo "🔧 Initializing database schema..."
    if create_tables; then
        echo "🎉 Database initialization complete!"
        echo "▶️ Starting main application: $@"
        exec "$@"
    else
        echo "❌ Database initialization failed!"
        exit 1
    fi
else
    echo "❌ Cannot connect to database!"
    exit 1
fi