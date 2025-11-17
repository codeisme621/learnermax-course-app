#!/bin/bash

# Upload Mini Course Videos to S3
# Takes a single video file and uploads it 3 times with different names
# Usage: ./scripts/upload-mini-course-videos.sh

set -e

# Configuration
BUCKET_NAME="${VIDEO_BUCKET_NAME:-learnermax-videos-preview}"
REGION="${AWS_REGION:-us-east-1}"
COURSE_ID="spec-driven-dev-mini"
SOURCE_VIDEO="/home/rico/projects/learnermax-course-app/backend/sample-video.mp4.mp4"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "============================================"
echo "Upload Mini Course Videos"
echo "============================================"
echo "Bucket: s3://$BUCKET_NAME"
echo "Region: $REGION"
echo "Course: $COURSE_ID"
echo "Source: $SOURCE_VIDEO"
echo ""

# Check if source video exists
if [ ! -f "$SOURCE_VIDEO" ]; then
    echo -e "${RED}ERROR: Source video not found at $SOURCE_VIDEO${NC}"
    exit 1
fi

# Get video file size
VIDEO_SIZE=$(du -h "$SOURCE_VIDEO" | cut -f1)
echo "Source video size: $VIDEO_SIZE"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}ERROR: AWS CLI is not installed${NC}"
    exit 1
fi

# Verify bucket exists
echo "Verifying bucket exists..."
if ! aws s3 ls "s3://$BUCKET_NAME" --region "$REGION" &> /dev/null; then
    echo -e "${RED}ERROR: Bucket $BUCKET_NAME does not exist or is not accessible${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Bucket verified${NC}"
echo ""

echo "============================================"
echo "Uploading Videos (3 copies)"
echo "============================================"
echo ""

# Upload lesson 1
echo "Uploading lesson-1.mp4..."
if aws s3 cp "$SOURCE_VIDEO" \
    "s3://$BUCKET_NAME/courses/$COURSE_ID/lesson-1.mp4" \
    --region "$REGION" \
    --no-progress; then
    echo -e "${GREEN}✓ Uploaded lesson-1.mp4${NC}"
else
    echo -e "${RED}✗ Failed to upload lesson-1.mp4${NC}"
    exit 1
fi
echo ""

# Upload lesson 2
echo "Uploading lesson-2.mp4..."
if aws s3 cp "$SOURCE_VIDEO" \
    "s3://$BUCKET_NAME/courses/$COURSE_ID/lesson-2.mp4" \
    --region "$REGION" \
    --no-progress; then
    echo -e "${GREEN}✓ Uploaded lesson-2.mp4${NC}"
else
    echo -e "${RED}✗ Failed to upload lesson-2.mp4${NC}"
    exit 1
fi
echo ""

# Upload lesson 3
echo "Uploading lesson-3.mp4..."
if aws s3 cp "$SOURCE_VIDEO" \
    "s3://$BUCKET_NAME/courses/$COURSE_ID/lesson-3.mp4" \
    --region "$REGION" \
    --no-progress; then
    echo -e "${GREEN}✓ Uploaded lesson-3.mp4${NC}"
else
    echo -e "${RED}✗ Failed to upload lesson-3.mp4${NC}"
    exit 1
fi
echo ""

echo "============================================"
echo "Upload Complete"
echo "============================================"
echo -e "${GREEN}SUCCESS${NC}"
echo "Uploaded 3 videos to S3:"
echo "  - s3://$BUCKET_NAME/courses/$COURSE_ID/lesson-1.mp4"
echo "  - s3://$BUCKET_NAME/courses/$COURSE_ID/lesson-2.mp4"
echo "  - s3://$BUCKET_NAME/courses/$COURSE_ID/lesson-3.mp4"
echo ""
echo "Next steps:"
echo "  1. Verify videos with: ./scripts/verify-video-urls.sh"
echo "  2. Test course enrollment and playback"
echo ""
echo "To verify uploads:"
echo "  aws s3 ls s3://$BUCKET_NAME/courses/$COURSE_ID/ --region $REGION"
echo "============================================"
