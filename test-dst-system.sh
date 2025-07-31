#!/bin/bash

# Test script for DST automation system
# Replace YOUR_APP_URL with your actual Vercel app URL

APP_URL="https://your-app-url.vercel.app"

echo "🧪 Testing DST Automation System"
echo "================================="
echo ""

echo "1. Testing timezone calculations..."
curl -s "$APP_URL/api/alerts/test-timezone" | jq '.success, .summary.message, .summary.cronExpression' 2>/dev/null || echo "❌ Timezone test failed"
echo ""

echo "2. Checking current DST status..."
curl -s "$APP_URL/api/alerts/dst-notification" | jq '.success, .currentTimezone, .nextTransition.description' 2>/dev/null || echo "❌ DST status check failed"
echo ""

echo "3. Getting timezone info..."
curl -s "$APP_URL/api/alerts/timezone-info" | jq '.success, .timezone.cronSchedule, .timezone.description' 2>/dev/null || echo "❌ Timezone info failed"
echo ""

echo "4. Testing cron job (requires CRON_SECRET)..."
echo "   Manual test: curl -H 'Authorization: Bearer YOUR_CRON_SECRET' $APP_URL/api/alerts/test-cron"
echo ""

echo "✅ DST system tests complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Replace YOUR_APP_URL with your actual Vercel URL"
echo "   2. Set CRON_SECRET environment variable in Vercel"
echo "   3. Test the cron endpoints manually"
echo "   4. Verify Monday alerts work at 9 AM Eastern"
