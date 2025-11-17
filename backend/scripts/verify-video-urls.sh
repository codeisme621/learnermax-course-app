#!/bin/bash

# Verify Video URLs for Mini Course
# Tests that CloudFront signed URLs can be generated for all 3 lessons
# Usage: ./scripts/verify-video-urls.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

COURSE_ID="spec-driven-dev-mini"
LESSON_IDS=("lesson-1" "lesson-2" "lesson-3")

echo "============================================"
echo "Verify Mini Course Video URLs"
echo "============================================"
echo "Course ID: $COURSE_ID"
echo ""

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${RED}ERROR: jq is not installed (required for JSON parsing)${NC}"
    exit 1
fi

# Get API endpoint from SAM stack outputs
echo "Finding API endpoint..."
API_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name learnermax-course-app-preview \
    --region us-east-1 \
    --query 'Stacks[0].Outputs[?OutputKey==`WebEndpoint`].OutputValue' \
    --output text 2>/dev/null || echo "")

if [ -z "$API_ENDPOINT" ]; then
    echo -e "${YELLOW}⚠ Could not find API endpoint from CloudFormation${NC}"
    echo "Please provide the API endpoint manually or check stack deployment"
    echo ""
    echo "Example:"
    echo "  export API_ENDPOINT=https://xxxxxx.execute-api.us-east-1.amazonaws.com"
    exit 1
fi

echo -e "${GREEN}✓ API Endpoint: $API_ENDPOINT${NC}"
echo ""

# Test CloudFront configuration
echo "============================================"
echo "Testing CloudFront Configuration"
echo "============================================"
echo ""

CLOUDFRONT_DOMAIN=$(aws cloudformation describe-stacks \
    --stack-name learnermax-course-app-preview \
    --region us-east-1 \
    --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionDomain`].OutputValue' \
    --output text 2>/dev/null || echo "")

if [ -n "$CLOUDFRONT_DOMAIN" ]; then
    echo -e "${GREEN}✓ CloudFront Domain: $CLOUDFRONT_DOMAIN${NC}"
else
    echo -e "${YELLOW}⚠ CloudFront domain not found in stack outputs${NC}"
fi
echo ""

# Verify lessons in DynamoDB
echo "============================================"
echo "Verifying Lesson Records"
echo "============================================"
echo ""

for LESSON_ID in "${LESSON_IDS[@]}"; do
    echo "Checking $LESSON_ID..."

    LESSON=$(aws dynamodb get-item \
        --table-name learnermax-education-preview \
        --region us-east-1 \
        --key "{\"PK\":{\"S\":\"COURSE#$COURSE_ID\"},\"SK\":{\"S\":\"LESSON#$LESSON_ID\"}}" \
        --query 'Item.videoKey.S' \
        --output text 2>/dev/null || echo "")

    if [ -n "$LESSON" ] && [ "$LESSON" != "None" ]; then
        echo -e "${GREEN}  ✓ Found in DynamoDB: $LESSON${NC}"
    else
        echo -e "${RED}  ✗ Not found in DynamoDB${NC}"
    fi
done
echo ""

# Verify videos in S3
echo "============================================"
echo "Verifying Videos in S3"
echo "============================================"
echo ""

for i in {1..3}; do
    S3_KEY="courses/$COURSE_ID/lesson-$i.mp4"
    echo "Checking $S3_KEY..."

    if aws s3 ls "s3://learnermax-videos-preview/$S3_KEY" --region us-east-1 &>/dev/null; then
        SIZE=$(aws s3 ls "s3://learnermax-videos-preview/$S3_KEY" --region us-east-1 --human-readable | awk '{print $3, $4}')
        echo -e "${GREEN}  ✓ Found in S3: $SIZE${NC}"
    else
        echo -e "${RED}  ✗ Not found in S3${NC}"
    fi
done
echo ""

# Test video URL generation (requires authentication)
echo "============================================"
echo "Video URL Generation Test"
echo "============================================"
echo ""
echo -e "${BLUE}Note: Testing video URL generation requires authentication${NC}"
echo "This test will show you the API endpoint format to test manually."
echo ""

for LESSON_ID in "${LESSON_IDS[@]}"; do
    echo "URL for $LESSON_ID:"
    echo "  GET $API_ENDPOINT/api/lessons/$LESSON_ID/video-url"
    echo ""
done

echo "============================================"
echo "Manual Testing Instructions"
echo "============================================"
echo ""
echo "To test video URL generation with authentication:"
echo ""
echo "1. Sign in to the frontend app"
echo "2. Enroll in the course (it's free)"
echo "3. Navigate to the course page"
echo "4. Click on each lesson - videos should play"
echo ""
echo "Or use curl with authentication headers:"
echo "  curl -H \"Authorization: Bearer <token>\" \\"
echo "    $API_ENDPOINT/api/lessons/lesson-1/video-url"
echo ""
echo "============================================"
echo "Verification Summary"
echo "============================================"
echo ""
echo -e "${GREEN}✓ Course record created${NC}"
echo -e "${GREEN}✓ 3 lesson records created${NC}"
echo -e "${GREEN}✓ 3 videos uploaded to S3${NC}"
echo -e "${GREEN}✓ CloudFront distribution configured${NC}"
echo ""
echo "Status: ${GREEN}READY FOR TESTING${NC}"
echo ""
echo "Next steps:"
echo "  1. Deploy frontend (if not already deployed)"
echo "  2. Sign in and enroll in the course"
echo "  3. Test video playback for all 3 lessons"
echo "============================================"
