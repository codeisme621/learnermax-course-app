#!/bin/bash
# Create CNAME record for Video CDN
# Points video.learnwithrico.com to CloudFront distribution
#
# Run this AFTER deploying the backend with VideoCdnDomain parameter
#
# Usage: ./scripts/create-video-cdn-cname.sh [CLOUDFRONT_DOMAIN] [VIDEO_DOMAIN] [HOSTED_ZONE_ID]
# Example: ./scripts/create-video-cdn-cname.sh d1234567890.cloudfront.net video.learnwithrico.com Z02314211JKE4WYB6FB6O

set -e

# Get CloudFront domain from stack output if not provided
if [ -z "$1" ]; then
  echo "Fetching CloudFront domain from prod stack..."
  CLOUDFRONT_DOMAIN=$(aws cloudformation describe-stacks \
    --stack-name learnermax-course-app-prod \
    --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionDomain'].OutputValue" \
    --output text 2>/dev/null || echo "")

  if [ -z "$CLOUDFRONT_DOMAIN" ] || [ "$CLOUDFRONT_DOMAIN" == "None" ]; then
    echo "Error: Could not find CloudFront domain. Provide it as first argument."
    echo "Usage: $0 <cloudfront-domain> [video-domain] [hosted-zone-id]"
    exit 1
  fi
else
  CLOUDFRONT_DOMAIN="$1"
fi

VIDEO_CDN_DOMAIN="${2:-video.learnwithrico.com}"
HOSTED_ZONE_ID="${3:-Z02314211JKE4WYB6FB6O}"

echo "=================================="
echo "Video CDN CNAME Setup"
echo "=================================="
echo "Video Domain: ${VIDEO_CDN_DOMAIN}"
echo "CloudFront Domain: ${CLOUDFRONT_DOMAIN}"
echo "Hosted Zone: ${HOSTED_ZONE_ID}"
echo ""

# Check if record already exists
EXISTING_RECORD=$(aws route53 list-resource-record-sets \
  --hosted-zone-id "${HOSTED_ZONE_ID}" \
  --query "ResourceRecordSets[?Name=='${VIDEO_CDN_DOMAIN}.'].ResourceRecords[0].Value" \
  --output text 2>/dev/null || echo "")

if [ -n "$EXISTING_RECORD" ] && [ "$EXISTING_RECORD" != "None" ]; then
  echo "Existing CNAME record found: ${VIDEO_CDN_DOMAIN} -> ${EXISTING_RECORD}"
  if [ "$EXISTING_RECORD" == "$CLOUDFRONT_DOMAIN" ]; then
    echo "✅ Record is already correct!"
    exit 0
  fi
  echo "Updating to: ${CLOUDFRONT_DOMAIN}"
fi

# Create/update CNAME record
echo "Creating CNAME record..."
aws route53 change-resource-record-sets \
  --hosted-zone-id "${HOSTED_ZONE_ID}" \
  --change-batch "{
    \"Changes\": [{
      \"Action\": \"UPSERT\",
      \"ResourceRecordSet\": {
        \"Name\": \"${VIDEO_CDN_DOMAIN}\",
        \"Type\": \"CNAME\",
        \"TTL\": 300,
        \"ResourceRecords\": [{\"Value\": \"${CLOUDFRONT_DOMAIN}\"}]
      }
    }]
  }" > /dev/null

echo ""
echo "=================================="
echo "✅ CNAME Record Created!"
echo "=================================="
echo ""
echo "${VIDEO_CDN_DOMAIN} -> ${CLOUDFRONT_DOMAIN}"
echo ""
echo "DNS propagation may take a few minutes."
echo "Test with: dig ${VIDEO_CDN_DOMAIN} CNAME"
echo ""
