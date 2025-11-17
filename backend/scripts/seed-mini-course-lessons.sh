#!/bin/bash

# Seed Mini Course Lessons into Preview DynamoDB
# Creates 3 lessons for "Spec-Driven Development with Context Engineering"
# Usage: ./scripts/seed-mini-course-lessons.sh [--dry-run]

set -e

# Environment configuration
export EDUCATION_TABLE_NAME="${EDUCATION_TABLE_NAME:-learnermax-education-preview}"
export AWS_REGION="${AWS_REGION:-us-east-1}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REGION="${AWS_REGION}"
TABLE="${EDUCATION_TABLE_NAME}"
DRY_RUN=false
COURSE_ID="spec-driven-dev-mini"

# Parse arguments
if [ "$1" == "--dry-run" ]; then
  DRY_RUN=true
  echo -e "${YELLOW}Running in DRY RUN mode - no data will be created${NC}"
fi

echo "============================================"
echo "LearnerMax Mini Course Lesson Seeder"
echo "============================================"
echo "Region: $REGION"
echo "Table: $TABLE"
echo "Course ID: $COURSE_ID"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}ERROR: AWS CLI is not installed${NC}"
    exit 1
fi

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${RED}ERROR: jq is not installed (required for JSON manipulation)${NC}"
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

# Verify course exists
echo "Verifying course exists..."
if ! aws dynamodb get-item \
    --region "$REGION" \
    --table-name "$TABLE" \
    --key "{\"PK\":{\"S\":\"COURSE#$COURSE_ID\"},\"SK\":{\"S\":\"METADATA\"}}" \
    &> /dev/null; then
    echo -e "${RED}ERROR: Course $COURSE_ID does not exist${NC}"
    echo "Please run ./scripts/seed-mini-course.sh first"
    exit 1
fi
echo -e "${GREEN}✓ Course verified${NC}"
echo ""

# Function to create lesson
create_lesson() {
    local lesson_id=$1
    local order=$2
    local title=$3
    local description=$4
    local length_mins=$5

    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}[DRY RUN]${NC} Would create: $lesson_id - $title"
        return
    fi

    echo "Creating lesson $order: $title"

    local video_key="courses/$COURSE_ID/lesson-$order.mp4"
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%S.000Z)

    local item=$(cat <<EOF
{
  "PK": {"S": "COURSE#$COURSE_ID"},
  "SK": {"S": "LESSON#$lesson_id"},
  "GSI1PK": {"S": "LESSON#$lesson_id"},
  "GSI1SK": {"S": "COURSE#$COURSE_ID"},
  "entityType": {"S": "LESSON"},
  "lessonId": {"S": "$lesson_id"},
  "courseId": {"S": "$COURSE_ID"},
  "title": {"S": "$title"},
  "description": {"S": "$description"},
  "videoKey": {"S": "$video_key"},
  "lengthInMins": {"N": "$length_mins"},
  "order": {"N": "$order"},
  "createdAt": {"S": "$timestamp"},
  "updatedAt": {"S": "$timestamp"}
}
EOF
)

    if aws dynamodb put-item \
        --region "$REGION" \
        --table-name "$TABLE" \
        --item "$item" \
        > /dev/null 2>&1; then
        echo -e "${GREEN}  ✓ Created: $lesson_id ($length_mins mins)${NC}"
    else
        echo -e "${RED}  ✗ Failed to create lesson $lesson_id${NC}"
        return 1
    fi
}

echo "============================================"
echo "Seeding Lessons"
echo "============================================"
echo ""

# Lesson 1: Vibe Coding vs. Spec-Driven Development
create_lesson \
    "lesson-1" \
    "1" \
    "Vibe Coding vs. Spec-Driven Development" \
    "Discover the difference between vibe coding and spec-driven development, and why serious developers are adopting specs to build better software with AI collaboration." \
    "15"

echo ""

# Lesson 2: Prompt Engineering vs. Context Engineering
create_lesson \
    "lesson-2" \
    "2" \
    "Prompt Engineering vs. Context Engineering" \
    "Learn the critical difference between prompt engineering and context engineering, and why context engineering is essential for working with modern AI coding agents." \
    "15"

echo ""

# Lesson 3: Spec-Driven Development with Context Engineering
create_lesson \
    "lesson-3" \
    "3" \
    "Spec-Driven Development with Context Engineering" \
    "Master the practical application of spec-driven development with context engineering to achieve the ultimate goal: having AI write 99% of your code while maintaining high quality." \
    "15"

echo ""
echo "============================================"
echo "Seeding Complete"
echo "============================================"

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}DRY RUN COMPLETE${NC}"
    echo "Would have created 3 lessons for: $COURSE_ID"
    echo ""
    echo "Run without --dry-run to actually create the lessons:"
    echo "  ./scripts/seed-mini-course-lessons.sh"
else
    echo -e "${GREEN}SUCCESS${NC}"
    echo "Created 3 lessons for mini course:"
    echo "  1. Vibe Coding vs. Spec-Driven Development (15 mins)"
    echo "  2. Prompt Engineering vs. Context Engineering (15 mins)"
    echo "  3. Spec-Driven Development with Context Engineering (15 mins)"
    echo ""
    echo "Total duration: 45 minutes"
    echo ""
    echo "Next steps:"
    echo "  1. Upload videos to S3:"
    echo "     - s3://learnermax-videos-preview/courses/$COURSE_ID/lesson-1.mp4"
    echo "     - s3://learnermax-videos-preview/courses/$COURSE_ID/lesson-2.mp4"
    echo "     - s3://learnermax-videos-preview/courses/$COURSE_ID/lesson-3.mp4"
    echo "  2. Verify videos with ./scripts/verify-video-urls.sh"
    echo "  3. Test course enrollment and playback"
fi

echo ""
echo "To verify lessons were created:"
echo "  aws dynamodb query --table-name $TABLE \\"
echo "    --key-condition-expression 'PK = :pk' \\"
echo "    --expression-attribute-values '{\":pk\":{\"S\":\"COURSE#$COURSE_ID\"}}'"
echo "============================================"
