#!/bin/bash

# klub Database Setup Script
# This script sets up the PostgreSQL database for local development

set -e

echo "🚀 Setting up klub database..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed. Please install docker-compose first."
    exit 1
fi

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please update .env with your configuration"
fi

# Start PostgreSQL container
echo "🐘 Starting PostgreSQL container..."
docker-compose up -d postgres

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

# Check if database is healthy
docker-compose exec -T postgres pg_isready -U klubadmin -d klub_db

if [ $? -eq 0 ]; then
    echo "✅ PostgreSQL is ready!"
else
    echo "❌ PostgreSQL failed to start"
    exit 1
fi

# Run seed data (optional)
read -p "Do you want to load sample data? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🌱 Loading sample data..."
    docker-compose exec -T postgres psql -U klubadmin -d klub_db -f /docker-entrypoint-initdb.d/seed.sql
    echo "✅ Sample data loaded!"
fi

# Show connection info
echo ""
echo "🎉 Database setup complete!"
echo ""
echo "📊 Connection Details:"
echo "  Host: localhost"
echo "  Port: 5432"
echo "  Database: klub_db"
echo "  Username: klubadmin"
echo "  Password: klubpass123"
echo ""
echo "🔗 Connection string:"
echo "  postgresql://klubadmin:klubpass123@localhost:5432/klub_db"
echo ""
echo "💡 Tips:"
echo "  - Run 'docker-compose up -d' to start the database"
echo "  - Run 'docker-compose down' to stop the database"
echo "  - Run 'docker-compose logs postgres' to view logs"
echo "  - Run 'docker-compose exec postgres psql -U klubadmin -d klub_db' to access psql"
echo ""
echo "📚 Next steps:"
echo "  1. Install dependencies: cd klub && npm install"
echo "  2. Start the API: npm run api:dev"
echo "  3. Visit http://localhost:3000 to see the health check"