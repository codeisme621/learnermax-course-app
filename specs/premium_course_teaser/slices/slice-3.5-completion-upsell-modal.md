# Slice 3.5: Completion Upsell Modal

**Parent Mainspec:** `specs/premium_course_teaser/mainspec.md`
**Status:** Not Started
**Depends On:**
- Slice 3.2 (Early Access Backend - API endpoint must exist)
- Phase 1 Slice 1.4 (Video Player Component - confetti and onCourseComplete callback)

## Objective
Show a premium course upsell modal after the student completes 100% of the mini course. This is the highest-intent moment to capture leads - the student just finished the free course and is likely interested in learning more. The modal appears after the confetti celebration, creating a positive emotional context for the upsell.

## What We're Doing

### 1. Premium Upsell Modal Component

**Create:** `frontend/app/components/PremiumUpsellModal.tsx`

```typescript
'use client';

import { useState } from 'react';
import { signUpForEarlyAccess } from '@/app/actions/students';

interface PremiumUpsellModalProps {
  isOpen: boolean;
  onClose: () => void;
  isInterestedInPremium: boolean;
}

export function PremiumUpsellModal({ isOpen, onClose, isInterestedInPremium }: PremiumUpsellModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [hasSignedUp, setHasSignedUp] = useState(isInterestedInPremium);
  const [error, setError] = useState<string | null>(null);

  const handleEarlyAccessSignup = async () => {
    setIsLoading(true);
    setError(null);

    const result = await signUpForEarlyAccess('premium-spec-course');

    if (result.success) {
      setHasSignedUp(true);
      // Auto-close after 3 seconds to show success message
      setTimeout(() => {
        onClose();
      }, 3000);
    } else {
      setError(result.error || 'Failed to sign up. Please try again.');
    }

    setIsLoading(false);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>

        {/* Modal content */}
        <div className="p-8">
          {/* Congratulations header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Congratulations! 🎉
            </h2>
            <p className="text-lg text-gray-600">
              You've completed the course. Ready to take your skills to the next level?
            </p>
          </div>

          {/* Premium course card */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
            <div className="flex items-start justify-between mb-3">
              <span className="bg-yellow-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                COMING SOON
              </span>
              <span className="text-blue-700 font-bold text-lg">
                $199
              </span>
            </div>

            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              Advanced Spec-Driven Development Mastery
            </h3>

            <p className="text-gray-700 mb-4">
              Master advanced spec-driven development techniques with real-world case studies,
              hands-on projects, and in-depth coverage of context engineering patterns.
              Build a comprehensive portfolio of specs that showcase your expertise.
            </p>

            {/* Learning objectives */}
            <div className="space-y-2 mb-4">
              <p className="text-sm font-semibold text-gray-900">What you'll learn:</p>
              <ul className="space-y-1 text-sm text-gray-700">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-600 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Design complex multi-feature specifications for large codebases
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-600 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Implement advanced context engineering patterns and best practices
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-600 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Build spec-driven development workflows for development teams
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-600 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Create reusable spec templates and pattern libraries
                </li>
              </ul>
            </div>

            <div className="text-sm text-gray-600">
              <span className="font-semibold">Duration:</span> 6-8 hours of in-depth content
            </div>
          </div>

          {/* CTA section */}
          {hasSignedUp ? (
            <div className="text-center py-6">
              <div className="inline-flex items-center gap-3 text-green-600 text-lg font-semibold mb-2">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>You're on the early access list!</span>
              </div>
              <p className="text-gray-600">
                We'll notify you when the course launches.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={handleEarlyAccessSignup}
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-4 px-6 rounded-lg transition-colors text-lg"
              >
                {isLoading ? 'Signing up...' : 'Join Early Access'}
              </button>

              {error && (
                <p className="text-red-600 text-sm text-center">{error}</p>
              )}

              <button
                onClick={onClose}
                className="w-full text-gray-600 hover:text-gray-800 font-medium py-2 transition-colors"
              >
                Maybe later
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

### 2. Integrate Modal with Video Player

**Update:** `frontend/app/course/[courseId]/page.tsx`

Add state management for the modal and pass the `onCourseComplete` callback to the video player:

```typescript
'use client';

import { useState } from 'react';
import { PremiumUpsellModal } from '@/app/components/PremiumUpsellModal';
import { VideoPlayer } from '@/app/components/VideoPlayer';

