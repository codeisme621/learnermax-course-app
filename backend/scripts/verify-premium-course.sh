#!/bin/bash

# Verify Premium Course Creation
# Tests that the premium course was created correctly in DynamoDB and is accessible via API
# Usage: ./scripts/verify-premium-course.sh

set -e

# Environment configuration
export EDUCATION_TABLE_NAME="${EDUCATION_TABLE_NAME:-learnermax-education-preview}"
export AWS_REGION="${AWS_REGION:-us-east-1}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REGION="${AWS_REGION}"
TABLE="${EDUCATION_TABLE_NAME}"
COURSE_ID="spec-driven-dev-premium"

echo "============================================"
echo "Verify Premium Course Creation"
echo "============================================"
echo "Course ID: $COURSE_ID"
echo "Table: $TABLE"
echo "Region: $REGION"
echo ""

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${RED}ERROR: jq is not installed (required for JSON parsing)${NC}"
    exit 1
fi

# Counter for checks
TOTAL_CHECKS=0
PASSED_CHECKS=0

# Helper function to run a check
run_check() {
    local check_num=$1
    local check_desc=$2
    local check_cmd=$3

    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    echo -n "Check $check_num: $check_desc... "

    if eval "$check_cmd" &>/dev/null; then
        echo -e "${GREEN}✓ PASSED${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        return 1
    fi
}

echo "============================================"
echo "Running Verification Checks"
echo "============================================"
echo ""

# Check 1: DynamoDB record exists
echo "Check 1/7: DynamoDB record exists"
ITEM=$(aws dynamodb get-item \
    --region "$REGION" \
    --table-name "$TABLE" \
    --key "{\"PK\":{\"S\":\"COURSE#$COURSE_ID\"},\"SK\":{\"S\":\"METADATA\"}}" \
    2>/dev/null || echo "")

if [ -n "$ITEM" ]; then
    echo -e "${GREEN}✓ PASSED${NC} - Course record exists in DynamoDB"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo -e "${RED}✗ FAILED${NC} - Course record not found in DynamoDB"
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
echo ""

# Check 2: comingSoon field is true
echo "Check 2/7: comingSoon field is true"
COMING_SOON=$(echo "$ITEM" | jq -r '.Item.comingSoon.BOOL // empty' 2>/dev/null || echo "")

if [ "$COMING_SOON" = "true" ]; then
    echo -e "${GREEN}✓ PASSED${NC} - comingSoon: true"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo -e "${RED}✗ FAILED${NC} - comingSoon is not true (found: $COMING_SOON)"
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
echo ""

# Check 3: estimatedDuration is "6-8 hours"
echo "Check 3/7: estimatedDuration is \"6-8 hours\""
DURATION=$(echo "$ITEM" | jq -r '.Item.estimatedDuration.S // empty' 2>/dev/null || echo "")

if [ "$DURATION" = "6-8 hours" ]; then
    echo -e "${GREEN}✓ PASSED${NC} - estimatedDuration: \"6-8 hours\""
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo -e "${RED}✗ FAILED${NC} - estimatedDuration incorrect (found: $DURATION)"
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
echo ""

# Check 4: totalLessons is null
echo "Check 4/7: totalLessons is null"
TOTAL_LESSONS=$(echo "$ITEM" | jq -r '.Item.totalLessons.NULL // empty' 2>/dev/null || echo "")

if [ "$TOTAL_LESSONS" = "true" ]; then
    echo -e "${GREEN}✓ PASSED${NC} - totalLessons: null (explicitly set)"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo -e "${RED}✗ FAILED${NC} - totalLessons is not null (found: $TOTAL_LESSONS)"
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
echo ""

# Check 5: Course appears in API listing
echo "Check 5/7: Course appears in GET /api/courses"

# Get API endpoint from SAM stack outputs
API_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name learnermax-course-app-preview \
    --region us-east-1 \
    --query 'Stacks[0].Outputs[?OutputKey==`WebEndpoint`].OutputValue' \
    --output text 2>/dev/null || echo "")

if [ -z "$API_ENDPOINT" ]; then
    echo -e "${YELLOW}⚠ SKIPPED${NC} - Could not find API endpoint from CloudFormation"
    echo "  To test manually: curl https://your-api-endpoint/api/courses"
else
    COURSES=$(curl -s "$API_ENDPOINT/api/courses" 2>/dev/null || echo "")
    if echo "$COURSES" | jq -e ".[] | select(.courseId == \"$COURSE_ID\")" &>/dev/null; then
        echo -e "${GREEN}✓ PASSED${NC} - Course found in API listing"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        echo -e "${RED}✗ FAILED${NC} - Course not found in API listing"
    fi
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
echo ""

# Check 6: Individual course endpoint works
echo "Check 6/7: GET /api/courses/$COURSE_ID returns 200"

if [ -z "$API_ENDPOINT" ]; then
    echo -e "${YELLOW}⚠ SKIPPED${NC} - No API endpoint available"
else
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_ENDPOINT/api/courses/$COURSE_ID" 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓ PASSED${NC} - Endpoint returns 200 OK"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))

        # Also verify comingSoon in API response
        COURSE_DATA=$(curl -s "$API_ENDPOINT/api/courses/$COURSE_ID" 2>/dev/null || echo "")
        API_COMING_SOON=$(echo "$COURSE_DATA" | jq -r '.comingSoon // empty' 2>/dev/null || echo "")
        if [ "$API_COMING_SOON" = "true" ]; then
            echo "  ${GREEN}→${NC} API response includes comingSoon: true"
        fi
    else
        echo -e "${RED}✗ FAILED${NC} - Endpoint returned HTTP $HTTP_CODE"
    fi
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
echo ""

# Check 7: Placeholder image URL is accessible
echo "Check 7/7: Placeholder image URL is accessible"
IMAGE_URL="https://via.placeholder.com/1280x720/7C3AED/FFFFFF?text=Advanced+Spec-Driven+Development"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$IMAGE_URL" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ PASSED${NC} - Image URL returns 200 OK"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo -e "${RED}✗ FAILED${NC} - Image URL returned HTTP $HTTP_CODE"
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
echo ""

# Summary
echo "============================================"
echo "Verification Summary"
echo "============================================"
echo ""
echo "Checks passed: $PASSED_CHECKS/$TOTAL_CHECKS"
echo ""

if [ $PASSED_CHECKS -eq $TOTAL_CHECKS ]; then
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}All checks passed! Premium course is ready.${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo "Course Details:"
    echo "  - Course ID: $COURSE_ID"
    echo "  - Name: Advanced Spec-Driven Development Mastery"
    echo "  - Status: Coming Soon"
    echo "  - Price: \$49.99"
    echo "  - Estimated Duration: 6-8 hours"
    echo ""
    echo "Next steps:"
    echo "  1. Deploy frontend to see premium course on dashboard"
    echo "  2. Implement Slice 3.2 (Early Access Backend)"
    echo "  3. Implement Slice 3.3 (Dashboard Premium Card)"
    exit 0
else
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}Some checks failed. Please review above.${NC}"
    echo -e "${RED}========================================${NC}"
    exit 1
fi
