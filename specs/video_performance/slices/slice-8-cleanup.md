# Slice 8: Cleanup

## Objective

Remove legacy signed URL code and delete original MP4 files after verifying HLS is working in production.

## Why This Slice

- Legacy code creates maintenance burden and confusion
- Original MP4 files consume storage costs
- Clean codebase is easier to reason about
- Only do this after production verification (wait ~1 week)

## Dependencies

- Slice 7 (All behaviors verified working in production)
- Production deployment stable for 1+ week

---

## Pre-Cleanup Verification

Before running cleanup scripts:

- [ ] HLS playback working in production for 1+ week
- [ ] No error reports from users
- [ ] All lessons have `hlsManifestKey` in DynamoDB
- [ ] CloudWatch shows healthy video metrics
- [ ] Verify script confirms all HLS manifests exist in S3

---

## Deliverables

### 8.1 Remove Legacy Video URL Code

**Files to DELETE (Backend):**
```
backend/src/features/lessons/services/video-url-service.ts  # Signed URL generation
backend/src/lib/cloudfront-signer.ts                        # If only used for URLs
```

Note: Frontend cleanup (`useVideoUrl` hook, `fetchVideoUrl`) was done in Slice 7.

**Backend Routes to UPDATE:**

`backend/src/features/lessons/lesson.routes.ts`
- Remove `/video-url` endpoint (if it exists)

`backend/src/features/lessons/lesson.types.ts`
```typescript
// BEFORE
export interface LessonEntity {
  // ... other fields
  videoKey: string;           // S3 key for MP4 (legacy)
  hlsManifestKey?: string;    // S3 key for HLS manifest
}

// AFTER
export interface LessonEntity {
  // ... other fields
  hlsManifestKey: string;     // S3 key for HLS manifest (required now)
}
```

### 8.2 Delete Original MP4 Files

**Script:** `backend/scripts/cleanup-mp4-files.ts`

```typescript
#!/usr/bin/env npx ts-node

/**
 * Delete original MP4 files after HLS migration verified.
 *
 * CAUTION: This is destructive! Run verification first.
 *
 * Usage:
 *   DRY_RUN=true npx ts-node scripts/cleanup-mp4-files.ts  # Preview
 *   npx ts-node scripts/cleanup-mp4-files.ts               # Delete
 */

import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { lessonRepository } from '../src/features/lessons/lesson.repository';

const DRY_RUN = process.env.DRY_RUN === 'true';

async function cleanup() {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no deletions)' : 'LIVE (will delete files)'}\n`);

  const lessons = await lessonRepository.getAllLessons();
  const s3 = new S3Client({});
  const bucket = process.env.VIDEO_BUCKET!;

  let deleted = 0;
  let skipped = 0;
  let errors = 0;

  for (const lesson of lessons) {
    // Only delete if HLS exists
    if (!lesson.hlsManifestKey) {
      console.log(`[SKIP] ${lesson.lessonId}: No HLS, keeping MP4`);
      skipped++;
      continue;
    }

    if (!lesson.videoKey) {
      console.log(`[SKIP] ${lesson.lessonId}: No MP4 to delete`);
      skipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`[DRY] Would delete: ${lesson.videoKey}`);
      deleted++;
      continue;
    }

    try {
      // Delete MP4 from S3
      await s3.send(new DeleteObjectCommand({
        Bucket: bucket,
        Key: lesson.videoKey,
      }));

      // Remove videoKey from DynamoDB
      await lessonRepository.update(lesson.lessonId, { videoKey: null });

      console.log(`[OK] Deleted: ${lesson.videoKey}`);
      deleted++;
    } catch (error) {
      console.error(`[ERR] ${lesson.lessonId}: ${error.message}`);
      errors++;
    }
  }

  console.log('\n---');
  console.log(`Deleted: ${deleted}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
}

cleanup().catch(console.error);
```

### 8.3 Final Lesson Entity

After cleanup, the lesson entity is simplified:

```typescript
export interface LessonEntity {
  PK: string;                 // "COURSE#<courseId>"
  SK: string;                 // "LESSON#<lessonId>"
  lessonId: string;
  courseId: string;
  title: string;
  description?: string;
  order: number;
  hlsManifestKey: string;     // S3 path to HLS manifest (required)
  duration?: number;          // Video duration in seconds
  createdAt: string;
  updatedAt: string;
}
```

---

## Execution Order

1. **Verify HLS working** - Production stable for 1+ week
2. **Dry run cleanup** - See what would be deleted
   ```bash
   DRY_RUN=true npx ts-node scripts/cleanup-mp4-files.ts
   ```
3. **Remove code** - Delete legacy files, update types
4. **Deploy code changes** - No MP4 code paths remain
5. **Delete MP4 files** - Run cleanup script
   ```bash
   npx ts-node scripts/cleanup-mp4-files.ts
   ```
6. **Final verification** - All video still plays, no 404s

---

## Rollback Plan

Before deleting MP4s, consider:
- Keep MP4s in S3 for 30 days before permanent deletion (S3 versioning or lifecycle rules)
- This allows re-encoding if issues are discovered
- After 30 days of stable production, permanently delete

---

## Acceptance Criteria

- [ ] No 404 errors for removed endpoints
- [ ] No references to `videoKey` in codebase (except migration scripts)
- [ ] No MP4 files in S3 `videos/` prefix
- [ ] `hlsManifestKey` is required (not optional) in types
- [ ] All video playback still works
- [ ] Storage costs reduced (CloudWatch metrics)

---

## Storage Cost Impact

| Before | After |
|--------|-------|
| MP4 (original) + HLS segments | HLS segments only |
| ~100% storage | ~60-70% storage |

Savings come from:
- No duplicate storage (MP4 + HLS)
- HLS segments are more efficient for varied quality
- Lower quality renditions reduce per-video size
