#!/bin/bash
# Setup Video CDN Custom Domain
# Creates ACM certificate and Route53 records for video.learnwithrico.com
#
# Prerequisites:
# - AWS CLI configured with appropriate permissions
# - Route53 hosted zone for the domain
#
# Usage: ./scripts/setup-video-cdn-domain.sh [DOMAIN] [HOSTED_ZONE_ID]
# Example: ./scripts/setup-video-cdn-domain.sh video.learnwithrico.com Z02314211JKE4WYB6FB6O

set -e

# Configuration
VIDEO_CDN_DOMAIN="${1:-video.learnwithrico.com}"
HOSTED_ZONE_ID="${2:-Z02314211JKE4WYB6FB6O}"
REGION="us-east-1"  # ACM certificates for CloudFront MUST be in us-east-1

echo "=================================="
echo "Video CDN Domain Setup"
echo "=================================="
echo "Domain: ${VIDEO_CDN_DOMAIN}"
echo "Hosted Zone: ${HOSTED_ZONE_ID}"
echo "Region: ${REGION}"
echo ""

# Step 1: Check if certificate already exists
echo "Step 1: Checking for existing certificate..."
EXISTING_CERT=$(aws acm list-certificates --region ${REGION} \
  --query "CertificateSummaryList[?DomainName=='${VIDEO_CDN_DOMAIN}'].CertificateArn" \
  --output text 2>/dev/null || echo "")

if [ -n "$EXISTING_CERT" ] && [ "$EXISTING_CERT" != "None" ]; then
  echo "Certificate already exists: ${EXISTING_CERT}"

  # Check status
  CERT_STATUS=$(aws acm describe-certificate --certificate-arn "${EXISTING_CERT}" --region ${REGION} \
    --query 'Certificate.Status' --output text)
  echo "Status: ${CERT_STATUS}"

  if [ "$CERT_STATUS" == "ISSUED" ]; then
    echo ""
    echo "✅ Certificate is already issued and ready to use!"
    echo ""
    echo "Add this to your backend/samconfig.toml [prod.deploy.parameters]:"
    echo "  \"VideoCdnDomain=${VIDEO_CDN_DOMAIN}\","
    echo "  \"VideoCdnCertificateArn=${EXISTING_CERT}\""
    exit 0
  fi
fi

# Step 2: Request new certificate
echo "Step 2: Requesting ACM certificate..."
CERT_ARN=$(aws acm request-certificate \
  --domain-name "${VIDEO_CDN_DOMAIN}" \
  --validation-method DNS \
  --region ${REGION} \
  --query 'CertificateArn' \
  --output text)

echo "Certificate ARN: ${CERT_ARN}"

# Step 3: Wait for DNS validation details
echo "Step 3: Waiting for DNS validation details..."
sleep 5

# Get validation record details
VALIDATION_RECORD=$(aws acm describe-certificate \
  --certificate-arn "${CERT_ARN}" \
  --region ${REGION} \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord')

VALIDATION_NAME=$(echo "${VALIDATION_RECORD}" | jq -r '.Name')
VALIDATION_VALUE=$(echo "${VALIDATION_RECORD}" | jq -r '.Value')

echo "Validation CNAME: ${VALIDATION_NAME} -> ${VALIDATION_VALUE}"

# Step 4: Create DNS validation record
echo "Step 4: Creating DNS validation record in Route53..."
aws route53 change-resource-record-sets \
  --hosted-zone-id "${HOSTED_ZONE_ID}" \
  --change-batch "{
    \"Changes\": [{
      \"Action\": \"UPSERT\",
      \"ResourceRecordSet\": {
        \"Name\": \"${VALIDATION_NAME}\",
        \"Type\": \"CNAME\",
        \"TTL\": 300,
        \"ResourceRecords\": [{\"Value\": \"${VALIDATION_VALUE}\"}]
      }
    }]
  }" > /dev/null

echo "DNS validation record created."

# Step 5: Wait for certificate validation
echo "Step 5: Waiting for certificate validation (this may take 2-5 minutes)..."
aws acm wait certificate-validated \
  --certificate-arn "${CERT_ARN}" \
  --region ${REGION}

echo ""
echo "=================================="
echo "✅ Certificate Created Successfully!"
echo "=================================="
echo ""
echo "Certificate ARN: ${CERT_ARN}"
echo ""
echo "Next steps:"
echo ""
echo "1. Update backend/samconfig.toml [prod.deploy.parameters] with:"
echo "   \"VideoCdnDomain=${VIDEO_CDN_DOMAIN}\","
echo "   \"VideoCdnCertificateArn=${CERT_ARN}\""
echo ""
echo "2. Deploy the backend:"
echo "   cd backend && sam build && sam deploy --config-env prod"
echo ""
echo "3. After deployment, create CNAME record for video domain:"
echo "   (The script will output the CloudFront domain to point to)"
echo ""
