# Slice 3.4: In-Course Promotion

**Parent Mainspec:** `specs/premium_course_teaser/mainspec.md`
**Status:** Not Started
**Depends On:**
- Slice 3.2 (Early Access Backend - API endpoint must exist)
- Phase 1 Slice 1.5 (Course Lesson UI - course page must exist)

## Objective
Display a promotional banner inside the mini course that promotes the premium course while students are learning. This keeps the premium course top-of-mind and provides a non-intrusive way to sign up for early access without leaving the learning experience.

## What We're Doing

### 1. Premium Promotion Banner Component

**Create:** `frontend/app/components/PremiumPromotionBanner.tsx`

```typescript
'use client';

import { useState } from 'react';
import { signUpForEarlyAccess } from '@/app/actions/students';

interface PremiumPromotionBannerProps {
  isInterestedInPremium: boolean;
}

export function PremiumPromotionBanner({ isInterestedInPremium }: PremiumPromotionBannerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [hasSignedUp, setHasSignedUp] = useState(isInterestedInPremium);
  const [error, setError] = useState<string | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  const handleEarlyAccessSignup = async () => {
    setIsLoading(true);
    setError(null);

    const result = await signUpForEarlyAccess('premium-spec-course');

    if (result.success) {
      setHasSignedUp(true);
    } else {
      setError(result.error || 'Failed to sign up. Please try again.');
    }

    setIsLoading(false);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    // Optional: Store dismissal in localStorage to persist across page loads
    localStorage.setItem('premiumPromoBannerDismissed', 'true');
  };

  // Don't show if dismissed
  if (isDismissed) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6 relative">
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Dismiss"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pr-8">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-yellow-500 text-white text-xs font-semibold px-2 py-1 rounded">
              COMING SOON
            </span>
            <h3 className="text-lg font-bold text-gray-900">
              Advanced Spec-Driven Development Mastery
            </h3>
          </div>
          <p className="text-gray-600 text-sm">
            Master advanced techniques with real-world case studies, hands-on projects, and in-depth coverage of context engineering patterns.
          </p>
        </div>

        <div className="flex-shrink-0">
          {hasSignedUp ? (
            <div className="flex items-center gap-2 text-green-600 font-medium">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>You're on the list!</span>
            </div>
          ) : (
            <div>
              <button
                onClick={handleEarlyAccessSignup}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2 px-6 rounded whitespace-nowrap transition-colors"
              >
                {isLoading ? 'Signing up...' : 'Join Early Access'}
              </button>
              {error && (
                <p className="text-red-600 text-xs mt-1">{error}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

### 2. Add Banner to Course Page

**Update:** `frontend/app/course/[courseId]/page.tsx`

Add the premium promotion banner between the course header and the video player. It should only show for the free mini course, not for premium courses (when they launch).

```typescript
import { PremiumPromotionBanner } from '@/app/components/PremiumPromotionBanner';
import { getStudent } from '@/app/actions/students';

export default async function CoursePage({ params }: { params: { courseId: string } }) {
  const { courseId } = params;

  // Fetch course, lessons, enrollment, and student data
  const course = await getCourse(courseId);
  const lessons = await getCourseLessons(courseId);
  const enrollment = await checkEnrollment(courseId);
  const student = await getStudent();

  // ... enrollment check logic ...

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Course Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{course.name}</h1>
        <p className="text-gray-600 mt-2">{course.description}</p>
      </div>

      {/* Premium Promotion Banner - Only show for free courses */}
      {course.pricingModel === 'free' && (
        <PremiumPromotionBanner
          isInterestedInPremium={student?.interestedInPremium || false}
        />
      )}

      {/* Video Player and Lesson Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ... video player and lesson list ... */}
      </div>
    </div>
  );
}
```

### 3. Banner Dismissal Persistence

The banner includes a dismiss (X) button that hides it. For MVP, the dismissal is stored in `localStorage` so it persists across page loads within the same browser.

**Dismissal logic:**
- User clicks X button
- Banner disappears immediately
- `localStorage.setItem('premiumPromoBannerDismissed', 'true')` called
- On next page load, check localStorage and don't render if dismissed

**Optional enhancement (not required for MVP):**
```typescript
// Check localStorage on component mount
useEffect(() => {
  const dismissed = localStorage.getItem('premiumPromoBannerDismissed');
  if (dismissed === 'true') {
    setIsDismissed(true);
  }
}, []);
```

## What We're NOT Doing
- No animation/slide-in effects (keep it simple)
- No A/B testing different banner copy
- No tracking banner impressions or click-through rates
- No dynamic positioning (always below course header)
- No video pause/interruption to show banner
- No persistent dismissal across devices (localStorage only)

## Acceptance Criteria

### Banner Display
- [ ] Banner appears on course page below course header
- [ ] Banner only shows for free courses (`pricingModel === 'free'`)
- [ ] Banner does not show for premium courses
- [ ] Banner responsive: horizontal layout on desktop, vertical on mobile
- [ ] "COMING SOON" badge displayed
- [ ] Premium course title and description shown

### Early Access Functionality
- [ ] "Join Early Access" button works correctly
- [ ] Button shows loading state during API call
- [ ] Success: Button replaced with "✓ You're on the list!" message
- [ ] Error: Error message displayed below button
- [ ] If already signed up, shows checkmark immediately (no button)

### Dismissal Functionality
- [ ] X button displayed in top-right corner
- [ ] Clicking X hides banner immediately
- [ ] Dismissal persists across page navigation within course
- [ ] Dismissal persists after page refresh (localStorage)
- [ ] Dismissal is browser-specific (doesn't sync across devices)

### Student State Management
- [ ] `getStudent()` fetches current student profile
- [ ] `interestedInPremium` flag checked on page load
- [ ] Banner reflects current signup status
- [ ] State updates after signup (button → checkmark)

### Visual Design
- [ ] Banner visually distinct but not intrusive
- [ ] Gradient background (blue-to-indigo)
- [ ] Border and rounded corners
- [ ] Hover effects on buttons
- [ ] Responsive layout (stacks vertically on mobile)

## Forward-Looking Requirements

### For Slice 3.5 (Completion Upsell Modal)
- Modal will have similar design language (gradient, badge)
- Will reuse `signUpForEarlyAccess()` action
- Modal is more prominent than banner (blocks content)

### For Future Enhancement
**Track dismissal in backend:**
```typescript
// Add field to Student entity
interface Student {
  premiumPromoBannerDismissed?: boolean;
  premiumPromoBannerDismissedAt?: string;
}

