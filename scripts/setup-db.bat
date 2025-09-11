@echo off
REM klub Database Setup Script for Windows
REM This script sets up the PostgreSQL database for local development

echo 🚀 Setting up klub database...

REM Check if Docker is installed
docker --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Docker is not installed. Please install Docker Desktop first.
    pause
    exit /b 1
)

REM Check if docker-compose is installed
docker-compose --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ docker-compose is not installed. Please install Docker Desktop first.
    pause
    exit /b 1
)

REM Copy environment file if it doesn't exist
if not exist .env (
    echo 📝 Creating .env file from template...
    copy .env.example .env
    echo ⚠️  Please update .env with your configuration
)

REM Start PostgreSQL container
echo 🐘 Starting PostgreSQL container...
docker-compose up -d postgres

REM Wait for PostgreSQL to be ready
echo ⏳ Waiting for PostgreSQL to be ready...
timeout /t 10 /nobreak >nul

REM Check if database is healthy
docker-compose exec -T postgres pg_isready -U klubadmin -d klub_db
if %ERRORLEVEL% EQU 0 (
    echo ✅ PostgreSQL is ready!
) else (
    echo ❌ PostgreSQL failed to start
    pause
    exit /b 1
)

REM Ask about seed data
set /p LOAD_SEED="Do you want to load sample data? (y/n): "
if /i "%LOAD_SEED%"=="y" (
    echo 🌱 Loading sample data...
    docker cp klub/infrastructure/database/seed.sql klub-postgres:/tmp/seed.sql
    docker-compose exec -T postgres psql -U klubadmin -d klub_db -f /tmp/seed.sql
    echo ✅ Sample data loaded!
)

REM Show connection info
echo.
echo 🎉 Database setup complete!
echo.
echo 📊 Connection Details:
echo   Host: localhost
echo   Port: 5432
echo   Database: klub_db
echo   Username: klubadmin
echo   Password: klubpass123
echo.
echo 🔗 Connection string:
echo   postgresql://klubadmin:klubpass123@localhost:5432/klub_db
echo.
echo 💡 Tips:
echo   - Run 'docker-compose up -d' to start the database
echo   - Run 'docker-compose down' to stop the database
echo   - Run 'docker-compose logs postgres' to view logs
echo   - Run 'docker-compose exec postgres psql -U klubadmin -d klub_db' to access psql
echo.
echo 📚 Next steps:
echo   1. Install dependencies: cd klub ^&^& npm install
echo   2. Start the API: npm run api:dev
echo   3. Visit http://localhost:3000 to see the health check

pause