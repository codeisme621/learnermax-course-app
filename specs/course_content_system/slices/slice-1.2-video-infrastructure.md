# Slice 1.2: Video Infrastructure (AWS)

**Parent Mainspec:** `specs/course_content_system/mainspec.md`
**Status:** ✅ Completed
**Depends On:** Slice 1.1 (Type System - needs `videoKey` field definition)

## Objective
Set up AWS infrastructure for secure video storage and delivery: S3 bucket for video files, CloudFront distribution with Origin Access Identity (OAI), and a backend service to generate time-limited signed URLs.

## What We're Doing

### 1. S3 Bucket for Video Storage
**Infrastructure:** `backend/template.yaml` (SAM)

Create a private S3 bucket with:
- Public access completely blocked
- CORS configuration for frontend domain
- Organized folder structure: `courses/{courseId}/lesson-{order}.mp4`

**Example folder structure:**
```
learnermax-videos/
├── courses/
│   ├── spec-driven-dev-mini/
│   │   ├── lesson-1.mp4
│   │   ├── lesson-2.mp4
│   │   └── lesson-3.mp4
│   └── future-premium-course/
│       └── ...
```

### 2. CloudFront Distribution with Origin Access Identity
**Infrastructure:** `backend/template.yaml`

Create CloudFront distribution with:
- Origin Access Identity (OAI) - only CloudFront can access S3 bucket
- Trusted signers enabled (for signed URL generation)
- HTTPS only (redirect HTTP to HTTPS)
- Caching enabled for video files
- Price class: North America & Europe (cost optimization)

**S3 bucket policy:** Only CloudFront OAI can read objects (no direct S3 access)

### 3. CloudFront Key Pair Management
**Security setup:**

CloudFront key pair (generated once, requires AWS root account):
- Private key stored in **AWS Secrets Manager**: `learnermax/cloudfront-private-key`
- Key pair ID stored in **Parameter Store**: `/learnermax/cloudfront-key-pair-id`
- Lambda has IAM permission to read secret from Secrets Manager

**Lambda environment variables:**
```yaml
CLOUDFRONT_DOMAIN: <distribution-domain>
CLOUDFRONT_KEY_PAIR_ID: <from-parameter-store>
VIDEO_URL_EXPIRY_MINUTES: 30
```

### 4. Video URL Service (Signed URL Generation)
**New service:** `backend/src/features/lessons/services/video-url-service.ts`

**Interface:**
```typescript
interface VideoUrlProvider {
  generateSignedUrl(videoKey: string): Promise<{ url: string; expiresAt: number }>;
}
```

**Implementation requirements:**
- Fetch CloudFront private key from Secrets Manager (cache for Lambda warm starts)
- Generate CloudFront signed URL using `@aws-sdk/cloudfront-signer`
- URL expiration: 30 minutes (configurable via env var)
- Return both signed URL and expiration timestamp (Unix seconds)

**Example usage:**
```typescript
const provider = createVideoUrlProvider();
const result = await provider.generateSignedUrl('courses/spec-driven-dev-mini/lesson-1.mp4');
// Returns: { url: 'https://d123.cloudfront.net/...?Signature=...', expiresAt: 1234567890 }
```

**Why strategy pattern?** Enables future swapping to different video providers (Vimeo, Cloudflare Stream) without changing calling code.

### 5. Dependencies
**Add to `backend/package.json`:**
- `@aws-sdk/cloudfront-signer` - CloudFront signed URL generation
- `@aws-sdk/client-secrets-manager` - Retrieve private key from Secrets Manager

## What We're NOT Doing
- No API endpoint implementation (Slice 1.3)
- No video upload interface (manual upload via AWS Console)
- No video transcoding or adaptive streaming
- No video player component (Slice 1.4)
- No DynamoDB lesson records (just infrastructure)

## Acceptance Criteria

### Infrastructure
- [ ] S3 bucket created with all public access blocked
- [ ] CloudFront distribution created with OAI configured
- [ ] S3 bucket policy restricts access to CloudFront OAI only
- [ ] CloudFront trusted signers enabled for signed URLs
- [ ] SAM template validates: `sam validate`
- [ ] CloudFront distribution domain available in stack outputs

