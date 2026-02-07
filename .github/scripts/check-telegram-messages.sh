#!/bin/bash

# Lightweight script to check if there are new Telegram messages
# This runs BEFORE npm ci to save GitHub Actions minutes

set -e

echo "🔍 Checking for new Telegram messages..."

# Get the last update ID from the queue file
QUEUE_FILE="queue/incoming.json"
if [ -f "$QUEUE_FILE" ]; then
  LAST_UPDATE_ID=$(jq -r '.last_update_id // 0' "$QUEUE_FILE")
else
  LAST_UPDATE_ID=0
fi

echo "📊 Last processed update_id: $LAST_UPDATE_ID"

# Check Telegram for new updates using curl (no dependencies needed)
OFFSET=$((LAST_UPDATE_ID + 1))
API_URL="https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates"

RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"offset\": $OFFSET, \"timeout\": 0, \"allowed_updates\": [\"message\"]}")

# Check if the API call was successful
if ! echo "$RESPONSE" | jq -e '.ok == true' > /dev/null 2>&1; then
  echo "❌ Telegram API error: $(echo "$RESPONSE" | jq -r '.description // "Unknown error"')"
  exit 1
fi

# Count the number of updates
UPDATE_COUNT=$(echo "$RESPONSE" | jq '.result | length')

echo "📨 Found $UPDATE_COUNT new update(s)"

if [ "$UPDATE_COUNT" -gt 0 ]; then
  echo "✅ New messages detected - proceeding with processing"
  echo "has_messages=true" >> $GITHUB_OUTPUT
else
  echo "✅ No new messages - skipping processing"
  echo "has_messages=false" >> $GITHUB_OUTPUT
fi
