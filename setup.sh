#!/bin/bash

# CampusPool - Automated Setup Script
# This script helps you set up CampusPool quickly

set -e  # Exit on error

echo "🚗 CampusPool Setup Script"
echo "=========================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Check if Node.js is installed
print_info "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version must be 18 or higher. Current: $(node -v)"
    exit 1
fi
print_success "Node.js $(node -v) detected"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
fi
print_success "npm $(npm -v) detected"

# Install dependencies
print_info "Installing dependencies..."
npm install
print_success "Dependencies installed"

# Check if .env file exists
if [ ! -f .env ]; then
    print_warning ".env file not found. Creating from .env.example..."
    cp .env.example .env
    print_success ".env file created"
    print_warning "Please edit .env file with your actual credentials before continuing!"
    
    # Ask if user wants to continue or edit .env first
    read -p "Do you want to edit .env now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ${EDITOR:-nano} .env
    else
        print_warning "Remember to edit .env file before running the app!"
        exit 0
    fi
else
    print_success ".env file found"
fi

# Check if DATABASE_URL is set
if grep -q "postgresql://user:password@localhost" .env; then
    print_warning "DATABASE_URL is still using default value. Please update it!"
    read -p "Do you want to edit .env now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ${EDITOR:-nano} .env
    fi
fi

# Generate Prisma client
print_info "Generating Prisma client..."
npx prisma generate
print_success "Prisma client generated"

# Ask if user wants to push schema to database
echo ""
print_info "Do you want to push the database schema now?"
print_warning "Make sure your database is running and DATABASE_URL is correct!"
read -p "Push schema to database? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Pushing schema to database..."
    if npx prisma db push; then
        print_success "Database schema pushed successfully"
    else
        print_error "Failed to push schema. Check your DATABASE_URL and database connection."
        print_info "You can run 'npx prisma db push' manually later."
    fi
else
    print_warning "Skipping database setup. Run 'npx prisma db push' when ready."
fi

# Final checks
echo ""
echo "=========================="
echo "📋 Setup Checklist:"
echo "=========================="

# Check if all required env vars are set
check_env_var() {
    local var_name=$1
    if grep -q "^${var_name}=" .env && ! grep -q "^${var_name}=.*xxxxx" .env; then
        print_success "$var_name is set"
        return 0
    else
        print_warning "$var_name is not configured"
        return 1
    fi
}

check_env_var "DATABASE_URL"
check_env_var "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
check_env_var "CLERK_SECRET_KEY"
check_env_var "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"
check_env_var "GOOGLE_MAPS_API_KEY"

echo ""
echo "=========================="
print_success "Setup complete!"
echo "=========================="
echo ""
print_info "Next steps:"
echo "  1. Make sure all environment variables are set correctly"
echo "  2. Enable PostGIS extension in your database:"
echo "     psql -d campuspool -c 'CREATE EXTENSION postgis;'"
echo "  3. Configure Clerk to allow only @iiit.ac.in emails"
echo "  4. Enable required Google Maps APIs"
echo "  5. Run: npm run dev"
echo ""
print_info "For detailed setup instructions, see SETUP_GUIDE.md"
echo ""

# Ask if user wants to start dev server
read -p "Do you want to start the development server now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Starting development server..."
    npm run dev
fi