### Security & Configuration
- [ ] CloudFront key pair generated (manual one-time setup)
- [ ] Private key stored in AWS Secrets Manager
- [ ] Key pair ID stored in AWS Parameter Store
- [ ] Lambda IAM role has `secretsmanager:GetSecretValue` permission
- [ ] Environment variables configured on Lambda function

### Video URL Service
- [ ] `video-url-service.ts` implements `VideoUrlProvider` interface
- [ ] Private key fetched from Secrets Manager with in-memory caching
- [ ] Signed URLs expire after 30 minutes
- [ ] Service returns both `url` and `expiresAt` fields
- [ ] Unit tests verify URL structure and expiration logic

### Validation & Testing
- [ ] Upload test video to S3: `courses/test/lesson-1.mp4`
- [ ] Direct S3 URL returns 403 Forbidden (bucket is private)
- [ ] Signed CloudFront URL plays video successfully
- [ ] Signed URL expires after configured time
- [ ] Unit tests pass for `generateSignedUrl()`

## Do / Don't Examples

### DO: Use Strategy Pattern for Provider Abstraction
```typescript
// ✅ GOOD: Interface-based design allows swapping providers
interface VideoUrlProvider {
  generateSignedUrl(videoKey: string): Promise<{ url: string; expiresAt: number }>;
}

class CloudFrontUrlProvider implements VideoUrlProvider { ... }
// Future: VimeoProvider, CloudflareStreamProvider, etc.
```

### DON'T: Hardcode CloudFront Logic
```typescript
// ❌ BAD: Tightly coupled to CloudFront, hard to swap
function getVideoUrl(videoKey: string) {
  return getSignedUrl(`https://d123.cloudfront.net/${videoKey}`, PRIVATE_KEY);
}
```

### DO: Cache Private Key in Lambda Memory
```typescript
// ✅ GOOD: Fetch once per cold start, reuse across invocations
private privateKey: string | null = null;

