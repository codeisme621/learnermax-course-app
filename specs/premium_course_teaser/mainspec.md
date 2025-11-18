# Feature - Premium Course Teaser & Early Access

## Background
Phase 1 built the course platform, Phase 2 created the free mini course. Now we need to set up the premium course as a "coming soon" offering with early access signup. This creates the upsell funnel: students complete the free mini course → see premium course promotion → sign up for early access.

The premium course will be a paid, in-depth version covering advanced spec-driven development techniques. For MVP, we're not building the full premium course content or payment flow—just the teaser, promotion, and early access lead capture.

## User Story
As a student who completed the free mini course and loved it, I want to learn more advanced techniques in a comprehensive premium course. I expect to see the premium course promoted in multiple places: on the dashboard, while I'm taking the mini course, and especially after I complete the mini course. When I see "coming soon," I want an easy way to sign up for early access so I'm notified when it launches. I also want to feel like I'm part of an exclusive group getting early access to valuable content.

## What We're Building
1. **Premium Course Placeholder** - Create "coming soon" course record in DynamoDB
2. **Early Access Flag** - Add `interestedInPremium` field to Student entity
3. **Early Access API** - Endpoint to capture early access signups
4. **Dashboard Premium Card** - Show premium course card with "Coming Soon" badge
5. **In-Course Promotion** - Banner/sidebar promoting premium while taking mini course
6. **Completion Modal** - Show premium upsell modal after mini course completion (with confetti)

## What We're NOT Building
- No premium course content (videos, lessons)
- No Stripe payment integration (Phase was removed from MVP per original requirements)
- No premium course enrollment (just lead capture)
- No email campaigns for early access leads (Phase 4 handles transactional emails only)
- No landing page updates (Phase 5)

## Tech Details

### Architecture Flow
**Student completes mini course:**
1. Student watches final lesson (lesson-3) to 90%
2. Frontend calls `POST /api/progress` → Returns `{ percentage: 100 }`
3. VideoPlayer detects 100% → Shows confetti celebration
4. After 3 seconds → `onCourseComplete()` callback fired
5. Parent component shows `PremiumUpsellModal`
6. Student clicks "Join Early Access" button
7. Frontend calls `POST /api/students/early-access` → Updates student record
8. Modal shows success message: "✓ You're on the list! We'll notify you when it launches."

**Student browses dashboard:**
1. Student navigates to `/dashboard`
2. Frontend fetches courses: `GET /api/courses`
3. Dashboard displays two course cards:
   - Mini course (free, enrolled/completed)
   - Premium course (badge: "Coming Soon")
4. Student clicks premium course card
5. Shows modal or dedicated page with early access signup

### Domain Language
- **Premium Course**: Paid, comprehensive course (coming soon, not yet built)
- **Early Access**: Lead capture for students interested in premium course
- **Interested Flag**: `interestedInPremium` boolean on Student record
- **Coming Soon**: Status indicator for unreleased courses
- **Upsell Modal**: Modal shown after mini course completion promoting premium

## Data Requirements

### Premium Course Record (Placeholder)
```typescript
{
  PK: "COURSE#premium-spec-course",
  SK: "METADATA",
  courseId: "premium-spec-course",
  name: "Advanced Spec-Driven Development Mastery",
  description: "Master advanced spec-driven development techniques with real-world case studies, hands-on projects, and in-depth coverage of context engineering patterns. Build a comprehensive portfolio of specs that showcase your expertise.",
  instructor: "Rico Romero",
  pricingModel: "paid",
  price: 199,  // Placeholder price
  stripeProductId: null,  // Not created yet
  stripePriceId: null,
  imageUrl: "https://...",
  learningObjectives: [
    "Design complex multi-feature specifications",
    "Implement advanced context engineering patterns",
    "Build spec-driven development workflows for teams",
    "Create reusable spec templates and patterns",
    "Optimize AI agent performance through spec refinement"
  ],
  comingSoon: true,  // NEW FIELD
  totalLessons: null,  // Not defined yet
  estimatedDuration: "6-8 hours",
  curriculum: [],
  createdAt: "2025-01-15T10:00:00Z",
  updatedAt: "2025-01-15T10:00:00Z"
}
```

### Student Entity Extension
```typescript
interface Student {
  // ... existing fields
  interestedInPremium?: boolean;  // NEW: True if signed up for early access
  premiumInterestDate?: string;   // NEW: ISO timestamp when they signed up
}
```

### Early Access API Request/Response
```typescript
// POST /api/students/early-access
// Request body
{
  courseId: "premium-spec-course"  // Which premium course (future-proof for multiple)
}

// Response
{
  success: true,
  message: "You're on the early access list!",
  student: {
    studentId: "student-123",
    interestedInPremium: true,
    premiumInterestDate: "2025-01-15T14:30:00Z"
  }
}
```

## Forward-Looking Requirements

### For Future Stripe Integration (Post-MVP)
**When premium course launches:**
- Change `comingSoon: false`
- Add `stripeProductId` and `stripePriceId`
- Replace "Join Early Access" with "Enroll Now" button
- Filter early access leads and send launch email campaign

### For Phase 4 (Enrollment Email)
**No immediate dependency**, but consider:
- Could send welcome email mentioning premium course exists
- Keep it simple for MVP: just welcome to mini course

### For Phase 5 (Landing Page)
**Landing page should show both courses:**
- Free mini course (primary CTA: "Start Learning Free")
- Premium course (secondary CTA: "Join Early Access")

## Slices Breakdown

1. **Slice 3.1: Premium Course Placeholder** - Create course record with `comingSoon: true`
2. **Slice 3.2: Early Access Backend** - Add student field, create API endpoint
3. **Slice 3.3: Dashboard Premium Card** - Show premium course on dashboard with "Coming Soon"
4. **Slice 3.4: In-Course Promotion** - Banner/sidebar promoting premium in mini course
5. **Slice 3.5: Completion Upsell Modal** - Modal after 100% completion with early access signup

Each slice will have detailed specifications in `specs/premium_course_teaser/slices/`.
