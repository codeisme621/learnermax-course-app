# Slice 1.2: Video Infrastructure (AWS)

**Parent Mainspec:** `specs/course_content_system/mainspec.md`
**Status:** Not Started
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
_(To be filled during implementation)_

Potential considerations:
- May adjust URL expiry time based on video length analysis
- May add thumbnail support: `courses/{courseId}/thumbnails/lesson-{order}.jpg`
- May use CloudFront Functions for simpler auth (if signed URLs prove complex)