private async getPrivateKey(): Promise<string> {
  if (this.privateKey) return this.privateKey;  // Cache hit
  this.privateKey = await fetchFromSecretsManager();
  return this.privateKey;
}
```

### DON'T: Fetch Secret on Every URL Generation
```typescript
// ❌ BAD: Slow, expensive (Secrets Manager charges per API call)
async generateSignedUrl(videoKey: string) {
  const privateKey = await fetchFromSecretsManager();  // Every time!
  return getSignedUrl(...);
}
```

### DO: Return Expiration Timestamp with URL
```typescript
// ✅ GOOD: Frontend knows when to refresh URL
return {
  url: signedUrl,
  expiresAt: Math.floor(Date.now() / 1000) + (30 * 60)  // Unix timestamp
};
```

### DON'T: Return Only the URL
```typescript
// ❌ BAD: Frontend has no idea when URL expires
return signedUrl;
```

## Forward-Looking Requirements

### For Slice 1.3 (Progress Tracking API)
- **Video key format:** `courses/{courseId}/lesson-{order}.mp4`
- API endpoint will call `generateSignedUrl(lesson.videoKey)` to serve video URLs to frontend

### For Phase 2 (Mini Course Content)
**Video upload specifications:**
- **Naming convention:** `lesson-{order}.mp4` (e.g., `lesson-1.mp4`)
- **S3 path:** `courses/spec-driven-dev-mini/lesson-{order}.mp4`
- **Format:** MP4 with H.264 video codec, AAC audio
- **Resolution:** 1080p (1920x1080) or 720p (1280x720)
- **Upload method:** Manual upload via AWS Console or AWS CLI

### For Future Enhancements
CloudFront distribution can be extended with:
- Custom error pages (403 → friendly "Video unavailable" page)
- CloudWatch Logs integration for analytics
- Geographic restrictions (if content licensing requires it)
- Bandwidth throttling for cost control

## Video Key Format Decision

**Established convention:**
```
courses/{courseId}/lesson-{order}.mp4
```

**Examples:**
- `courses/spec-driven-dev-mini/lesson-1.mp4`
- `courses/spec-driven-dev-mini/lesson-2.mp4`
- `courses/premium-spec-course/lesson-1.mp4`

**Why this format:**
- Predictable structure for manual uploads (Phase 2)
- Easy to construct from `courseId` and lesson `order` field
- Supports multiple courses in single bucket
- Clear organization in S3 console

## Deviations from Plan

### 1. CloudFront KeyGroups Instead of Legacy Trusted Signers
**Deviation:** Used modern CloudFront KeyGroups with Public Key ID instead of legacy Key Pair ID approach.

**Original Plan:** Store Key Pair ID in Parameter Store, use it directly for signing.

**Actual Implementation:**
- Created CloudFront Public Key via `aws cloudfront create-public-key` 
- Created CloudFront KeyGroup manually via `aws cloudfront create-key-group` 
- Store Public Key ID in SAM template parameters (not Parameter Store)
- Environment variable `CLOUDFRONT_KEY_PAIR_ID` actually contains Public Key ID for KeyGroups

**Reason:** AWS recommends KeyGroups as the modern approach. Legacy trusted signers with Key Pair IDs are still supported but KeyGroups offer better key rotation and management.

**Files Changed:**
- `backend/template.yaml` - Added `CloudFrontPublicKeyId` and `CloudFrontKeyGroupId` parameters
- `backend/samconfig.toml` - Stores all three IDs (Key Pair, Public Key, KeyGroup)

### 2. Manual KeyGroup and Public Key Creation
**Deviation:** CloudFront KeyGroup and Public Key created manually via AWS CLI instead of CloudFormation.

**Original Plan:** Define all resources in SAM template.

**Actual Implementation:**
```bash
# Created public key from PEM file
aws cloudfront create-public-key --public-key-config Name=learnermax-video-signing-key-preview,...