export default function CoursePage({ course, lessons, student, enrollment }) {
  const [showUpsellModal, setShowUpsellModal] = useState(false);

  const handleCourseComplete = () => {
    // Only show modal for free courses (not premium courses in future)
    if (course.pricingModel === 'free') {
      setShowUpsellModal(true);
    }
  };

  return (
    <div>
      {/* ... course header and banner ... */}

      <VideoPlayer
        lesson={currentLesson}
        onProgress={handleProgress}
        onLessonComplete={handleLessonComplete}
        onCourseComplete={handleCourseComplete}  // NEW: Pass callback
      />

      {/* Premium Upsell Modal */}
      <PremiumUpsellModal
        isOpen={showUpsellModal}
        onClose={() => setShowUpsellModal(false)}
        isInterestedInPremium={student?.interestedInPremium || false}
      />

      {/* ... rest of page ... */}
    </div>
  );
}
```

### 3. Update Video Player to Trigger Modal

**Update:** `frontend/app/components/VideoPlayer.tsx`

Ensure the video player fires the `onCourseComplete` callback after showing confetti (from Phase 1 Slice 1.4):

```typescript
interface VideoPlayerProps {
  lesson: Lesson;
  onProgress: (progress: number) => void;
  onLessonComplete: () => void;
  onCourseComplete?: () => void;  // NEW: Optional callback
}

export function VideoPlayer({ lesson, onProgress, onLessonComplete, onCourseComplete }: VideoPlayerProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  const handleProgress = async (state) => {
    const progress = (state.played * 100);

    // Lesson completion at 90%
    if (progress >= 90 && !lessonCompleted) {
      setLessonCompleted(true);
      await onLessonComplete();

      // Check if course is complete
      const courseProgress = await getCurrentCourseProgress();
      if (courseProgress === 100) {
        // Show confetti
        setShowConfetti(true);

        // After 3 seconds, hide confetti and trigger modal
        setTimeout(() => {
          setShowConfetti(false);
          if (onCourseComplete) {
            onCourseComplete();
          }
        }, 3000);
      }
    }
  };

  return (
    <div className="relative">
      <ReactPlayer
        url={videoUrl}
        onProgress={handleProgress}
        // ... other props
      />

      {/* Confetti overlay */}
      {showConfetti && (
        <Confetti
          width={width}
          height={height}
          recycle={false}
          numberOfPieces={200}
        />
      )}
    </div>
  );
}
```

## What We're NOT Doing
- No multi-step modal (just single screen)
- No payment integration (early access only, no checkout)
- No course preview video in modal
- No testimonials or social proof
- No countdown timer or urgency tactics
- No email capture for non-authenticated users (must be signed in)
- No analytics tracking (can add later)

## Acceptance Criteria

### Modal Display
- [ ] Modal appears after confetti animation (3 seconds after 100% completion)
- [ ] Modal only shows for free courses
- [ ] Modal does not show for premium courses (future-proofing)
- [ ] Modal has dark overlay backdrop
- [ ] Modal is centered on screen
- [ ] Modal is responsive (scrollable on mobile if content too tall)

### Modal Content
- [ ] Congratulations header with checkmark icon
- [ ] "COMING SOON" badge displayed
- [ ] Premium course title and price shown
- [ ] Premium course description shown
- [ ] 4 learning objectives listed with checkmarks
- [ ] Duration displayed
- [ ] Gradient background on course card section

### Early Access Functionality
- [ ] "Join Early Access" button prominently displayed
- [ ] Button shows loading state during API call
- [ ] Success: Button replaced with "✓ You're on the early access list!" message
- [ ] Success: Modal auto-closes after 3 seconds
- [ ] Error: Error message displayed below button
- [ ] If already signed up, shows success message immediately (no button)

### Modal Controls
- [ ] X button in top-right corner closes modal
- [ ] "Maybe later" link at bottom closes modal
- [ ] Click outside modal (on backdrop) does NOT close (intentional - high-value moment)
- [ ] ESC key closes modal (browser default behavior)
- [ ] Modal can be reopened by completing course again (edge case)

### Integration with Video Player
- [ ] `onCourseComplete` callback passed to VideoPlayer
- [ ] Modal triggered after confetti animation completes
- [ ] Timing: Confetti shows for 3 seconds, then modal appears
- [ ] No modal shown if course incomplete

### Student State Management
- [ ] `isInterestedInPremium` checked when modal opens
- [ ] If already signed up, shows success state immediately
- [ ] State updates after signup within modal
- [ ] Closing modal and reopening shows updated state

## Forward-Looking Requirements

### For Future Premium Course Launch
**When premium course launches:**
- Modal should not appear after completing premium course
- Modal logic: `if (course.pricingModel === 'free')` prevents this
- Or: Replace with "Rate this course" or "Share with friends" modal for premium completions

### For Future Enhancement
**Add analytics tracking:**
```typescript
// Track modal views
trackEvent('upsell_modal_viewed', { courseId, completionTime });

