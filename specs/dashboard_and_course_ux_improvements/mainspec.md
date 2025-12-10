# Dashboard and Course UX Improvements - Mainspec

## Overview

Transform the LearnerMax dashboard and course viewing experience to create a more polished, intuitive learning platform. This includes live progress integration, unified header navigation, improved course layouts, and a new community-building Meetups feature.

## Vision: The Complete End State

### Dashboard Experience
Students see a clean, focused dashboard with:
- **Unified Header**: Logo (returns to dashboard), Feedback icon, Profile dropdown - consistent across dashboard and course pages
- **Live Progress**: Course cards display real-time progress percentages and completion status pulled from the Progress API
- **Interactive Course Cards**: Entire cards are clickable (no separate buttons), with hover effects signaling interactivity
- **Profile in Header**: User info (name, email) moved from dashboard body to header dropdown, decluttering the main view
- **Meetups Section**: Community meetups displayed as cards with signup capability, calendar integration, and direct Zoom access when meetings are live

### Course Viewing Experience
Students experience a focused, distraction-free learning environment:
- **Left Sidebar**: Replaces right navigation; shows course title, all lessons with completion indicators, and highlights currently playing lesson
- **Resume from Last Position**: Automatically navigates to the last-accessed incomplete lesson when entering a course
- **Clean Content Area**: No title clutter - just the video player and lesson description
- **Unified Header**: Same header as dashboard, but with progress bar showing course completion percentage
- **Collapsible Sidebar**: Desktop users can toggle sidebar to maximize video viewing; mobile users see collapsed sidebar by default with hamburger toggle

### Why This Matters

**User Stories:**

1. **As a returning student**, I want to see my actual progress on course cards so I know where I left off without clicking into each course.

2. **As a student**, I want to quickly access my profile and give feedback from anywhere in the platform without hunting for buttons.

3. **As a student watching lessons**, I want to see all lessons in a left sidebar (like the reference images) with clear indicators of what I've completed and what I'm currently watching, so I can navigate my learning path easily.

4. **As a mobile learner**, I want a clean, focused video player with easy access to the lesson list without it taking up my limited screen space by default.

5. **As a community-minded student**, I want to join weekly meetups to connect with other learners, get questions answered, and build relationships - all from my dashboard.

6. **As a student returning to a course**, I want to automatically land on the lesson I was last working on instead of manually navigating back to it.

## Current State (BEFORE)

### Dashboard (`frontend/app/dashboard/page.tsx`, `frontend/components/dashboard/DashboardContent.tsx`)
- **Header**: Public header with "Sign In" and "Enroll Now" (not authenticated)
- **User Info Card**: Large card in dashboard body displaying name, email, userId, sign out button
- **Session Debug Info**: Development-only card showing full session JSON
- **Course Cards**:
  - Have separate "Continue Course" or "Enroll Now" buttons
  - Progress shown for enrolled courses, but comes from static enrollment data (not live Progress API)
  - No hover effects indicating clickability
- **No Meetups Section**: Feature doesn't exist

### Course Page (`frontend/app/course/[courseId]/page.tsx`)
- **Header**: Same public header (not contextual)
- **Layout**: Video player (2 cols) + right sidebar (1 col) on desktop
- **Right Sidebar**: Shows lessons with completion indicators
- **Lesson Navigation**: Goes to first uncompleted lesson or query param `?lesson=lessonId`
- **Main Content**: Shows lesson title above video player (redundant with sidebar)
- **Mobile**: Hamburger menu for lessons

### Progress Integration
- Progress API exists and works (`backend/src/features/progress/`)
- Frontend fetches progress in course page but not on dashboard
- Dashboard only shows enrollment progress (static percentage, not real-time)

## Target State (AFTER)

### Dashboard
- **Unified Header**:
  - Logo (left) → `/dashboard` on click
  - Feedback icon (right)
  - Profile dropdown (right) with name, email, sign out
  - Mobile-optimized
- **No User Info Card**: Removed from dashboard body (profile in header now)
- **No Session Debug Card**: Removed entirely (even in development)
- **Course Cards**:
  - Entire card is clickable → navigates to `/course/:courseId`
  - Shows live progress from Progress API (`GET /api/progress/:courseId`)
  - Hover effect (shadow, border, or scale) signals clickability
  - No separate "Continue Course" button
