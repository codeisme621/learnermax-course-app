# Slice 3: Create Mutations as Server Actions

## Objective

Keep mutation functions as server actions with `'use server'` directive, organized in `app/actions/mutations/`.

## Files to Create

| File | Functions |
|------|-----------|
| `frontend/app/actions/mutations/enrollments.ts` | `enrollInCourse()` |
| `frontend/app/actions/mutations/progress.ts` | `markLessonComplete()`, `trackLessonAccess()` |
| `frontend/app/actions/mutations/meetups.ts` | `signupForMeetup()` |
| `frontend/app/actions/mutations/students.ts` | `signUpForEarlyAccess()` |

## Files to Delete (After Migration)

After slices 2-4 are complete and verified:
- `frontend/app/actions/courses.ts` (replaced by `lib/data/courses.ts`)
- `frontend/app/actions/lessons.ts` (replaced by `lib/data/lessons.ts`)
- `frontend/app/actions/meetups.ts` (split: reads to `lib/data/`, mutations here)
- `frontend/app/actions/progress.ts` (split: reads to `lib/data/`, mutations here)
- `frontend/app/actions/enrollments.ts` (split: reads to `lib/data/`, mutations here)
- `frontend/app/actions/students.ts` (split: reads to `lib/data/`, mutations here)

Keep:
- `frontend/app/actions/auth.ts` (used by mutations)
- `frontend/app/actions/feedback.ts` (already a mutation)

## Implementation Patterns

### enrollments.ts

```typescript
// frontend/app/actions/mutations/enrollments.ts
'use server';

import { getAuthToken } from '../auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface EnrollmentResult {
  success: boolean;
  enrollment?: Enrollment;
  status?: 'active' | 'pending';
  error?: string;
}

export async function enrollInCourse(courseId: string): Promise<EnrollmentResult> {
  const token = await getAuthToken();
  if (!token) return { success: false, error: 'Authentication required' };

  const response = await fetch(`${API_URL}/api/enrollments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ courseId }),
  });

  if (!response.ok) {
    return { success: false, error: 'Failed to enroll' };
  }

  const data = await response.json();
  return { success: true, enrollment: data.enrollment, status: data.status };
}
```

### progress.ts

```typescript
// frontend/app/actions/mutations/progress.ts
'use server';

import { getAuthToken } from '../auth';
import { ProgressResponse } from '@/lib/data/progress';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export async function markLessonComplete(
  courseId: string,
  lessonId: string
): Promise<ProgressResponse | { error: string }> {
  const token = await getAuthToken();
  if (!token) return { error: 'Authentication required' };

  const response = await fetch(`${API_URL}/api/progress`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ courseId, lessonId }),
  });

  if (!response.ok) {
    return { error: 'Failed to mark lesson complete' };
  }

  return response.json();
}

export async function trackLessonAccess(
  courseId: string,
  lessonId: string
): Promise<void> {
  // Fire-and-forget - don't block UI
  const token = await getAuthToken();
  if (!token) return;

  try {
    await fetch(`${API_URL}/api/progress/access`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ courseId, lessonId }),
    });
  } catch {
    // Fire-and-forget - silently fail
  }
}
```

### meetups.ts

```typescript
// frontend/app/actions/mutations/meetups.ts
'use server';

import { getAuthToken } from '../auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export async function signupForMeetup(
  meetupId: string
): Promise<void | { error: string }> {
  const token = await getAuthToken();
  if (!token) return { error: 'Authentication required' };

  const response = await fetch(`${API_URL}/api/meetups/${meetupId}/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok && response.status !== 409) {
    return { error: 'Failed to sign up for meetup' };
  }
  // 409 = already signed up, treat as success
}
```

### students.ts

```typescript
// frontend/app/actions/mutations/students.ts
'use server';

import { getAuthToken } from '../auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export async function signUpForEarlyAccess(
  courseId: string = 'premium-course'
): Promise<void | { error: string }> {
  const token = await getAuthToken();
  if (!token) return { error: 'Authentication required' };

  const response = await fetch(`${API_URL}/api/students/early-access`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ courseId }),
  });

  if (!response.ok) {
    return { error: 'Failed to sign up for early access' };
  }
}
```

## Directory Structure After

```
frontend/app/actions/
├── auth.ts                  # Keep - used by mutations
├── feedback.ts              # Keep - already a mutation
└── mutations/
    ├── enrollments.ts       # enrollInCourse
    ├── progress.ts          # markLessonComplete, trackLessonAccess
    ├── meetups.ts           # signupForMeetup
    └── students.ts          # signUpForEarlyAccess
```

## Key Points

1. **Server actions stay as `'use server'`** - They can access cookies/headers
2. **Called from SWR hooks** - For optimistic updates
3. **Called from client components** - Direct form submissions or event handlers
4. **Fire-and-forget pattern** - `trackLessonAccess` doesn't block UI

## Acceptance Criteria

- [ ] `app/actions/mutations/` directory created
- [ ] All mutation functions moved with `'use server'` directive
- [ ] Original action files cleaned up (reads moved to `lib/data/`)
- [ ] Mutations work when called from client components

## Notes

- SWR hooks (Slice 4) will import these mutations
- Old action files should be deleted after verifying nothing references them
