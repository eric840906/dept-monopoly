#!/bin/bash

# Docker Deployment Script for Dept Monopoly Game
# This script follows company deployment patterns for container builds

set -e

echo "🎮 Starting Dept Monopoly Docker Deployment..."

# Configuration
IMAGE_NAME="dept-monopoly"
IMAGE_TAG="${1:-latest}"
CONTAINER_NAME="dept-monopoly-app"
ENV_FILE="${2:-.env.docker}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if environment file exists
if [ ! -f "$ENV_FILE" ]; then
    log_error "Environment file $ENV_FILE not found!"
    log_info "Please create $ENV_FILE based on .env.docker template"
    exit 1
fi

# Validate required environment variables
log_info "Validating environment configuration..."
source "$ENV_FILE"

if [ -z "$HOST_TOKEN" ] || [ "$HOST_TOKEN" = "CHANGE_ME_IN_PRODUCTION_RANDOM_64_CHAR_STRING_HERE_12345678" ]; then
    log_error "HOST_TOKEN must be set to a secure random value in $ENV_FILE"
    exit 1
fi

if [ -z "$ALLOWED_ORIGINS" ]; then
    log_error "ALLOWED_ORIGINS must be set in $ENV_FILE"
    exit 1
fi

log_info "Environment validation passed ✅"

# Stop and remove existing container if it exists
if docker ps -a | grep -q "$CONTAINER_NAME"; then
    log_info "Stopping existing container..."
    docker stop "$CONTAINER_NAME" || true
    docker rm "$CONTAINER_NAME" || true
fi

# Build the Docker image
log_info "Building Docker image: $IMAGE_NAME:$IMAGE_TAG"
docker build \
    --platform linux/amd64 \
    -t "$IMAGE_NAME:$IMAGE_TAG" \
    -f Dockerfile \
    .

if [ $? -ne 0 ]; then
    log_error "Docker build failed!"
    exit 1
fi

log_info "Docker image built successfully ✅"

# Create logs directory if it doesn't exist
mkdir -p logs

# Run the container using docker-compose
log_info "Starting application with docker-compose..."
ENV_FILE="$ENV_FILE" docker-compose up -d

if [ $? -ne 0 ]; then
    log_error "Failed to start container with docker-compose!"
    exit 1
fi

# Wait for container to be healthy
log_info "Waiting for application to be ready..."
sleep 10

# Check if container is running
if docker-compose ps | grep -q "Up"; then
    log_info "🎉 Deployment successful!"
    log_info "Application is running at:"
    log_info "  • Local: http://localhost:${PORT:-3000}"
    log_info "  • Mobile: http://localhost:${PORT:-3000}/mobile"
    
    # Show container status
    docker-compose ps
    
    # Show logs
    echo ""
    log_info "Recent logs:"
    docker-compose logs --tail=20 dept-monopoly
else
    log_error "Container failed to start properly"
    log_info "Checking logs..."
    docker-compose logs dept-monopoly
    exit 1
fi

echo ""
log_info "Deployment complete! 🚀"
log_info "Use 'docker-compose logs -f dept-monopoly' to follow logs"
log_info "Use 'docker-compose down' to stop the application"