#!/bin/bash

###############################################################################
# TeamSync Polyglot - Ollama Deployment Script
#
# This script automates the deployment of TeamSync Polyglot with local
# TranslateGemma 4B translation capabilities using Ollama.
#
# Usage:
#   ./scripts/deploy-ollama.sh [mode]
#
# Modes:
#   dev      - Development deployment (CPU-only, minimal resources)
#   prod     - Production deployment (GPU-enabled, full resources)
#   test     - Test deployment (verify Ollama connectivity)
#   cleanup  - Remove all containers and volumes
#
# Prerequisites:
#   - Docker Engine 20.10+
#   - Docker Compose V2
#   - 16GB+ RAM
#   - 20GB+ disk space
#   - NVIDIA Docker runtime (for GPU mode)
#
# Author: Manus AI
# Version: 1.0
###############################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.ollama.yml"
ENV_FILE="$PROJECT_ROOT/.env"

# Default mode
MODE="${1:-dev}"

###############################################################################
# Helper Functions
###############################################################################

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker Engine 20.10+"
        exit 1
    fi
    
    # Check Docker Compose
    if ! docker compose version &> /dev/null; then
        log_error "Docker Compose V2 is not installed"
        exit 1
    fi
    
    # Check available RAM
    TOTAL_RAM=$(free -g | awk '/^Mem:/{print $2}')
    if [ "$TOTAL_RAM" -lt 16 ]; then
        log_warning "System has less than 16GB RAM. Performance may be degraded."
    fi
    
    # Check available disk space
    AVAILABLE_SPACE=$(df -BG "$PROJECT_ROOT" | awk 'NR==2 {print $4}' | sed 's/G//')
    if [ "$AVAILABLE_SPACE" -lt 20 ]; then
        log_warning "Less than 20GB disk space available. Model download may fail."
    fi
    
    # Check GPU availability (for prod mode)
    if [ "$MODE" = "prod" ]; then
        if ! command -v nvidia-smi &> /dev/null; then
            log_warning "NVIDIA GPU not detected. Falling back to CPU mode."
            MODE="dev"
        else
            log_success "NVIDIA GPU detected: $(nvidia-smi --query-gpu=name --format=csv,noheader | head -n1)"
        fi
    fi
    
    log_success "Prerequisites check completed"
}

check_env_file() {
    log_info "Checking environment configuration..."
    
    if [ ! -f "$ENV_FILE" ]; then
        log_warning ".env file not found. Creating from template..."
        cat > "$ENV_FILE" << 'EOF'
# Translation Configuration
TRANSLATION_MODE=local
OLLAMA_HOST=http://ollama:11434
OLLAMA_MODEL=translategemma:4b
ENABLE_CLOUD_FALLBACK=true

# Google Gemini API (for fallback)
GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here

# Database Configuration
DATABASE_URL=mysql://user:password@localhost:3306/teamsync

# Authentication
JWT_SECRET=your_jwt_secret_here
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im

# Application Settings
NODE_ENV=production
PORT=3000
EOF
        log_warning "Please update .env file with your configuration"
        exit 1
    fi
    
    log_success "Environment file found"
}

deploy_dev() {
    log_info "Deploying in DEVELOPMENT mode (CPU-only)..."
    
    # Start services without GPU
    docker compose -f "$COMPOSE_FILE" up -d ollama app
    
    # Wait for Ollama to be ready
    log_info "Waiting for Ollama service to start..."
    sleep 10
    
    # Pull TranslateGemma model
    log_info "Pulling TranslateGemma 4B model (this may take 5-10 minutes)..."
    docker exec teamsync-ollama ollama pull translategemma:4b
    
    # Verify model installation
    log_info "Verifying model installation..."
    docker exec teamsync-ollama ollama list
    
    log_success "Development deployment completed!"
    log_info "Application available at: http://localhost:3000"
    log_info "Ollama API available at: http://localhost:11434"
}

