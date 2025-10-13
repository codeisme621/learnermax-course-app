#!/bin/bash

# LearnerMax Backend API Test Requests
# Usage: Make sure backend is running on port 8080 (pnpm run dev:bg)
# These use TEST accounts that should be cleaned up regularly

# Configuration
# Switch between local and preview:
# BASE_URL="http://localhost:8080"  # Local development
BASE_URL="https://w6s58tolz3.execute-api.us-east-1.amazonaws.com/Prod"  # Preview environment

# DynamoDB Table Name (needed for seeding/cleanup)
# This will be set after deployment from SAM outputs
export EDUCATION_TABLE_NAME="${EDUCATION_TABLE_NAME:-learnermax-education-preview}"
export AWS_REGION="${AWS_REGION:-us-east-1}"

# Test user IDs - clearly marked as test data
TEST_USER_EMAIL="TEST-USER-EMAIL-001"
TEST_USER_GOOGLE="TEST-USER-GOOGLE-001"
TEST_COURSE_ID="TEST-COURSE-001"

# Helper function to create auth header
create_auth_header() {
  local user_id=$1
  local email=$2
  echo -n "{\"authorizer\":{\"claims\":{\"sub\":\"${user_id}\",\"email\":\"${email}\"}}}"
}

echo "============================================"
echo "LearnerMax Backend API Test Requests"
echo "============================================"
echo ""

# Test 1: Get student profile
echo "1. Get Student Profile (GET /api/students/me)"
echo "---"
AUTH_CONTEXT=$(create_auth_header "${TEST_USER_EMAIL}" "test.email.001@learnermax-test.com")
curl -s -X GET "${BASE_URL}/api/students/me" \
  -H "Content-Type: application/json" \
  -H "x-amzn-request-context: ${AUTH_CONTEXT}" | jq '.'
echo ""
echo ""

# Test 2: Update student profile
echo "2. Update Student Profile (PATCH /api/students/me)"
echo "---"
AUTH_CONTEXT=$(create_auth_header "${TEST_USER_EMAIL}" "test.email.001@learnermax-test.com")
curl -s -X PATCH "${BASE_URL}/api/students/me" \
  -H "Content-Type: application/json" \
  -H "x-amzn-request-context: ${AUTH_CONTEXT}" \
  -d '{"name":"Test User Updated","emailVerified":true}' | jq '.'
echo ""
echo ""

# Test 3: Get all courses
echo "3. Get All Courses (GET /api/courses)"
echo "---"
curl -s -X GET "${BASE_URL}/api/courses" \
  -H "Content-Type: application/json" | jq '.'
echo ""
echo ""

# Test 4: Get specific course
echo "4. Get Specific Course (GET /api/courses/:courseId)"
echo "---"
curl -s -X GET "${BASE_URL}/api/courses/${TEST_COURSE_ID}" \
  -H "Content-Type: application/json" | jq '.'
echo ""
echo ""

# Test 5: Enroll in course
echo "5. Enroll in Course (POST /api/enrollments)"
echo "---"
AUTH_CONTEXT=$(create_auth_header "${TEST_USER_EMAIL}" "test.email.001@learnermax-test.com")
curl -s -X POST "${BASE_URL}/api/enrollments" \
  -H "Content-Type: application/json" \
  -H "x-amzn-request-context: ${AUTH_CONTEXT}" \
  -d "{\"courseId\":\"${TEST_COURSE_ID}\"}" | jq '.'
echo ""
echo ""

# Test 6: Get user enrollments
echo "6. Get User Enrollments (GET /api/enrollments)"
echo "---"
AUTH_CONTEXT=$(create_auth_header "${TEST_USER_EMAIL}" "test.email.001@learnermax-test.com")
curl -s -X GET "${BASE_URL}/api/enrollments" \
  -H "Content-Type: application/json" \
  -H "x-amzn-request-context: ${AUTH_CONTEXT}" | jq '.'
echo ""
echo ""

# Test 7: Check enrollment status
echo "7. Check Enrollment Status (GET /api/enrollments/check/:courseId)"
echo "---"
AUTH_CONTEXT=$(create_auth_header "${TEST_USER_EMAIL}" "test.email.001@learnermax-test.com")
curl -s -X GET "${BASE_URL}/api/enrollments/check/${TEST_COURSE_ID}" \
  -H "Content-Type: application/json" \
  -H "x-amzn-request-context: ${AUTH_CONTEXT}" | jq '.'
echo ""
echo ""

# Test 8: Test with Google user
echo "8. Get Student Profile - Google User (GET /api/students/me)"
echo "---"
AUTH_CONTEXT=$(create_auth_header "${TEST_USER_GOOGLE}" "test.google.001@learnermax-test.com")
curl -s -X GET "${BASE_URL}/api/students/me" \
  -H "Content-Type: application/json" \
  -H "x-amzn-request-context: ${AUTH_CONTEXT}" | jq '.'
echo ""
echo ""

echo "============================================"
echo "All test requests completed"
echo "============================================"
