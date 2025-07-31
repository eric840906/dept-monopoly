#!/bin/bash

# Load Testing Runner for Dept-Monopoly
# This script starts the server in load test mode and runs the load tests

set -e

echo "🚀 Starting Dept-Monopoly Load Testing"
echo "======================================"

# Check if .env.loadtest exists
if [ ! -f ".env.loadtest" ]; then
    echo "❌ .env.loadtest file not found!"
    echo "Please create .env.loadtest with load testing configuration"
    exit 1
fi

# Load environment variables for testing
export $(cat .env.loadtest | grep -v '^#' | xargs)

echo "📋 Load Test Configuration:"
echo "   LOAD_TEST_MODE: $LOAD_TEST_MODE"
echo "   CONNECTION_LIMIT_PER_IP: $CONNECTION_LIMIT_PER_IP"
echo "   SOCKET_PING_TIMEOUT: $SOCKET_PING_TIMEOUT"
echo "   Max Players Target: 120"
echo ""

# Start the server in background
echo "🖥️  Starting server in load test mode..."
npm start &
SERVER_PID=$!

# Wait for server to start
echo "⏳ Waiting for server to initialize..."
sleep 5

# Check if server is running
if ! curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "❌ Server failed to start or health check failed"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi

echo "✅ Server is running and healthy"
echo ""

# Run the load test
echo "⚡ Starting load test with 120 concurrent players..."
cd load-testing
node scripts/socket-load-tester.js \
    --serverUrl http://localhost:3000 \
    --maxPlayers 120 \
    --rampUpTime 30000 \
    --testDuration 300000 \
    --reportInterval 5000

# Cleanup
echo ""
echo "🧹 Cleaning up..."
kill $SERVER_PID 2>/dev/null || true
wait $SERVER_PID 2>/dev/null || true

echo "✅ Load test completed!"