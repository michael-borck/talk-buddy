#!/bin/bash

# Import scenarios into PocketBase from JSON export
# Run this after setting up PocketBase to populate with starter scenarios

echo "Importing scenarios into PocketBase..."

# Check if PocketBase is running
POCKETBASE_URL="${POCKETBASE_URL:-http://192.168.20.120:38990}"
if ! curl -s "$POCKETBASE_URL/api/health" >/dev/null; then
    echo "❌ PocketBase is not running on $POCKETBASE_URL"
    echo "Please start PocketBase first with: ./start-all.sh"
    exit 1
fi

# Check if export file exists
if [ ! -f "scenarios-export.json" ]; then
    echo "❌ scenarios-export.json not found!"
    echo "This file should be included in the repository."
    exit 1
fi

# Check if scenarios already exist
EXISTING=$(curl -s "$POCKETBASE_URL/api/collections/scenarios/records?perPage=1" | jq '.totalItems')

if [ "$EXISTING" -gt 0 ]; then
    echo "⚠️  Found $EXISTING existing scenarios in database."
    read -p "Do you want to continue and add more scenarios? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Import cancelled."
        exit 0
    fi
fi

# Import each scenario
echo "Importing scenarios..."
TOTAL=$(jq '.scenarios | length' scenarios-export.json)
SUCCESS=0

# Create scenarios (requires API rules to be open or authentication)
echo ""
echo "NOTE: If import fails with 'forbidden' errors:"
echo "1. Go to PocketBase Admin: $POCKETBASE_URL/_/"
echo "2. Go to Collections > scenarios > API Rules"
echo "3. Temporarily set 'Create rule' to empty (allow all)"
echo "4. Run this script again"
echo "5. Change 'Create rule' back to: @request.auth.id != \"\""
echo ""

# Read scenarios and create them
jq -c '.scenarios[]' scenarios-export.json | while read scenario; do
    NAME=$(echo $scenario | jq -r '.name')
    
    RESPONSE=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "$scenario" \
        "$POCKETBASE_URL/api/collections/scenarios/records")
    
    if echo "$RESPONSE" | grep -q '"id"'; then
        echo "  ✓ Imported: $NAME"
        ((SUCCESS++))
    else
        ERROR=$(echo "$RESPONSE" | jq -r '.message // .data.name.message // "Unknown error"' 2>/dev/null || echo "Unknown error")
        echo "  ✗ Failed: $NAME - $ERROR"
    fi
done

echo ""
echo "Import complete!"