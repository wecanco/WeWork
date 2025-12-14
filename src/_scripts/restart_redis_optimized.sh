#!/bin/bash

# Redis Optimization Restart Script
# This script restarts Redis with the new optimized configuration

echo "🔧 Starting Redis Optimization Process..."
echo "=========================================="

# Function to check if Redis is running
check_redis() {
    if docker compose -f docker-compose.redis.yml ps | grep -q "Up"; then
        echo "✅ Redis is currently running"
        return 0
    else
        echo "ℹ️  Redis is not running"
        return 1
    fi
}

# Function to stop Redis
stop_redis() {
    echo "🛑 Stopping Redis service..."
    docker compose -f docker-compose.redis.yml down
    
    if [ $? -eq 0 ]; then
        echo "✅ Redis stopped successfully"
        return 0
    else
        echo "❌ Failed to stop Redis"
        return 1
    fi
}

# Function to start Redis
start_redis() {
    echo "🚀 Starting Redis with optimized configuration..."
    docker compose -f docker-compose.redis.yml up -d
    
    if [ $? -eq 0 ]; then
        echo "✅ Redis started successfully"
        return 0
    else
        echo "❌ Failed to start Redis"
        return 1
    fi
}

# Function to verify Redis is working
verify_redis() {
    echo "🔍 Verifying Redis functionality..."
    sleep 3
    
    if docker compose -f docker-compose.redis.yml exec redis redis-cli ping > /dev/null 2>&1; then
        echo "✅ Redis is responding to PING"
        
        # Check memory configuration
        memory_info=$(docker compose -f docker-compose.redis.yml exec redis redis-cli info memory | grep "maxmemory:" | cut -d: -f2)
        echo "📊 Max Memory Configuration: $memory_info bytes"
        
        # Check AOF configuration
        aof_info=$(docker compose -f docker-compose.redis.yml exec redis redis-cli config get appendonly | grep -A1 appendonly | tail -1)
        echo "📝 AOF Configuration: $aof_info"
        
        return 0
    else
        echo "❌ Redis is not responding"
        return 1
    fi
}

# Function to show monitoring info
show_monitoring_info() {
    echo ""
    echo "📈 Redis Optimization Complete!"
    echo "==============================="
    echo ""
    echo "🔍 To monitor Redis performance, run:"
    echo "   python scripts/redis_monitor.py"
    echo ""
    echo "🧹 To run cleanup and monitoring:"
    echo "   python scripts/redis_monitor.py --cleanup"
    echo ""
    echo "📊 Key improvements applied:"
    echo "   • Memory increased from 256MB to 1GB"
    echo "   • Connection pooling implemented"
    echo "   • Event throttling enabled"
    echo "   • Automatic cleanup configured"
    echo "   • AOF optimization enabled"
    echo ""
    echo "⚠️  If you still experience issues, check:"
    echo "   • Memory usage: python scripts/redis_monitor.py"
    echo "   • Active connections and performance metrics"
    echo "   • Consider increasing memory if needed"
    echo ""
}

# Main execution
main() {
    echo "Starting Redis optimization process..."
    
    # Check current status
    was_running=false
    if check_redis; then
        was_running=true
    fi
    
    # Stop Redis if running
    if [ "$was_running" = true ]; then
        if ! stop_redis; then
            echo "❌ Failed to stop Redis. Please check manually."
            exit 1
        fi
        
        echo "⏳ Waiting 2 seconds before restart..."
        sleep 2
    fi
    
    # Start Redis with new configuration
    if ! start_redis; then
        echo "❌ Failed to start Redis. Please check the configuration."
        exit 1
    fi
    
    # Verify functionality
    if ! verify_redis; then
        echo "❌ Redis verification failed. Please check logs."
        echo "📋 Check logs with: docker compose -f docker-compose.redis.yml logs"
        exit 1
    fi
    
    # Show monitoring information
    show_monitoring_info
}

# Handle script interruption
trap 'echo ""; echo "⚠️  Script interrupted by user"; exit 1' INT

# Run main function
main

echo "🎉 Redis optimization completed successfully!"