# Slice 2: Refactor Data Fetching Functions

## Objective

Convert server actions with fetch calls to async functions with `"use cache"` directive. Move from `app/actions/` to `lib/data/`.

## Files to Create

| New File | Source |
|----------|--------|
| `frontend/lib/data/courses.ts` | From `app/actions/courses.ts` |
| `frontend/lib/data/lessons.ts` | From `app/actions/lessons.ts` |
| `frontend/lib/data/meetups.ts` | From `app/actions/meetups.ts` |
| `frontend/lib/data/students.ts` | From `app/actions/students.ts` (reads only) |
| `frontend/lib/data/enrollments.ts` | From `app/actions/enrollments.ts` (reads only) |
| `frontend/lib/data/progress.ts` | From `app/actions/progress.ts` (reads only) |

## Pattern Transformation

### BEFORE (Server Action with old pattern)

```typescript
// frontend/app/actions/courses.ts
'use server';

import { getAuthToken } from './auth';

export async function getAllCourses(): Promise<{ courses: Course[] } | { error: string }> {
  const token = await getAuthToken();
  if (!token) return { error: 'Authentication required' };

  const response = await fetch(`${API_URL}/api/courses`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { tags: ['courses'] },  // OLD PATTERN
  });

  const courses = await response.json();
  return { courses };
}
```

### AFTER (Cached function with new pattern)

```typescript
// frontend/lib/data/courses.ts
import { cacheTag, cacheLife } from 'next/cache';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export async function getAllCourses(token: string): Promise<{ courses: Course[] } | { error: string }> {
  'use cache';
  cacheTag('courses');
  cacheLife('max');

  if (!token) return { error: 'Authentication required' };

  const response = await fetch(`${API_URL}/api/courses`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    return { error: `Failed to fetch courses: ${response.statusText}` };
  }

  const courses = await response.json();
  return { courses };
}
```

## Key Changes

1. **Remove `'use server'`** - These are no longer server actions
2. **Add `'use cache'`** - Inside the function body
3. **Add `cacheTag()`** - For on-demand invalidation
4. **Add `cacheLife()`** - Set cache profile
5. **Token as argument** - Can't call `getAuthToken()` inside cache scope
6. **Remove `next: { tags }`** - Replaced by `cacheTag()`

## Function-by-Function Mapping

### courses.ts

| Function | Cache Profile | Tags |
|----------|---------------|------|
| `getAllCourses(token)` | `'max'` | `'courses'` |
| `getCourse(token, courseId)` | `'max'` | `'course-{courseId}'` |

### lessons.ts

| Function | Cache Profile | Tags |
|----------|---------------|------|
| `getLessons(token, courseId)` | `'max'` | `'lessons-{courseId}'` |
| `getVideoUrl(token, lessonId)` | **NO CACHE** | N/A (signed URLs expire) |

### meetups.ts

| Function | Cache Profile | Tags |
|----------|---------------|------|
| `getMeetups()` | `'minutes'` | `'meetups'` |

Note: Meetups don't need auth token since `isSignedUp` is moving to Student endpoint.

### students.ts (reads only)

| Function | Cache Profile | Tags |
|----------|---------------|------|
| `getStudent(token)` | **NO CACHE** | N/A (user-specific, use SWR) |

### enrollments.ts (reads only)

| Function | Cache Profile | Tags |
|----------|---------------|------|
| `getUserEnrollments(token)` | **NO CACHE** | N/A (user-specific, use SWR) |
| `checkEnrollment(token, courseId)` | **NO CACHE** | N/A (user-specific) |

### progress.ts (reads only)

| Function | Cache Profile | Tags |
|----------|---------------|------|
| `getProgress(token, courseId)` | **NO CACHE** | N/A (user-specific, use SWR) |

## Directory Structure After

```
frontend/lib/data/
├── courses.ts      # getAllCourses, getCourse - CACHED
├── lessons.ts      # getLessons (cached), getVideoUrl (not cached)
├── meetups.ts      # getMeetups - CACHED
├── students.ts     # getStudent - NOT CACHED (use SWR)
├── enrollments.ts  # getUserEnrollments, checkEnrollment - NOT CACHED
└── progress.ts     # getProgress - NOT CACHED (use SWR)
```

## Acceptance Criteria

- [ ] `lib/data/` directory created with all data fetching functions
- [ ] Cached functions use `'use cache'`, `cacheTag()`, `cacheLife()`
- [ ] Non-cached functions (user-specific) remain as regular async functions
- [ ] Auth token passed as argument to all functions that need it
- [ ] Types exported from each file for consumers

## Notes

- Original `app/actions/` files will be cleaned up in Slice 3
- SWR hooks (Slice 4) will use non-cached functions for user-specific data
- Dashboard/Course pages (Slices 6-7) will call cached functions
