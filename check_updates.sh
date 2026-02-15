#!/bin/bash
# Early check for Telegram updates before installing dependencies
# Exits with 0 if updates exist, 1 if no updates

set -e

echo "========================================"
echo "GitButler Early Update Check"
echo "Time: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo "========================================"

# Check required environment variables
if [ -z "$TELEGRAM_TOKEN" ]; then
    echo "ERROR: TELEGRAM_TOKEN not set"
    exit 1
fi

# Set notification user ID (defaults to 3181434 if not provided)
NOTIFICATION_USER_ID="${NOTIFICATION_USER_ID:-3181434}"

# Always send "Action running" notification
echo ""
echo "Sending 'Action running' notification to user ${NOTIFICATION_USER_ID}..."
NOTIFICATION_RESPONSE=$(curl -s -f -X POST "https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage" \
    -H "Content-Type: application/json" \
    -d "{\"chat_id\":\"${NOTIFICATION_USER_ID}\",\"text\":\"Action running\"}")

if echo "$NOTIFICATION_RESPONSE" | grep -q '"ok":true'; then
    echo "✓ Notification sent successfully"
else
    echo "⚠ Warning: Failed to send notification"
    echo "Response: $NOTIFICATION_RESPONSE"
fi

# Read last processed update_id from state.json
STATE_FILE="storage/state.json"
if [ ! -f "$STATE_FILE" ]; then
    echo "No state file found, creating initial state..."
    mkdir -p storage
    echo '{"last_update_id":0,"last_run_time":"'$(date -u +"%Y-%m-%dT%H:%M:%S+00:00")'","version":"1.0.0"}' > "$STATE_FILE"
    LAST_UPDATE_ID=0
else
    # Extract last_update_id from JSON using basic tools
    LAST_UPDATE_ID=$(grep -o '"last_update_id":[0-9]*' "$STATE_FILE" | grep -o '[0-9]*')
    if [ -z "$LAST_UPDATE_ID" ]; then
        LAST_UPDATE_ID=0
    fi
fi

echo ""
echo "Last processed update_id: $LAST_UPDATE_ID"
echo "Checking for new updates from Telegram..."

# Fetch updates from Telegram
OFFSET=$((LAST_UPDATE_ID + 1))
if ! RESPONSE=$(curl -s -f "https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates?offset=${OFFSET}&limit=1&timeout=10&allowed_updates=%5B%22message%22%5D"); then
    echo "ERROR: Failed to fetch updates from Telegram (network error)"
    exit 1
fi

# Check if response is OK
if ! echo "$RESPONSE" | grep -q '"ok":true'; then
    echo "ERROR: Telegram API returned error"
    echo "Response: $RESPONSE"
    exit 1
fi

# Check if result array is empty
if echo "$RESPONSE" | grep -q '"result":\[\]'; then
    echo ""
    echo "========================================="
    echo "✅ No new updates found. Stopping action."
    echo "========================================="
    exit 1
fi

# If we get here, there are new updates
echo ""
echo "========================================="
echo "✅ New updates found! Proceeding with full bot execution."
echo "========================================="
exit 0
