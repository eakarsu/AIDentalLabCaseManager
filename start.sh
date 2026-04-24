#!/bin/bash

# ============================================
# AI Dental Lab Case Manager - Start Script
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
echo "  ╔══════════════════════════════════════════════╗"
echo "  ║    🦷 AI Dental Lab Case Manager             ║"
echo "  ║    Starting Application...                   ║"
echo "  ╚══════════════════════════════════════════════╝"
echo -e "${NC}"

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Load environment variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
  echo -e "${GREEN}✓ Environment variables loaded${NC}"
else
  echo -e "${RED}✗ .env file not found! Please create one.${NC}"
  exit 1
fi

BACKEND_PORT=${BACKEND_PORT:-4000}
FRONTEND_PORT=${FRONTEND_PORT:-3000}

# ============================================
# Clean up used ports
# ============================================
echo -e "${YELLOW}→ Cleaning up ports ${BACKEND_PORT} and ${FRONTEND_PORT}...${NC}"

cleanup_port() {
  local port=$1
  local pids=$(lsof -ti :$port 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo -e "${YELLOW}  Killing processes on port $port: $pids${NC}"
    echo "$pids" | xargs kill -9 2>/dev/null || true
    sleep 1
  fi
}

cleanup_port $BACKEND_PORT
cleanup_port $FRONTEND_PORT
echo -e "${GREEN}✓ Ports cleaned${NC}"

# ============================================
# Check and start PostgreSQL
# ============================================
echo -e "${YELLOW}→ Checking PostgreSQL...${NC}"

if command -v pg_isready &> /dev/null; then
  if pg_isready -q 2>/dev/null; then
    echo -e "${GREEN}✓ PostgreSQL is running${NC}"
  else
    echo -e "${YELLOW}  Starting PostgreSQL...${NC}"
    if command -v brew &> /dev/null; then
      brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || true
    fi
    sleep 2
    if pg_isready -q 2>/dev/null; then
      echo -e "${GREEN}✓ PostgreSQL started${NC}"
    else
      echo -e "${RED}✗ Could not start PostgreSQL. Please start it manually.${NC}"
      exit 1
    fi
  fi
else
  echo -e "${YELLOW}  pg_isready not found, assuming PostgreSQL is running${NC}"
fi

# ============================================
# Create database if not exists
# ============================================
echo -e "${YELLOW}→ Setting up database...${NC}"

DB_NAME="dental_lab_manager"
if psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw $DB_NAME; then
  echo -e "${GREEN}✓ Database '$DB_NAME' exists${NC}"
else
  echo -e "${YELLOW}  Creating database '$DB_NAME'...${NC}"
  createdb $DB_NAME 2>/dev/null || psql -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || true
  echo -e "${GREEN}✓ Database created${NC}"
fi

# ============================================
# Install dependencies
# ============================================
echo -e "${YELLOW}→ Installing backend dependencies...${NC}"
cd "$SCRIPT_DIR/backend"
npm install --silent 2>&1 | tail -1
echo -e "${GREEN}✓ Backend dependencies installed${NC}"

echo -e "${YELLOW}→ Installing frontend dependencies...${NC}"
cd "$SCRIPT_DIR/frontend"
npm install --silent 2>&1 | tail -1
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"

cd "$SCRIPT_DIR"

# ============================================
# Seed database
# ============================================
echo -e "${YELLOW}→ Seeding database with sample data...${NC}"
cd "$SCRIPT_DIR/backend"
node seed.js
echo -e "${GREEN}✓ Database seeded${NC}"

cd "$SCRIPT_DIR"

# ============================================
# Cleanup function
# ============================================
cleanup() {
  echo -e "\n${YELLOW}→ Shutting down...${NC}"
  cleanup_port $BACKEND_PORT
  cleanup_port $FRONTEND_PORT
  echo -e "${GREEN}✓ Application stopped${NC}"
  exit 0
}

trap cleanup SIGINT SIGTERM

# ============================================
# Start backend with auto-reload (--watch)
# ============================================
echo -e "${YELLOW}→ Starting backend on port ${BACKEND_PORT} (with auto-reload)...${NC}"
cd "$SCRIPT_DIR/backend"
node --watch server.js &
BACKEND_PID=$!
sleep 2

if kill -0 $BACKEND_PID 2>/dev/null; then
  echo -e "${GREEN}✓ Backend running (PID: $BACKEND_PID)${NC}"
else
  echo -e "${RED}✗ Backend failed to start${NC}"
  exit 1
fi

# ============================================
# Start frontend with HMR (Vite)
# ============================================
echo -e "${YELLOW}→ Starting frontend on port ${FRONTEND_PORT} (with HMR)...${NC}"
cd "$SCRIPT_DIR/frontend"
npx vite --port $FRONTEND_PORT &
FRONTEND_PID=$!
sleep 3

echo -e "${CYAN}"
echo "  ╔══════════════════════════════════════════════╗"
echo "  ║    🦷 Application Ready!                     ║"
echo "  ║                                              ║"
echo "  ║    Frontend: http://localhost:${FRONTEND_PORT}           ║"
echo "  ║    Backend:  http://localhost:${BACKEND_PORT}           ║"
echo "  ║                                              ║"
echo "  ║    Login: admin@dentallab.com / admin123     ║"
echo "  ║                                              ║"
echo "  ║    Press Ctrl+C to stop                      ║"
echo "  ╚══════════════════════════════════════════════╝"
echo -e "${NC}"

# Wait for both processes
wait
