#!/bin/bash

# BeaCompanion Docker Helper Script
# This script provides easy commands for Docker operations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Function to check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
}

# Function to build the application
build() {
    print_info "Building BeaCompanion Docker image..."
    docker build -f Dockerfile.optimized -t beacompanion:latest .
    print_success "Build completed successfully!"
}

# Function to run the application
run() {
    print_info "Starting BeaCompanion application..."
    docker-compose up -d
    print_success "Application started! Check http://localhost:4000"
}

# Function to run with local database
run_local() {
    print_info "Starting BeaCompanion with local database..."
    COMPOSE_PROFILES=local docker-compose up -d
    print_success "Application started with local database!"
}

# Function to run in production mode
run_production() {
    print_info "Starting BeaCompanion in production mode..."
    COMPOSE_PROFILES=production docker-compose up -d
    print_success "Application started in production mode!"
}

# Function to stop the application
stop() {
    print_info "Stopping BeaCompanion application..."
    docker-compose down
    print_success "Application stopped!"
}

# Function to view logs
logs() {
    print_info "Showing application logs..."
    docker-compose logs -f beacompanion-app
}

# Function to clean up
cleanup() {
    print_warning "This will remove all containers, volumes, and images. Are you sure? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        print_info "Cleaning up Docker resources..."
        docker-compose down -v --rmi all
        docker system prune -f
        print_success "Cleanup completed!"
    else
        print_info "Cleanup cancelled."
    fi
}

# Function to show status
status() {
    print_info "BeaCompanion Docker Status:"
    docker-compose ps
}

# Function to test the application
test() {
    print_info "Testing BeaCompanion ML endpoints..."
    
    # Wait for application to be ready
    sleep 15
    
    # Test health endpoint
    print_info "Testing ML health endpoint..."
    if curl -f http://localhost:4000/api/ml/test > /dev/null 2>&1; then
        print_success "Health check passed!"
    else
        print_error "Health check failed!"
        return 1
    fi
    
    print_success "All tests passed!"
}

# Function to test MediaPipe specifically
test_mediapipe() {
    print_info "Testing MediaPipe in Docker container..."
    
    # Start the MediaPipe test service
    COMPOSE_PROFILES=test docker-compose up --abort-on-container-exit mediapipe-test
    
    if [ $? -eq 0 ]; then
        print_success "MediaPipe test passed!"
    else
        print_error "MediaPipe test failed!"
        return 1
    fi
}

# Main script logic
case "$1" in
    build)
        check_docker
        build
        ;;
    run)
        check_docker
        run
        ;;
    run-local)
        check_docker
        run_local
        ;;
    run-production)
        check_docker
        run_production
        ;;
    stop)
        check_docker
        stop
        ;;
    logs)
        check_docker
        logs
        ;;
    status)
        check_docker
        status
        ;;
    test)
        check_docker
        test
        ;;
    test-mediapipe)
        check_docker
        test_mediapipe
        ;;
    cleanup)
        check_docker
        cleanup
        ;;
    *)
        echo "BeaCompanion Docker Helper"
        echo "Usage: $0 {build|run|run-local|run-production|stop|logs|status|test|test-mediapipe|cleanup}"
        echo ""
        echo "Commands:"
        echo "  build           - Build the Docker image"
        echo "  run             - Start the application"
        echo "  run-local       - Start with local database"
        echo "  run-production  - Start in production mode"
        echo "  stop            - Stop the application"
        echo "  logs            - View application logs"
        echo "  status          - Show container status"
        echo "  test            - Test the application endpoints"
        echo "  test-mediapipe  - Test MediaPipe functionality in Docker"
        echo "  cleanup         - Remove all Docker resources"
        exit 1
        ;;
esac 