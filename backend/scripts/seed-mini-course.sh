#!/bin/bash

# Seed Mini Course into Preview DynamoDB
# Creates the "Spec-Driven Development with Context Engineering" mini course
# Usage: ./scripts/seed-mini-course.sh [--dry-run]

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

# Parse arguments
if [ "$1" == "--dry-run" ]; then
  DRY_RUN=true
  echo -e "${YELLOW}Running in DRY RUN mode - no data will be created${NC}"
fi

echo "============================================"
echo "LearnerMax Mini Course Seeder"
echo "============================================"
echo "Region: $REGION"
echo "Table: $TABLE"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}ERROR: AWS CLI is not installed${NC}"
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

# Create the mini course
create_mini_course() {
    local course_id="spec-driven-dev-mini"
    local name="Spec-Driven Development with Context Engineering"
    local description="Learn how to build better software with AI collaboration by mastering spec writing and context engineering techniques."
    local instructor="Rico Romero"

    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}[DRY RUN]${NC} Would create: $course_id - $name"
        return
    fi

    echo "Creating mini course: $course_id"
    echo "Name: $name"
    echo "Instructor: $instructor"
    echo ""

    local item=$(cat <<'EOF'
{
  "PK": {"S": "COURSE#spec-driven-dev-mini"},
  "SK": {"S": "METADATA"},
  "GSI1PK": {"S": "COURSE#spec-driven-dev-mini"},
  "GSI1SK": {"S": "METADATA"},
  "entityType": {"S": "COURSE"},
  "courseId": {"S": "spec-driven-dev-mini"},
  "name": {"S": "Spec-Driven Development with Context Engineering"},
  "description": {"S": "Learn how to build better software with AI collaboration by mastering spec writing and context engineering techniques."},
  "instructor": {"S": "Rico Romero"},
  "pricingModel": {"S": "free"},
  "imageUrl": {"S": "https://via.placeholder.com/1280x720/4F46E5/FFFFFF?text=Spec-Driven+Development"},
  "learningObjectives": {"L": [
    {"S": "Understand the difference between vibe coding and spec-driven development and why specs produce better results"},
    {"S": "Explain the evolution from prompt engineering to context engineering and why it matters for long-running agents"},
    {"S": "Apply context engineering principles when writing specifications"},
    {"S": "Recognize how to build a flywheel effect that allows AI to write 99% of code while maintaining quality"},
    {"S": "Identify the frameworks and methodologies for implementing spec-driven development"}
  ]},
  "curriculum": {"L": []}
}
EOF
)

    # Add timestamps
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%S.000Z)
    item=$(echo "$item" | jq --arg ts "$timestamp" '. + {"createdAt": {"S": $ts}, "updatedAt": {"S": $ts}}')

    if aws dynamodb put-item \
        --region "$REGION" \
        --table-name "$TABLE" \
        --item "$item" \
        > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Successfully created mini course: $course_id${NC}"
    else
        echo -e "${RED}✗ Failed to create course (may already exist)${NC}"
        exit 1
    fi
}

echo "============================================"
echo "Seeding Mini Course"
echo "============================================"
echo ""

create_mini_course

echo ""
echo "============================================"
echo "Seeding Complete"
echo "============================================"

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}DRY RUN COMPLETE${NC}"
    echo "Would have created: spec-driven-dev-mini course"
    echo ""
    echo "Run without --dry-run to actually create the course:"
    echo "  ./scripts/seed-mini-course.sh"
else
    echo -e "${GREEN}SUCCESS${NC}"
    echo "Mini course created:"
    echo "  - Course ID: spec-driven-dev-mini"
    echo "  - Name: Spec-Driven Development with Context Engineering"
    echo "  - Instructor: Rico Romero"
    echo "  - Pricing: Free"
    echo "  - Learning Objectives: 5"
    echo ""
    echo "Next steps:"
    echo "  1. Run ./scripts/seed-mini-course-lessons.sh to create lesson records"
    echo "  2. Upload videos to S3: courses/spec-driven-dev-mini/"
    echo "  3. Verify course appears on dashboard"
fi

echo ""
echo "To verify the course was created:"
echo "  aws dynamodb get-item --table-name $TABLE \\"
echo "    --key '{\"PK\":{\"S\":\"COURSE#spec-driven-dev-mini\"},\"SK\":{\"S\":\"METADATA\"}}'"
echo "============================================"
