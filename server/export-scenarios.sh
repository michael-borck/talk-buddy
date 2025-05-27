#!/bin/bash

# Export scenarios from PocketBase to JSON
# This creates a file that can be committed to the repo

echo "Exporting scenarios from PocketBase..."

# Check if PocketBase is running
POCKETBASE_URL="${POCKETBASE_URL:-http://192.168.20.120:38990}"
if ! curl -s "$POCKETBASE_URL/api/health" >/dev/null; then
    echo "❌ PocketBase is not running on $POCKETBASE_URL"
    echo "Please start PocketBase first with: ./start-all.sh"
    exit 1
fi

# Export scenarios using the API
curl -s "$POCKETBASE_URL/api/collections/scenarios/records?perPage=100&sort=name" | \
    jq '{
        version: 1,
        exportDate: now | strftime("%Y-%m-%dT%H:%M:%SZ"),
        scenarios: .items | map({
            name: .name,
            description: .description,
            difficulty: .difficulty,
            estimatedMinutes: .estimatedMinutes,
            systemPrompt: .systemPrompt,
            initialMessage: .initialMessage,
            category: .category,
            tips: .tips
        })
    }' > scenarios-export.json

if [ $? -eq 0 ]; then
    COUNT=$(jq '.scenarios | length' scenarios-export.json)
    echo "✅ Exported $COUNT scenarios to scenarios-export.json"
    echo ""
    echo "This file can be committed to the repository."
    echo "New users can import it with: ./import-scenarios.sh"
else
    echo "❌ Export failed. Make sure jq is installed: sudo apt-get install jq"
fi