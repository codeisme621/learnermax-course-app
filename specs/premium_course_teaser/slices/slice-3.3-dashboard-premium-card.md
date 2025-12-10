# Slice 3.3: Dashboard Premium Card

**Parent Mainspec:** `specs/premium_course_teaser/mainspec.md`
**Status:** Not Started
**Depends On:**
- Slice 3.1 (Premium Course Placeholder - course must exist in database)
- Slice 3.2 (Early Access Backend - API endpoint must exist)

## Prerequisites

Before implementing this slice, ensure these are complete:

- ✅ **Slice 3.1 complete**: Course type extended with `comingSoon`, `estimatedDuration` fields
- ✅ **Slice 3.1 complete**: Premium course record created in DynamoDB with `comingSoon: true`
- ✅ **Slice 3.2 complete**: Student type extended with `interestedInPremium` field
- ✅ **Slice 3.2 complete**: `POST /api/students/early-access` endpoint exists
- ✅ **Slice 3.2 complete**: `getStudent()` server action available in `frontend/app/actions/students.ts`

## Objective
Display the premium course on the dashboard with a "Coming Soon" badge and early access signup functionality. The card should show different states based on whether the student has already signed up for early access.

## What We're Doing

### 1. Fetch Premium Course on Dashboard

The premium course should appear alongside the mini course on the dashboard. The existing `getCourses()` action in `frontend/app/actions/courses.ts` already fetches all courses, so the premium course will automatically be included once it exists in the database.

**No changes needed to API calls** - the premium course will be returned in the existing course list.

### 2. Update Dashboard to Display Premium Course

**Update:** `frontend/app/dashboard/page.tsx`

The dashboard should render both courses (mini course and premium course) with different UI treatment based on the `comingSoon` flag.

**Course card states:**

**State 1: Coming Soon + Not Signed Up**
```
┌─────────────────────────────────────┐
│ [Course Image]                      │
│                                     │
│ Advanced Spec-Driven Development    │
│ Mastery                             │
│                                     │
│ Master advanced spec-driven...      │
│                                     │
│ ┌───────────────┐                  │
│ │ COMING SOON   │    6-8 hours     │
│ └───────────────┘                  │
│                                     │
│ [Join Early Access] ← Blue button  │
└─────────────────────────────────────┘
```

**State 2: Coming Soon + Already Signed Up**
```
┌─────────────────────────────────────┐
│ [Course Image]                      │
│                                     │
│ Advanced Spec-Driven Development    │
│ Mastery                             │
│                                     │
│ Master advanced spec-driven...      │
│                                     │
│ ┌───────────────┐                  │
│ │ COMING SOON   │    6-8 hours     │
│ └───────────────┘                  │
│                                     │
│ ✓ You're on the early access list  │
└─────────────────────────────────────┘
```

**State 3: Available Course (Mini Course)**
```
┌─────────────────────────────────────┐
│ [Course Image]                      │
│                                     │
│ Spec-Driven Development with        │
│ Context Engineering                 │
│                                     │
│ Learn how to build better...        │
│                                     │
│ FREE • 3 lessons • 45 minutes       │
│                                     │
│ [Continue] or [Enroll Now]         │
└─────────────────────────────────────┘
```

### 3. Premium Course Card Component

**Create:** `frontend/app/components/PremiumCourseCard.tsx`

```typescript
'use client';

import { useState } from 'react';
import { signUpForEarlyAccess } from '@/app/actions/students';
import type { Course } from '@/app/actions/courses';

interface PremiumCourseCardProps {
  course: Course;
  isInterestedInPremium: boolean;
}

export function PremiumCourseCard({ course, isInterestedInPremium }: PremiumCourseCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [hasSignedUp, setHasSignedUp] = useState(isInterestedInPremium);
  const [error, setError] = useState<string | null>(null);

  const handleEarlyAccessSignup = async () => {
    setIsLoading(true);
    setError(null);

    const result = await signUpForEarlyAccess(course.courseId);

    if (result.success) {
      setHasSignedUp(true);
    } else {
      setError(result.error || 'Failed to sign up. Please try again.');
    }

    setIsLoading(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {/* Course Image */}
      <div className="relative h-48 bg-gray-200">
        {course.imageUrl ? (
          <img
            src={course.imageUrl}
            alt={course.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            No image
          </div>
        )}

        {/* Coming Soon Badge */}
        <div className="absolute top-4 left-4">
          <span className="bg-yellow-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
            COMING SOON
          </span>
        </div>
      </div>

      {/* Course Content */}
      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          {course.name}
        </h3>

        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {course.description}
        </p>

        {/* Course Meta */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          {/* Show price for available paid courses, hide for coming soon */}
          {!course.comingSoon && course.pricingModel === 'paid' && course.price && (
            <>
              <span className="font-semibold text-blue-600">
                ${(course.price / 100).toFixed(2)}
              </span>
              {course.estimatedDuration && <span>•</span>}
            </>
          )}
          {course.estimatedDuration && (
            <span>{course.estimatedDuration}</span>
          )}
        </div>

        {/* Early Access CTA or Status */}
        {hasSignedUp ? (
          <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>You're on the early access list</span>
          </div>
        ) : (
          <div>
            <button
              onClick={handleEarlyAccessSignup}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2 px-4 rounded transition-colors"
            >
              {isLoading ? 'Signing up...' : 'Join Early Access'}
            </button>

            {error && (
              <p className="text-red-600 text-sm mt-2">{error}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

### 4. Update Dashboard to Use Premium Course Card

**Update:** `frontend/app/dashboard/page.tsx`

```typescript
import { PremiumCourseCard } from '@/app/components/PremiumCourseCard';
import { getCourses } from '@/app/actions/courses';
import { getUserEnrollments } from '@/app/actions/enrollments';