# Created key group referencing public key
aws cloudfront create-key-group --key-group-config Name=learnermax-video-key-group-preview,Items=...,...
```

**Reason:** CloudFormation deployment failed with "The specified CloudFront public key does not exist in key group" error. CloudFront KeyGroup requires the public key to exist before distribution creation, creating a circular dependency. Manual creation resolved this.

**Impact:** One-time manual setup required per environment. KeyGroup IDs stored in `samconfig.toml` and referenced via parameters.

### 3. CORS Configuration on CloudFront (Not S3)
**Deviation:** Implemented CORS using CloudFront ResponseHeadersPolicy instead of S3 CORS configuration.

**Original Plan:** Configure CORS on S3 bucket for frontend domain.

**Actual Implementation:**
- Created `VideoResponseHeadersPolicy` resource in SAM template
- Configured `Access-Control-Allow-Origin` to include frontend domain + localhost
- Attached to CloudFront distribution default cache behavior

**Reason:** Since Origin Access Identity (OAI) prevents all direct S3 access, browsers never interact with S3 directly - only through CloudFront. S3 CORS configuration would be ineffective. CloudFront CORS is the correct approach.

**File:** `backend/template.yaml:284-321` (VideoResponseHeadersPolicy resource)

### 4. Dependency Injection for CloudFront Signer (Testability)
**Deviation:** Added optional `signUrlFn` parameter to `CloudFrontUrlProvider` constructor for dependency injection.

**Original Plan:** Direct import and use of `@aws-sdk/cloudfront-signer`.

**Actual Implementation:**
```typescript
constructor(
  private readonly cloudFrontDomain: string,
  private readonly keyPairId: string,
  private readonly privateKeySecretName: string,
  private readonly urlExpiryMinutes: number,
  private readonly signUrlFn: typeof getSignedUrl = getSignedUrl, // Dependency injection
) { ... }
```

**Reason:** Jest + ESM mocking challenges. Direct mocking of `@aws-sdk/cloudfront-signer` failed due to module immutability. Dependency injection pattern allows tests to inject mock functions while production code uses real implementation.

**Impact:** All 18 unit tests pass without calling real AWS services.

**Files:**
- `backend/src/features/lessons/services/video-url-service.ts:44`
- `backend/src/features/lessons/services/__tests__/video-url-service.test.ts:31-42`

### 5. CloudFront Signer Wrapper Module
**Deviation:** Created wrapper module at `backend/src/lib/cloudfront-signer.ts` instead of using SDK directly.

**Original Plan:** Import `@aws-sdk/cloudfront-signer` directly in service.

**Actual Implementation:**
```typescript
// backend/src/lib/cloudfront-signer.ts
export function getSignedUrl(params: SignedUrlParams): string {
  return awsGetSignedUrl(params);
}
```

**Reason:** Provides abstraction layer for easier mocking and potential future customization. User preference for `lib/` folder location over `infra/`.

**File:** `backend/src/lib/cloudfront-signer.ts`

### 6. Test Utility Script Created
**Deviation:** Created `backend/src/test-signed-url.ts` for manual testing.

**Original Plan:** Not specified in slice spec.

**Actual Implementation:** Standalone TypeScript script to generate signed URLs for validation.

**Reason:** Needed for end-to-end testing of infrastructure without building full API endpoint (Slice 1.3 work). Useful for debugging and verification during deployment.

**File:** `backend/src/test-signed-url.ts`

### 7. Installed tsx as Dev Dependency
**Deviation:** Added `tsx` package for running TypeScript scripts.

**Original Plan:** Not specified.

**Reason:** Needed to execute `test-signed-url.ts` directly without compilation step.

**File:** `backend/package.json` - `"tsx": "4.20.6"` in devDependencies

### 8. CloudFront Distribution Domain from Stack Outputs
**Deviation:** CloudFront domain injected via Lambda environment variable from `!GetAtt` instead of hardcoding.

**Original Plan:** Not explicitly specified.

**Actual Implementation:**
```yaml
CLOUDFRONT_DOMAIN: !GetAtt VideoCloudFrontDistribution.DomainName
```

**Reason:** Eliminates manual configuration. CloudFront domain (e.g., `du0nxa65odbxr.cloudfront.net`) is dynamically retrieved from CloudFormation outputs.

**File:** `backend/template.yaml:455`

## Implementation Notes

### Test Video Validation Results
- ✅ S3 direct access blocked (403 Forbidden)
- ✅ Signed URL generation successful
- ✅ Video accessible via signed CloudFront URL
- ✅ URL expires after 30 minutes as configured
- ✅ CORS headers present in CloudFront response

### Private Key Storage
- Private key stored in Secrets Manager: `learnermax/cloudfront-private-key-preview`
- Accessed by Lambda via IAM permission: `secretsmanager:GetSecretValue`
- Cached in Lambda memory for warm start performance

### All Acceptance Criteria Met
- [x] S3 bucket created with all public access blocked
- [x] CloudFront distribution created with OAI configured
- [x] S3 bucket policy restricts access to CloudFront OAI only
- [x] CloudFront trusted signers enabled (via KeyGroups)
- [x] SAM template validates successfully
- [x] CloudFront distribution domain available in stack outputs
- [x] CloudFront key pair generated (manual one-time setup)
- [x] Private key stored in AWS Secrets Manager
- [x] Lambda IAM role has `secretsmanager:GetSecretValue` permission
- [x] Environment variables configured on Lambda function
- [x] `video-url-service.ts` implements `VideoUrlProvider` interface
- [x] Private key fetched from Secrets Manager with in-memory caching
- [x] Signed URLs expire after 30 minutes
- [x] Service returns both `url` and `expiresAt` fields
- [x] Unit tests verify URL structure and expiration logic (18/18 passing)
- [x] Upload test video to S3: `courses/test-course/lesson-1.mp4`
- [x] Direct S3 URL returns 403 Forbidden
- [x] Signed CloudFront URL plays video successfully
- [x] Unit tests pass for `generateSignedUrl()`
