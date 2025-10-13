#!/bin/bash

# Cleanup Test Data from Preview DynamoDB
# This script removes all test data identified by the TEST- prefix
# Usage: ./scripts/cleanup-test-data.sh [--dry-run]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REGION="${AWS_REGION:-us-east-1}"
TABLE="${EDUCATION_TABLE_NAME:-learnermax-preview-education-table}"
DRY_RUN=false

# Parse arguments
if [ "$1" == "--dry-run" ]; then
  DRY_RUN=true
  echo -e "${YELLOW}Running in DRY RUN mode - no data will be deleted${NC}"
fi

echo "============================================"
echo "LearnerMax Test Data Cleanup"
echo "============================================"
echo "Region: $REGION"
echo "Table: $TABLE"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}ERROR: AWS CLI is not installed${NC}"
    exit 1
fi

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${RED}ERROR: jq is not installed${NC}"
    echo "Install with: sudo apt-get install jq"
    exit 1
fi

# Verify table exists
echo "Verifying table exists..."
if ! aws dynamodb describe-table \
    --region "$REGION" \
    --table-name "$TABLE" &> /dev/null; then
    echo -e "${RED}ERROR: Table $TABLE does not exist or is not accessible${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Table verified${NC}"
echo ""

# Function to delete item
delete_item() {
    local pk=$1
    local sk=$2

    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}[DRY RUN]${NC} Would delete: PK=$pk, SK=$sk"
    else
        echo "Deleting: PK=$pk, SK=$sk"
        aws dynamodb delete-item \
            --region "$REGION" \
            --table-name "$TABLE" \
            --key "{\"PK\":{\"S\":\"$pk\"},\"SK\":{\"S\":\"$sk\"}}" \
            > /dev/null 2>&1
    fi
}

# Counter for deleted items
DELETED_COUNT=0

echo "============================================"
echo "1. Cleaning up TEST USER records"
echo "============================================"

# Query for all USER#TEST- records
USERS=$(aws dynamodb scan \
    --region "$REGION" \
    --table-name "$TABLE" \
    --filter-expression "begins_with(PK, :prefix)" \
    --expression-attribute-values '{":prefix":{"S":"USER#TEST-"}}' \
    --projection-expression "PK,SK" \
    --output json 2>/dev/null || echo '{"Items":[]}')

USER_COUNT=$(echo "$USERS" | jq -r '.Items | length')
echo "Found $USER_COUNT test user records"

if [ "$USER_COUNT" -gt 0 ]; then
    echo "$USERS" | jq -r '.Items[] | @json' | while read -r item; do
        PK=$(echo "$item" | jq -r '.PK.S')
        SK=$(echo "$item" | jq -r '.SK.S')
        delete_item "$PK" "$SK"
        ((DELETED_COUNT++)) || true
    done
    echo -e "${GREEN}✓ Processed $USER_COUNT user records${NC}"
else
    echo "No test user records found"
fi
echo ""

echo "============================================"
echo "2. Cleaning up TEST ENROLLMENT records"
echo "============================================"

# Query for all ENROLLMENT#TEST- records in SK
ENROLLMENTS=$(aws dynamodb scan \
    --region "$REGION" \
    --table-name "$TABLE" \
    --filter-expression "begins_with(SK, :prefix)" \
    --expression-attribute-values '{":prefix":{"S":"ENROLLMENT#TEST-"}}' \
    --projection-expression "PK,SK" \
    --output json 2>/dev/null || echo '{"Items":[]}')

ENROLLMENT_COUNT=$(echo "$ENROLLMENTS" | jq -r '.Items | length')
echo "Found $ENROLLMENT_COUNT test enrollment records"

if [ "$ENROLLMENT_COUNT" -gt 0 ]; then
    echo "$ENROLLMENTS" | jq -r '.Items[] | @json' | while read -r item; do
        PK=$(echo "$item" | jq -r '.PK.S')
        SK=$(echo "$item" | jq -r '.SK.S')
        delete_item "$PK" "$SK"
        ((DELETED_COUNT++)) || true
    done
    echo -e "${GREEN}✓ Processed $ENROLLMENT_COUNT enrollment records${NC}"
else
    echo "No test enrollment records found"
fi
echo ""

echo "============================================"
echo "3. Cleaning up TEST COURSE records"
echo "============================================"

# Query for all COURSE#TEST- records
COURSES=$(aws dynamodb scan \
    --region "$REGION" \
    --table-name "$TABLE" \
    --filter-expression "begins_with(PK, :prefix)" \
    --expression-attribute-values '{":prefix":{"S":"COURSE#TEST-"}}' \
    --projection-expression "PK,SK" \
    --output json 2>/dev/null || echo '{"Items":[]}')

COURSE_COUNT=$(echo "$COURSES" | jq -r '.Items | length')
echo "Found $COURSE_COUNT test course records"

if [ "$COURSE_COUNT" -gt 0 ]; then
    echo "$COURSES" | jq -r '.Items[] | @json' | while read -r item; do
        PK=$(echo "$item" | jq -r '.PK.S')
        SK=$(echo "$item" | jq -r '.SK.S')
        delete_item "$PK" "$SK"
        ((DELETED_COUNT++)) || true
    done
    echo -e "${GREEN}✓ Processed $COURSE_COUNT course records${NC}"
else
    echo "No test course records found"
fi
echo ""

echo "============================================"
echo "Cleanup Summary"
echo "============================================"

TOTAL_FOUND=$((USER_COUNT + ENROLLMENT_COUNT + COURSE_COUNT))

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}DRY RUN COMPLETE${NC}"
    echo "Would have deleted: $TOTAL_FOUND records"
    echo ""
    echo "Run without --dry-run to actually delete the records:"
    echo "  ./scripts/cleanup-test-data.sh"
else
    echo -e "${GREEN}CLEANUP COMPLETE${NC}"
    echo "Total records found: $TOTAL_FOUND"
    echo "Total records deleted: $TOTAL_FOUND"
fi

echo ""
echo "Test data patterns cleaned:"
echo "  - USER#TEST-*"
echo "  - ENROLLMENT#TEST-*"
echo "  - COURSE#TEST-*"
echo ""

if [ "$TOTAL_FOUND" -eq 0 ]; then
    echo -e "${GREEN}✓ No test data found - database is clean!${NC}"
else
    echo -e "${GREEN}✓ All test data has been cleaned up${NC}"
fi

echo "============================================"
