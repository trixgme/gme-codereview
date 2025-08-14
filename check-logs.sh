#!/bin/bash

echo "📊 Checking webhook logs..."
echo ""

echo "1. Recent webhook events:"
curl -s http://localhost:3002/logs/webhooks | jq '.logs[-5:]'

echo ""
echo "2. Recent errors:"
curl -s http://localhost:3002/logs/errors | jq '.logs[-3:]'

echo ""
echo "3. Stats:"
curl -s http://localhost:3002/logs/stats | jq