deploy_prod() {
    log_info "Deploying in PRODUCTION mode (GPU-enabled)..."
    
    # Modify compose file to enable GPU
    log_info "Configuring GPU acceleration..."
    
    # Start services with GPU support
    docker compose -f "$COMPOSE_FILE" up -d
    
    # Wait for services
    log_info "Waiting for services to start..."
    sleep 15
    
    # Pull model
    log_info "Pulling TranslateGemma 4B model..."
    docker exec teamsync-ollama ollama pull translategemma:4b
    
    # Verify GPU usage
    log_info "Verifying GPU acceleration..."
    docker exec teamsync-ollama nvidia-smi || log_warning "GPU verification failed"
    
    log_success "Production deployment completed!"
    log_info "Application available at: http://localhost:3000"
}

test_deployment() {
    log_info "Testing Ollama connectivity..."
    
    # Check if Ollama is running
    if ! docker ps | grep -q teamsync-ollama; then
        log_error "Ollama container is not running"
        exit 1
    fi
    
    # Test Ollama API
    log_info "Testing Ollama API endpoint..."
    RESPONSE=$(curl -s http://localhost:11434/api/tags || echo "FAILED")
    
    if [ "$RESPONSE" = "FAILED" ]; then
        log_error "Ollama API is not responding"
        exit 1
    fi
    
    # Check if TranslateGemma is installed
    if echo "$RESPONSE" | grep -q "translategemma"; then
        log_success "TranslateGemma model is installed"
    else
        log_warning "TranslateGemma model not found. Run: docker exec teamsync-ollama ollama pull translategemma:4b"
    fi
    
    # Test translation
    log_info "Testing translation functionality..."
    TEST_RESULT=$(docker exec teamsync-ollama ollama run translategemma:4b "Translate to English: Bonjour le monde" || echo "FAILED")
    
    if [ "$TEST_RESULT" != "FAILED" ]; then
        log_success "Translation test passed: $TEST_RESULT"
    else
        log_error "Translation test failed"
        exit 1
    fi
    
    log_success "All tests passed!"
}

cleanup() {
    log_warning "Cleaning up deployment..."
    
    read -p "This will remove all containers and volumes. Continue? (y/N) " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Stopping containers..."
        docker compose -f "$COMPOSE_FILE" down -v
        
        log_info "Removing images..."
        docker rmi ollama/ollama:latest || true
        
        log_success "Cleanup completed"
    else
        log_info "Cleanup cancelled"
    fi
}

show_logs() {
    log_info "Showing application logs (Ctrl+C to exit)..."
    docker compose -f "$COMPOSE_FILE" logs -f app
}

show_status() {
    log_info "Deployment Status:"
    echo ""
    docker compose -f "$COMPOSE_FILE" ps
    echo ""
    
    log_info "Resource Usage:"
    docker stats --no-stream teamsync-ollama teamsync-polyglot || true
    echo ""
    
    log_info "Installed Models:"
    docker exec teamsync-ollama ollama list || log_warning "Ollama not running"
}

###############################################################################
# Main Execution
###############################################################################

main() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║         TeamSync Polyglot - Ollama Deployment             ║"
    echo "║              Offline-First Translation Platform            ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    
    case "$MODE" in
        dev)
            check_prerequisites
            check_env_file
            deploy_dev
            ;;
        prod)
            check_prerequisites
            check_env_file
            deploy_prod
            ;;
        test)
            test_deployment
            ;;
        cleanup)
            cleanup
            ;;
        logs)
            show_logs
            ;;
        status)
            show_status
            ;;
        *)
            log_error "Invalid mode: $MODE"
            echo ""
            echo "Usage: $0 [mode]"
            echo ""
            echo "Available modes:"
            echo "  dev      - Development deployment (CPU-only)"
            echo "  prod     - Production deployment (GPU-enabled)"
            echo "  test     - Test Ollama connectivity"
            echo "  cleanup  - Remove all containers and volumes"
            echo "  logs     - Show application logs"
            echo "  status   - Show deployment status"
            echo ""
            exit 1
            ;;
    esac
    
    echo ""
    log_info "Deployment mode: $MODE"
    log_info "For logs: docker compose -f $COMPOSE_FILE logs -f"
    log_info "For status: docker compose -f $COMPOSE_FILE ps"
    echo ""
}

# Run main function
main