// Track early access signups
trackEvent('early_access_signup', { source: 'completion-modal' });

// Track dismissals
trackEvent('upsell_modal_dismissed', { hadSignedUp: boolean });
```

**A/B testing different copy:**
```typescript
const modalVariant = Math.random() < 0.5 ? 'A' : 'B';
// Show different headline, description, or CTA
```

**Add social proof:**
```typescript
<p>Join 247 developers already on the early access list</p>
```

## Verification Steps

After implementing:

1. **Verify modal timing:**
   - Complete lesson 3 (final lesson) to 90%
   - Confetti should appear
   - Wait 3 seconds
   - Modal should appear after confetti stops

2. **Test early access signup (not signed up):**
   - Modal displays with "Join Early Access" button
   - Click button
   - Button shows "Signing up..." loading state
   - Success message appears: "✓ You're on the early access list!"
   - Modal auto-closes after 3 seconds

3. **Test early access signup (already signed up):**
   - Complete course when already signed up
   - Modal displays with success message immediately
   - No "Join Early Access" button visible
   - Modal auto-closes after 3 seconds

4. **Test modal controls:**
   - Click X button → Modal closes
   - Reopen modal by completing course again
   - Click "Maybe later" → Modal closes
   - Click backdrop (outside modal) → Modal stays open (intentional)
   - Press ESC key → Modal closes

5. **Test error handling:**
   - Simulate API error (disconnect network)
   - Click "Join Early Access"
   - Error message displays below button
   - Can retry after fixing network

6. **Test responsive design:**
   - Desktop: Modal centered, readable width
   - Tablet: Modal takes more width, still centered
   - Mobile: Modal scrollable if content tall, full width with padding

## User Flow Narrative

**Scenario: Student completes mini course and signs up**

1. **Context:** Alex just watched the final lesson (Lesson 3) to 90%. He's excited about what he learned.

2. **Confetti celebration:** The video player shows confetti animation celebrating his completion. Alex feels a sense of accomplishment.

3. **3 seconds pass:** The confetti animation runs for 3 seconds, giving Alex a moment to enjoy the achievement.

4. **Modal appears:** The confetti fades and a modal slides in:
   ```
   Congratulations! 🎉
   You've completed the course. Ready to take your skills to the next level?

   [Premium Course Card with gradient background]
   COMING SOON | $199
   Advanced Spec-Driven Development Mastery

   [Description]
   [4 Learning Objectives with checkmarks]
   Duration: 6-8 hours

   [Join Early Access] (big blue button)
   Maybe later
   ```

5. **Alex is interested:** He reads through the learning objectives. They're exactly what he wants to learn next.

6. **Signup:** Alex clicks "Join Early Access."

7. **Loading state:** Button changes to "Signing up..." for 1-2 seconds.

8. **Success:** The button section transforms:
   ```
   ✓ You're on the early access list!
   We'll notify you when the course launches.
   ```

9. **Auto-close:** After 3 seconds, the modal automatically closes. Alex is back to the course page, which now shows "100% • 3 of 3 lessons completed."

10. **Confirmation:** Alex navigates to the dashboard. The premium course card shows "✓ You're on the early access list" - confirming his signup.

**Scenario: Student dismisses modal**

1. **Context:** Maria completes the mini course. Confetti appears, then the upsell modal.

2. **Not interested right now:** Maria reads the modal but isn't ready to commit to a paid course. She clicks "Maybe later."

3. **Modal closes:** The modal disappears and Maria returns to the course page.

4. **Later visit:** Maria can still see the premium course on her dashboard with "Join Early Access" button available. She can sign up anytime.

**Scenario: Student already signed up**

1. **Context:** David signed up for early access from the in-course banner while on Lesson 2. Now he's completing Lesson 3.

2. **Completion:** David reaches 90% on Lesson 3. Confetti appears.

3. **Modal appears:** After confetti, the upsell modal displays, but instead of a button, it shows:
   ```
   ✓ You're on the early access list!
   We'll notify you when the course launches.
   ```

4. **Auto-close:** After 3 seconds, the modal automatically closes. David doesn't need to take any action.

5. **Clean experience:** David appreciates that the system remembered his signup and didn't prompt him again.

## Deviations from Plan
_(To be filled during implementation)_

Potential considerations:
- May adjust auto-close timing (3 seconds might be too fast)
- May add option to manually close success message (not auto-close)
- May add "Share your achievement" social sharing buttons
- May show different modal content for students who already signed up (e.g., "What's next?")
- May add course preview video embed
