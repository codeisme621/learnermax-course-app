# Slice 7.1: Tag-Based Fetch Caching

## Objective

Update the frontend server actions to use Next.js tag-based caching (`next: { tags: [...] }`) for courses and lessons data. Also remove the redundant `generateMetadata()` from the course page to eliminate duplicate API calls.

## User Stories

- As a student, I want the dashboard and course pages to load faster because course and lesson data is cached
- As a developer, I want to reduce unnecessary backend API calls for data that rarely changes

## What We're Implementing

1. Update `getAllCourses()` to cache with tag `courses`
2. Update `getCourse()` to cache with tag `course-{courseId}`
3. Update `getLessons()` to cache with tag `lessons-{courseId}`
4. Remove `generateMetadata()` from course page and use static metadata
5. Keep `getVideoUrl()` as `cache: 'no-store'` (signed URLs expire)

## Technical Details

### File Changes

#### 1. Update `frontend/app/actions/courses.ts`

**getAllCourses() - BEFORE:**
```typescript
const response = await fetch(endpoint, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  cache: 'no-store', // Always fetch fresh course data
});
```

**getAllCourses() - AFTER:**
```typescript
const response = await fetch(endpoint, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  next: { tags: ['courses'] }, // Tag-based caching with manual invalidation
});
```

**getCourse() - BEFORE (lines 121-128):**
```typescript
const response = await fetch(endpoint, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  cache: 'no-store', // Always fetch fresh course data
});
```

**getCourse() - AFTER:**
```typescript
const response = await fetch(endpoint, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  next: { tags: [`course-${courseId}`] }, // Tag-based caching with manual invalidation
});
```

**Note:** The `courseId` is passed as a parameter to `getCourse()`, so we use template literal for the tag.

#### 2. Update `frontend/app/actions/lessons.ts`

**getLessons() - BEFORE (lines 67-74):**
```typescript
const response = await fetch(endpoint, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  cache: 'no-store', // Always fetch fresh lesson data
});
```

**getLessons() - AFTER:**
```typescript
const response = await fetch(endpoint, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  next: { tags: [`lessons-${courseId}`] }, // Tag-based caching with manual invalidation
});
```

**getVideoUrl() - NO CHANGE (keep as-is):**
```typescript
const response = await fetch(endpoint, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  cache: 'no-store', // Never cache video URLs (they expire)
});
```

#### 3. Update `frontend/app/course/[courseId]/page.tsx`

**BEFORE (lines 29-44):**
```typescript
export async function generateMetadata({ params }: CoursePageProps): Promise<Metadata> {
  const { courseId } = await params;
  const courseResult = await getCourse(courseId);

  if ('course' in courseResult) {
    return {
      title: `${courseResult.course.name} - LearnWithRico`,
      description: courseResult.course.description,
    };
  }

  return {
    title: 'Course - LearnWithRico',
    description: 'Access your course content',
  };
}
```

**AFTER:**
```typescript
// Static metadata - protected page doesn't need SEO
export const metadata: Metadata = {
  title: 'Course - LearnWithRico',
  description: 'Access your course content',
};
```

**Why this change:**
- The course page is protected (requires authentication)
- SEO crawlers can't access authenticated pages
- `generateMetadata()` was making a duplicate API call to `getCourse()`
- The page component already calls `getCourse()` at line 63
- Static metadata eliminates this redundant call

### Files NOT Changed

| File | Reason |
|------|--------|
| `frontend/app/actions/progress.ts` | Progress is user-specific, keep `cache: 'no-store'` |
| `frontend/app/actions/enrollments.ts` | Enrollments are user-specific, keep `cache: 'no-store'` |
| `frontend/app/actions/students.ts` | Student data is user-specific, keep `cache: 'no-store'` |
| `frontend/lib/api/courses.ts` | Only used for SSG landing page with `cache: 'force-cache'` |

### Cache Tag Summary

| Server Action | Cache Tag | Invalidate With |
|---------------|-----------|-----------------|
| `getAllCourses()` | `courses` | `bun run invalidate-cache courses` |
| `getCourse(courseId)` | `course-{courseId}` | `bun run invalidate-cache course-spec-driven-dev-mini` |
| `getLessons(courseId)` | `lessons-{courseId}` | `bun run invalidate-cache lessons-spec-driven-dev-mini` |

## Testing

### Manual Testing

1. **Verify caching works:**
   - Deploy to Vercel preview
   - Visit dashboard, note load time
   - Refresh page, should be faster (cache hit)
   - Check Vercel logs for reduced backend API calls

2. **Verify course page doesn't duplicate calls:**
   - Visit `/course/spec-driven-dev-mini`
   - Check backend logs - should see only ONE call to `/api/courses/spec-driven-dev-mini`
   - Before this change, you'd see TWO calls (one from generateMetadata, one from page)

3. **Verify video URLs still work:**
   - Play a video in the course
   - Video URL should still be fetched fresh each time
   - Check that signed URL works and video plays

### Verification Commands

```bash
# Check Vercel function logs for cache behavior
vercel logs --follow

# Look for patterns like:
# - "Cache: HIT" or "Cache: MISS" in headers
# - Reduced latency on subsequent requests
```

## Acceptance Criteria

- [ ] `getAllCourses()` uses `next: { tags: ['courses'] }`
- [ ] `getCourse()` uses `next: { tags: ['course-{courseId}'] }`
- [ ] `getLessons()` uses `next: { tags: ['lessons-{courseId}'] }`
- [ ] `getVideoUrl()` still uses `cache: 'no-store'`
- [ ] Course page has static `metadata` export instead of `generateMetadata()`
- [ ] Dashboard loads faster on subsequent visits
- [ ] Course page only makes one API call for course data
- [ ] Videos still play correctly with fresh signed URLs

## Dependencies

- None (this slice can be implemented independently)

## Forward Requirements for Slice 7.2

- Slice 7.2 will create the `/api/revalidate` endpoint and Bun CLI
- The cache tags defined here (`courses`, `course-{id}`, `lessons-{id}`) will be used by the invalidation tool
