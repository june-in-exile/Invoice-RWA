#!/bin/bash

# Docker Compose Testing Script
# Tests the Docker container locally before ROFL deployment

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Invoice-RWA Docker Compose Test${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════${NC}\n"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}✗ Docker is not running${NC}"
    echo "Please start Docker Desktop or Docker Engine"
    exit 1
fi
echo -e "${GREEN}✓ Docker is running${NC}"

# Check if compose.yaml exists
if [ ! -f "compose.yaml" ]; then
    echo -e "${RED}✗ compose.yaml not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ compose.yaml found${NC}"

# Check if .env.docker exists
if [ ! -f ".env.docker" ]; then
    echo -e "${YELLOW}⚠ .env.docker not found${NC}"
    echo "Using default environment variables from .env"
fi

# Validate compose.yaml
echo -e "\n${BLUE}Validating compose.yaml...${NC}"
if docker compose config > /dev/null 2>&1; then
    echo -e "${GREEN}✓ compose.yaml is valid${NC}"
else
    echo -e "${RED}✗ compose.yaml has errors${NC}"
    docker compose config
    exit 1
fi

# Build the image
echo -e "\n${BLUE}Building Docker image...${NC}"
if [ -f ".env.docker" ]; then
    docker compose --env-file .env.docker build
else
    docker compose build
fi
echo -e "${GREEN}✓ Image built successfully${NC}"

# Start the container
echo -e "\n${BLUE}Starting container...${NC}"
if [ -f ".env.docker" ]; then
    docker compose --env-file .env.docker up -d
else
    docker compose up -d
fi

# Wait for container to be ready
echo -e "${BLUE}Waiting for container to be ready...${NC}"
sleep 5

# Check if container is running
if docker compose ps | grep -q "Up"; then
    echo -e "${GREEN}✓ Container is running${NC}"
else
    echo -e "${RED}✗ Container failed to start${NC}"
    docker compose logs
    docker compose down
    exit 1
fi

# Test health endpoint
echo -e "\n${BLUE}Testing health endpoint...${NC}"
for i in {1..10}; do
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Health check passed${NC}"
        curl -s http://localhost:3000/health | jq .
        break
    else
        if [ $i -eq 10 ]; then
            echo -e "${RED}✗ Health check failed after 10 attempts${NC}"
            echo -e "\n${BLUE}Container logs:${NC}"
            docker compose logs --tail=50
            docker compose down
            exit 1
        fi
        echo "Attempt $i/10..."
        sleep 2
    fi
done

# Show container info
echo -e "\n${BLUE}Container Information:${NC}"
docker compose ps

echo -e "\n${BLUE}Image Information:${NC}"
docker images | grep invoice-rwa-backend

# Check database
echo -e "\n${BLUE}Checking database...${NC}"
if docker compose exec invoice-rwa-backend test -f /rofl/storage/invoice_rwa.db; then
    DB_SIZE=$(docker compose exec invoice-rwa-backend stat -f%z /rofl/storage/invoice_rwa.db 2>/dev/null || \
              docker compose exec invoice-rwa-backend stat -c%s /rofl/storage/invoice_rwa.db 2>/dev/null)
    echo -e "${GREEN}✓ Database exists (${DB_SIZE} bytes)${NC}"

    # Show tables
    echo -e "\n${BLUE}Database tables:${NC}"
    docker compose exec invoice-rwa-backend sqlite3 /rofl/storage/invoice_rwa.db ".tables"
else
    echo -e "${YELLOW}⚠ Database not initialized yet${NC}"
fi

# Success
echo -e "\n${GREEN}════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✓ Docker container is running successfully!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════${NC}\n"

echo "Container is accessible at: http://localhost:3000"
echo ""
echo "Next steps:"
echo "  • Run API tests: ./test-api.sh --skip-invoice"
echo "  • View logs:     docker compose logs -f"
echo "  • Stop:          docker compose down"
echo "  • Stop & clean:  docker compose down -v"
echo ""
echo -e "${YELLOW}Note: Container is running in background (-d flag)${NC}"