export default async function DashboardPage() {
  const courses = await getCourses();
  const enrollments = await getUserEnrollments();

  // Get current student's early access status
  // TODO: Add getStudent() action in Slice 3.2 if not already exists
  const student = await getStudent(); // Returns { interestedInPremium: boolean }

  // Separate coming soon courses from available courses
  const availableCourses = courses?.filter(c => !c.comingSoon) || [];
  const comingSoonCourses = courses?.filter(c => c.comingSoon) || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Dashboard</h1>

      {/* Available Courses */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Your Courses</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableCourses.map(course => (
            <RegularCourseCard
              key={course.courseId}
              course={course}
              enrollment={enrollments?.find(e => e.courseId === course.courseId)}
            />
          ))}
        </div>
      </section>

      {/* Coming Soon Courses */}
      {comingSoonCourses.length > 0 && (
        <section>
          <h2 className="text-2xl font-semibold mb-4">Coming Soon</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {comingSoonCourses.map(course => (
              <PremiumCourseCard
                key={course.courseId}
                course={course}
                isInterestedInPremium={student?.interestedInPremium || false}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
```

### 5. Add getStudent() Server Action

**Update:** `frontend/app/actions/students.ts`

Add a function to fetch the current student's profile (needed to check `interestedInPremium` status):

```typescript
/**
 * Get current student profile
 *
 * @returns Student profile or null if error
 */
export async function getStudent(): Promise<Student | null> {
  console.log('[getStudent] Fetching current student profile');

  try {
    const token = await getAuthToken();

    if (!token) {
      console.warn('[getStudent] Not authenticated - no auth token');
      return null;
    }

    console.log('[getStudent] ID token obtained, length:', token.length);
    const apiUrl = getApiUrl();
    const endpoint = `${apiUrl}/api/students/me`;
    console.log('[getStudent] Calling endpoint:', endpoint);

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      cache: 'no-store', // Always fetch fresh student data
    });

    console.log('[getStudent] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[getStudent] Backend returned error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      return null;
    }

    const student: Student = await response.json();
    console.log('[getStudent] Successfully fetched student profile');
    return student;
  } catch (error) {
    console.error('[getStudent] Exception occurred:', error);
    return null;
  }
}
```

## What We're NOT Doing
- No detailed course preview modal for coming soon courses
- No email capture for non-authenticated users (must sign in first)
- No social sharing for early access
- No countdown timer to launch date (keeping it vague)
- No early bird pricing or special offers

## Acceptance Criteria

### Premium Course Display
- [ ] Premium course appears on dashboard in "Coming Soon" section
- [ ] "COMING SOON" badge displayed on course card (yellow/gold color)
- [ ] Course image, name, description shown correctly
- [ ] Estimated duration displayed: "6-8 hours"
- [ ] Price NOT displayed for coming soon courses (because `comingSoon: true`)
- [ ] When `comingSoon: false` in future, price WILL be displayed for paid courses

### Early Access Functionality
- [ ] "Join Early Access" button appears if not signed up
- [ ] Button shows loading state while processing
- [ ] Success: Button replaced with "✓ You're on the early access list" message
- [ ] Error: Error message displayed below button
- [ ] Multiple clicks handled gracefully (no duplicate API calls during loading)

### Student State Management
- [ ] `getStudent()` action fetches current student profile
- [ ] `interestedInPremium` flag checked on dashboard load
- [ ] If already signed up, shows "You're on the list" immediately (no button)
- [ ] State persists across page refreshes

### Dashboard Organization
- [ ] Available courses shown in "Your Courses" section
- [ ] Coming soon courses shown in "Coming Soon" section
- [ ] Sections appear in correct order (available first, then coming soon)
- [ ] Grid layout responsive (1 col mobile, 2 col tablet, 3 col desktop)

### Visual Design
- [ ] Premium card visually distinct from regular course cards
- [ ] "COMING SOON" badge stands out (yellow/gold color)
- [ ] Early access button prominent (blue, full width)
- [ ] Success checkmark icon displayed correctly
- [ ] Hover effects work on course cards

## Forward-Looking Requirements

### For Slice 3.4 (In-Course Promotion)
- Will use similar `PremiumCourseCard` component but in banner format
- Will reuse `signUpForEarlyAccess()` action

### For Slice 3.5 (Completion Upsell Modal)
- Modal will also call `signUpForEarlyAccess()` action
- Will need to refresh student state after signup

### For Future Launch (Post-MVP)
**When premium course launches:**
1. Set `comingSoon: false` in course record
2. **Price will automatically appear** on course card (logic: `!course.comingSoon && course.pricingModel === 'paid'`)
3. Card automatically moves to "Your Courses" section
4. "Join Early Access" button replaced with "Enroll Now" button
5. Enrollment flow uses Stripe integration (future phase)

**Key Point:** The price display logic checks `comingSoon` flag, NOT just `pricingModel`. This means:
- `comingSoon: true` + `paid` → Hide price, show "COMING SOON"
- `comingSoon: false` + `paid` → Show price (e.g., "$49.99")
- `comingSoon: false` + `free` → Show "FREE"

## Verification Steps

After implementing:

1. **Verify premium course appears:**
   - Navigate to `/dashboard`
   - Should see two sections: "Your Courses" and "Coming Soon"
   - Premium course should be in "Coming Soon" section
   - Should have yellow "COMING SOON" badge

2. **Test early access signup (not signed up yet):**
   - See "Join Early Access" button
   - Click button
   - Should show loading state
   - Should change to "✓ You're on the early access list"
   - Refresh page → Status should persist (still shows checkmark)

3. **Test early access signup (already signed up):**
   - Sign up for early access (via modal or dashboard)
   - Navigate back to dashboard
   - Should immediately show "✓ You're on the early access list"
   - No "Join Early Access" button visible

4. **Test error handling:**
   - Sign out
   - Try to access dashboard
   - Premium course should still display but in loading/error state
   - Or redirect to sign-in (depending on auth strategy)

5. **Test responsive layout:**
   - Mobile (< 768px): 1 column grid
   - Tablet (768px - 1024px): 2 column grid
   - Desktop (> 1024px): 3 column grid

## User Flow Narrative

**Scenario 1: New student discovers premium course on dashboard**

1. **Context:** Michael just enrolled in the free mini course. He navigates to his dashboard to start learning.

2. **Dashboard loads:** Michael sees two sections:
   - "Your Courses" - Shows the mini course with "Start Course" button
   - "Coming Soon" - Shows the premium course with yellow badge

3. **Premium course catches attention:** Michael reads:
   ```
   Advanced Spec-Driven Development Mastery
   COMING SOON

   Master advanced spec-driven development techniques with real-world
   case studies, hands-on projects, and in-depth coverage of context
   engineering patterns.

   6-8 hours
   ```

4. **Interest sparked:** Michael clicks "Join Early Access" button.

5. **Signup processing:**
   - Button shows "Signing up..." with disabled state
   - Backend updates student record
   - Success response received

6. **Success feedback:** Button is replaced with:
   ```
   ✓ You're on the early access list
   ```

7. **Confirmation:** Michael refreshes the page to verify. The checkmark status persists - he's confirmed on the list.

**Scenario 2: Returning student who already signed up**

1. **Context:** Sarah signed up for early access yesterday after completing lesson 1. She returns to the dashboard today.

2. **Dashboard loads:** The `getStudent()` action fetches her profile:
   ```typescript
   {
     studentId: "student-456",
     interestedInPremium: true,
     premiumInterestDate: "2025-01-14T10:30:00Z"
   }
   ```

3. **Premium card renders:** Immediately shows:
   ```
   ✓ You're on the early access list
   ```
   No button is displayed - she's already signed up.

4. **Peace of mind:** Sarah is reassured she's on the list and continues with her mini course.

## Deviations from Plan
_(To be filled during implementation)_

Potential considerations:
- May adjust badge color for better visibility
- May add tooltip explaining what "early access" means
- May add course preview/details modal
- May show signup count: "Join 247 others on the early access list"
- May add "Share with friends" functionality
