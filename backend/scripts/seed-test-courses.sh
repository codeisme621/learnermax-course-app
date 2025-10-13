#!/bin/bash

# Seed Test Courses into Preview DynamoDB
# This script creates test courses for local development and testing
# Usage: ./scripts/seed-test-courses.sh [--dry-run]

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
echo "LearnerMax Test Course Seeder"
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

# Function to create course
create_course() {
    local course_id=$1
    local name=$2
    local description=$3
    local instructor=$4
    local pricing_model=$5
    local price=${6:-0}

    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}[DRY RUN]${NC} Would create: $course_id - $name"
        return
    fi

    echo "Creating course: $course_id - $name"

    local item=$(cat <<EOF
{
  "PK": {"S": "COURSE#$course_id"},
  "SK": {"S": "METADATA"},
  "GSI1PK": {"S": "COURSE#$course_id"},
  "GSI1SK": {"S": "METADATA"},
  "entityType": {"S": "COURSE"},
  "courseId": {"S": "$course_id"},
  "name": {"S": "$name"},
  "description": {"S": "$description"},
  "instructor": {"S": "$instructor"},
  "pricingModel": {"S": "$pricing_model"},
  "imageUrl": {"S": "https://via.placeholder.com/400x300"},
  "learningObjectives": {"L": [
    {"S": "Learn fundamental concepts"},
    {"S": "Build practical projects"},
    {"S": "Master key skills"}
  ]},
  "curriculum": {"L": [
    {
      "M": {
        "moduleId": {"S": "module-1"},
        "moduleName": {"S": "Introduction"},
        "videos": {"L": [
          {
            "M": {
              "videoId": {"S": "video-1"},
              "title": {"S": "Welcome"},
              "lengthInMins": {"N": "10"},
              "videoPath": {"S": "/videos/welcome.mp4"}
            }
          }
        ]}
      }
    }
  ]},
  "createdAt": {"S": "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"},
  "updatedAt": {"S": "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"}
}
EOF
)

    if [ "$pricing_model" == "paid" ]; then
        item=$(echo "$item" | jq --arg price "$price" '. + {"price": {"N": $price}}')
    fi

    if aws dynamodb put-item \
        --region "$REGION" \
        --table-name "$TABLE" \
        --item "$item" \
        > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Created: $course_id${NC}"
    else
        echo -e "${YELLOW}⚠ Course $course_id already exists or failed to create${NC}"
    fi
}

# Counter
CREATED_COUNT=0

echo "============================================"
echo "Seeding Test Courses"
echo "============================================"
echo ""

# Course 1: Free Introduction Course
create_course \
    "TEST-COURSE-001" \
    "Introduction to Web Development" \
    "Learn the basics of HTML, CSS, and JavaScript. Perfect for beginners!" \
    "Test Instructor" \
    "free"
CREATED_COUNT=$((CREATED_COUNT + 1))

# Course 2: Free Advanced Course
create_course \
    "TEST-COURSE-002" \
    "Advanced JavaScript" \
    "Master async/await, closures, and modern JavaScript patterns." \
    "Test Instructor" \
    "free"
CREATED_COUNT=$((CREATED_COUNT + 1))

# Course 3: Paid Premium Course
create_course \
    "TEST-COURSE-003" \
    "Full-Stack Development Bootcamp" \
    "Comprehensive course covering frontend, backend, databases, and deployment." \
    "Test Instructor Pro" \
    "paid" \
    "99.99"
CREATED_COUNT=$((CREATED_COUNT + 1))

# Course 4: Free Specialized Course
create_course \
    "TEST-COURSE-004" \
    "React for Beginners" \
    "Build modern web apps with React, hooks, and best practices." \
    "Test Instructor" \
    "free"
CREATED_COUNT=$((CREATED_COUNT + 1))

# Course 5: Paid Specialized Course
create_course \
    "TEST-COURSE-005" \
    "AWS Cloud Mastery" \
    "Learn AWS services, infrastructure as code, and cloud architecture." \
    "Test Instructor Cloud" \
    "paid" \
    "149.99"
CREATED_COUNT=$((CREATED_COUNT + 1))

echo ""
echo "============================================"
echo "Seeding Summary"
echo "============================================"

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}DRY RUN COMPLETE${NC}"
    echo "Would have created: $CREATED_COUNT courses"
    echo ""
    echo "Run without --dry-run to actually create the courses:"
    echo "  ./scripts/seed-test-courses.sh"
else
    echo -e "${GREEN}SEEDING COMPLETE${NC}"
    echo "Total courses created: $CREATED_COUNT"
    echo ""
    echo "Test courses available:"
    echo "  - TEST-COURSE-001: Introduction to Web Development (Free)"
    echo "  - TEST-COURSE-002: Advanced JavaScript (Free)"
    echo "  - TEST-COURSE-003: Full-Stack Development Bootcamp (Paid - \$99.99)"
    echo "  - TEST-COURSE-004: React for Beginners (Free)"
    echo "  - TEST-COURSE-005: AWS Cloud Mastery (Paid - \$149.99)"
fi

echo ""
echo "To clean up test data later, run:"
echo "  ./scripts/cleanup-test-data.sh"
echo "============================================"
