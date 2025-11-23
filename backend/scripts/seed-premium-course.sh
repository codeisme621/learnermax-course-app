#!/bin/bash

# Seed Premium Course into Preview DynamoDB
# Creates the "Advanced Spec-Driven Development Mastery" premium course (coming soon)
# Usage: ./scripts/seed-premium-course.sh [--dry-run]

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
echo "LearnerMax Premium Course Seeder"
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

# Create the premium course
create_premium_course() {
    local course_id="spec-driven-dev-premium"
    local name="Advanced Spec-Driven Development Mastery"
    local description="Master advanced spec-driven development techniques with real-world case studies, hands-on projects, and in-depth coverage of context engineering patterns. Build a comprehensive portfolio of specs that showcase your expertise."
    local instructor="Rico Romero"

    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}[DRY RUN]${NC} Would create: $course_id - $name"
        echo -e "${YELLOW}[DRY RUN]${NC} Coming Soon: true"
        echo -e "${YELLOW}[DRY RUN]${NC} Price: \$49.99"
        return
    fi

    echo "Creating premium course: $course_id"
    echo "Name: $name"
    echo "Instructor: $instructor"
    echo "Status: Coming Soon"
    echo "Price: \$49.99"
    echo ""

    local item=$(cat <<'EOF'
{
  "PK": {"S": "COURSE#spec-driven-dev-premium"},
  "SK": {"S": "METADATA"},
  "GSI1PK": {"S": "COURSE#spec-driven-dev-premium"},
  "GSI1SK": {"S": "METADATA"},
  "entityType": {"S": "COURSE"},
  "courseId": {"S": "spec-driven-dev-premium"},
  "name": {"S": "Advanced Spec-Driven Development Mastery"},
  "description": {"S": "Master advanced spec-driven development techniques with real-world case studies, hands-on projects, and in-depth coverage of context engineering patterns. Build a comprehensive portfolio of specs that showcase your expertise."},
  "instructor": {"S": "Rico Romero"},
  "pricingModel": {"S": "paid"},
  "price": {"N": "4999"},
  "imageUrl": {"S": "https://via.placeholder.com/1280x720/7C3AED/FFFFFF?text=Advanced+Spec-Driven+Development"},
  "learningObjectives": {"L": [
    {"S": "Design complex multi-feature specifications for large codebases"},
    {"S": "Implement advanced context engineering patterns and best practices"},
    {"S": "Build spec-driven development workflows for development teams"},
    {"S": "Create reusable spec templates and pattern libraries"},
    {"S": "Optimize AI agent performance through iterative spec refinement"},
    {"S": "Conduct spec reviews and provide constructive feedback"}
  ]},
  "curriculum": {"L": []},
  "comingSoon": {"BOOL": true},
  "totalLessons": {"NULL": true},
  "estimatedDuration": {"S": "6-8 hours"}
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
        echo -e "${GREEN}✓ Successfully created premium course: $course_id${NC}"
    else
        echo -e "${RED}✗ Failed to create course${NC}"
        exit 1
    fi
}

echo "============================================"
echo "Seeding Premium Course"
echo "============================================"
echo ""

create_premium_course

echo ""
echo "============================================"
echo "Seeding Complete"
echo "============================================"

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}DRY RUN COMPLETE${NC}"
    echo "Would have created: spec-driven-dev-premium course"
    echo ""
    echo "Run without --dry-run to actually create the course:"
    echo "  ./scripts/seed-premium-course.sh"
else
    echo -e "${GREEN}SUCCESS${NC}"
    echo "Premium course created:"
    echo "  - Course ID: spec-driven-dev-premium"
    echo "  - Name: Advanced Spec-Driven Development Mastery"
    echo "  - Instructor: Rico Romero"
    echo "  - Pricing: Paid (\$49.99)"
    echo "  - Status: Coming Soon (comingSoon: true)"
    echo "  - Estimated Duration: 6-8 hours"
    echo "  - Total Lessons: null (not defined yet)"
    echo "  - Learning Objectives: 6"
    echo ""
    echo "Next steps:"
    echo "  1. Run ./scripts/verify-premium-course.sh to verify creation"
    echo "  2. Premium course will appear on dashboard with 'Coming Soon' badge"
    echo "  3. Students can sign up for early access (Slice 3.2+)"
fi

echo ""
echo "To verify the course was created:"
echo "  aws dynamodb get-item --table-name $TABLE \\"
echo "    --key '{\"PK\":{\"S\":\"COURSE#spec-driven-dev-premium\"},\"SK\":{\"S\":\"METADATA\"}}'"
echo "============================================"