- **Meetups Section**:
  - Hardcoded meetup: Spec Driven Development and Context Engineering
  - Scheduled: Every Saturday 10 AM CST
  - Meetup card shows:
    - Title, description, date/time
    - Signup button (if not signed up)
    - "Join Meeting" button (if meeting is running) → redirects to Zoom link
    - "Registered" indicator (if signed up but meeting not running)
  - Time-based logic: Meeting "running" if current time is between start and end (10 AM - 11 AM CST)
  - Calendar invite sent on signup (via backend email service)
  - Tracks signups in DynamoDB (one record per student per meetup)

### Course Page
- **Unified Header**: Same as dashboard, but adds progress bar showing course completion percentage
- **Layout**:
  - Left sidebar (1 col) replaces right sidebar
  - Video player (2 cols on desktop, full width on mobile)
- **Left Sidebar**:
  - Course title at top
  - All lessons with completion checkmarks
  - Highlights currently playing lesson (background color, icon, or border)
  - Shows lesson durations
  - Collapsible toggle button (desktop) → hides sidebar for fullscreen video
  - Mobile: Collapsed by default, hamburger toggle to open
- **Main Content Area**:
  - No lesson title (title lives in sidebar)
  - Video player component
  - Lesson description below video
- **Resume Last Position**:
  - On course entry, redirect to `?lesson=lastAccessedLesson` if incomplete
  - Uses `progress.lastAccessedLesson` from Progress API

### API & Data Requirements

**Progress API** (already exists):
- `GET /api/progress/:courseId` - Fetch progress with `completedLessons[]`, `lastAccessedLesson`, `percentage`
- `POST /api/progress` - Mark lesson complete (already updates `lastAccessedLesson`)

**Meetups API** (new):
- `GET /api/meetups` - Fetch all meetups with signup status for current user
- `POST /api/meetups/:meetupId/signup` - Sign up for meetup, send calendar invite
- Meetup data hardcoded for MVP:
  ```typescript
  [
    {
      meetupId: "spec-driven-dev-weekly",
      title: "Spec Driven Development with context engineering",
      description: "Weekly discussion on spec-driven workflows, context engineering, best practices, and Q&A",
      schedule: { dayOfWeek: "Saturday", time: "10:00", timezone: "America/Chicago" },
      zoomLink: "https://zoom.us/j/XXXXXXXXXX",
      duration: 60 // minutes
    },
  ]
  ```

**Meetup Signups** (DynamoDB):
```typescript
interface MeetupSignupEntity {
  PK: string;              // "STUDENT#<userId>"
  SK: string;              // "MEETUP_SIGNUP#<meetupId>"
  meetupId: string;
  signedUpAt: string;      // ISO timestamp
  entityType: "MEETUP_SIGNUP";
}
```

## Forward-Looking Requirements

### For Future Enhancement (Not in This Spec)
- Admin UI for creating/managing meetups (currently hardcoded)
- Zoom API integration for real-time meeting status (currently time-based)
- Course-specific meetups (currently global only)
- Meetup cancellation by users
- Attendance tracking

## Dependencies & Temporal Ordering

This mainspec breaks into **6 slices** with the following order:

1. **Slice 6.1**: Unified Header Component - Foundation for all pages
2. **Slice 6.2**: Dashboard Progress Integration - Live progress on course cards
3. **Slice 6.3**: Course Layout Redesign - Left sidebar, resume last position
4. **Slice 6.4**: Meetups Backend - API, data model, calendar integration
5. **Slice 6.5**: Meetups Frontend - Dashboard UI, signup flow
6. **Slice 6.6**: Mobile Optimizations - Responsive behavior for all changes

**Why this order:**
- Header first → All pages depend on it
- Dashboard progress → Standalone, doesn't block course work
- Course layout → Can proceed in parallel with dashboard
- Meetups backend → Must exist before frontend
- Meetups frontend → Depends on backend
- Mobile → Final polish after desktop UX is solid

## Success Criteria

- [ ] Dashboard shows live progress from Progress API on all course cards
- [ ] Course cards are entirely clickable with visual hover feedback
- [ ] User info removed from dashboard body; profile accessible in header dropdown
- [ ] Session debug card removed (even in development)
- [ ] Unified header appears on both dashboard and course pages
- [ ] Course page shows lessons in left sidebar with current lesson highlighted
- [ ] Course page automatically resumes from `lastAccessedLesson` if incomplete
- [ ] Sidebar collapsible on desktop, collapsed by default on mobile
- [ ] Meetups section appears on dashboard with 2 hardcoded meetups
- [ ] Students can sign up for meetups and receive calendar invites
- [ ] "Join Meeting" button appears when meeting is running (Saturday 10-11 AM CST)
- [ ] Meetup signups tracked in DynamoDB
- [ ] All UX improvements work seamlessly on mobile devices