// Sync dismissal across devices
```

**Analytics tracking:**
```typescript
// Track banner impressions
trackEvent('premium_banner_viewed', { courseId, lessonId });

// Track signup source
signUpForEarlyAccess('premium-spec-course', { source: 'in-course-banner' });
```

## Verification Steps

After implementing:

1. **Verify banner appears:**
   - Navigate to `/course/spec-driven-dev-mini`
   - Verify banner appears below course header
   - Should show "COMING SOON" badge and premium course info
   - Should show "Join Early Access" button

2. **Test early access signup (not signed up):**
   - Click "Join Early Access" button
   - Should show loading state
   - Should change to "✓ You're on the list!"
   - Refresh page → Should still show checkmark

3. **Test early access signup (already signed up):**
   - If already signed up from dashboard or modal
   - Banner should immediately show "✓ You're on the list!"
   - No "Join Early Access" button visible

4. **Test dismissal:**
   - Click X button in top-right corner
   - Banner disappears immediately
   - Navigate to different lesson → Banner stays hidden
   - Refresh page → Banner stays hidden
   - Clear localStorage → Banner reappears

5. **Test responsive layout:**
   - Desktop: Banner content horizontal (title/description left, button right)
   - Mobile: Banner content stacks vertically
   - Dismiss button always visible in top-right

6. **Test on premium course (future):**
   - When premium course launches and is accessible
   - Navigate to premium course page
   - Banner should NOT appear

## User Flow Narrative

**Scenario: Student discovers premium course while learning**

1. **Context:** Jessica is watching Lesson 2 of the free mini course. She's learning about prompt engineering vs. context engineering and is really engaged.

2. **Page layout:** The course page shows:
   ```
   [Course Header]
   [Premium Promotion Banner] ← Positioned here
   [Video Player]          [Lesson Sidebar]
   ```

3. **Banner catches attention:** Between watching videos, Jessica notices the banner:
   ```
   [COMING SOON] Advanced Spec-Driven Development Mastery

   Master advanced techniques with real-world case studies,
   hands-on projects, and in-depth coverage of context
   engineering patterns.

   [Join Early Access]                                    [X]
   ```

4. **Interest but not ready:** Jessica thinks "That sounds interesting, but I want to finish this course first." She clicks the X to dismiss the banner.

5. **Banner dismissed:** The banner disappears. Jessica continues learning.

6. **Next lesson:** Jessica navigates to Lesson 3. The banner remains dismissed - she can focus on learning.

7. **Later session:** Jessica returns tomorrow and opens the course again. The banner is still dismissed (localStorage persistence).

**Scenario: Student signs up from banner**

1. **Context:** Marcus is on Lesson 1 of the mini course. He sees the premium promotion banner.

2. **Immediate interest:** Marcus is impressed by the free course quality and wants the advanced version. He clicks "Join Early Access" directly from the banner.

3. **Signup processing:**
   - Button shows "Signing up..."
   - Backend updates student record
   - Success response received

4. **Success feedback:** Banner updates to show:
   ```
   [COMING SOON] Advanced Spec-Driven Development Mastery
   ...
   ✓ You're on the list!                                 [X]
   ```

5. **Continued learning:** Marcus can now dismiss the banner or leave it as a reminder. Either way, he continues with the mini course.

6. **Dashboard visit:** Later, Marcus visits the dashboard. The premium course card shows "✓ You're on the early access list" - consistent with his signup from the banner.

## Deviations from Plan
_(To be filled during implementation)_

Potential considerations:
- May adjust banner positioning (above video vs below header)
- May make dismissal sticky across all free courses (not just current course)
- May add "Learn More" link to course details modal
- May show banner only after completing first lesson (reduce initial overwhelm)
- May add animation on first appearance
