# Slice 6.5: Meetups Frontend

## Objectives

Build the dashboard Meetups section UI: display meetup cards, handle signup flow, show meeting status, and redirect to Zoom when meetings are live.

## User Stories

1. **As a student**, I want to see upcoming meetups on my dashboard so I can decide which ones to join.
2. **As a student**, I want to sign up for a meetup with one click and receive confirmation that I'm registered.
3. **As a student**, I want to see when a meetup is currently running and easily join the Zoom call.
4. **As a student**, I want to know which meetups I've already signed up for so I don't accidentally sign up twice.

## Dependencies

**Requires:**
- ✅ Slice 6.4 (Meetups Backend) - API endpoints must exist
- ✅ Slice 6.2 (Dashboard Progress Integration) - Dashboard layout is ready

## Current State (BEFORE)

**Dashboard** (`frontend/components/dashboard/DashboardContent.tsx`):
- No meetups section exists
- Only shows course cards

## Target State (AFTER)

### Dashboard Layout with Meetups

```
┌─────────────────────────────────────────────────────┐
│ [Authenticated Header with Profile]                 │
├─────────────────────────────────────────────────────┤
│ My Learning Dashboard                               │
│ Continue your learning journey                      │
├─────────────────────────────────────────────────────┤
│ My Courses                                          │
│ ┌────────┐ ┌────────┐ ┌────────┐                   │
│ │ Card 1 │ │ Card 2 │ │ Card 3 │                   │
│ └────────┘ └────────┘ └────────┘                   │
├─────────────────────────────────────────────────────┤
│ Community Meetups                          NEW ✨    │
│ ┌───────────────┐ ┌───────────────┐                │
│ │ Spec Driven   │ │ Context Eng.  │                │
│ │ Development   │ │               │                │
│ │ [Sign Up]     │ │ [Join Now]    │                │
│ └───────────────┘ └───────────────┘                │
└─────────────────────────────────────────────────────┘
```

### Meetup Card States

**State 1: Not Signed Up (Default)**
```
┌─────────────────────────────────────────────┐
│ 🎯 Spec Driven Development                  │
│ ───────────────────────────────────────────│
│ Weekly discussion on spec-driven workflows, │
│ best practices, and Q&A.                    │
│                                             │
│ 📅 Next: Saturday, Jan 20 at 10:00 AM CST  │
│ ⏱️  Duration: 60 minutes                    │
│ 👤 Host: Rico Martinez                      │
│                                             │
│ [Sign Up for Meetup]                        │
└─────────────────────────────────────────────┘
```

**State 2: Signed Up (Not Running)**
```
┌─────────────────────────────────────────────┐
│ 🎯 Context Engineering          ✅ Registered│
│ ───────────────────────────────────────────│
│ Deep dive into context engineering patterns,│
│ prompt design, and AI workflows.            │
│                                             │
│ 📅 Next: Saturday, Jan 20 at 10:00 AM CST  │
│ ⏱️  Duration: 60 minutes                    │
│ 👤 Host: Rico Martinez                      │
│                                             │
│ You're registered! We'll send you a         │
│ calendar invite and reminder.               │
└─────────────────────────────────────────────┘
```

**State 3: Signed Up + Meeting Running (Saturday 10-11 AM CST)**
```
┌─────────────────────────────────────────────┐
│ 🔴 LIVE NOW • Context Engineering           │
│ ───────────────────────────────────────────│
│ Deep dive into context engineering patterns,│
│ prompt design, and AI workflows.            │
│                                             │
│ 📅 Happening now! Ends at 11:00 AM CST     │
│ ⏱️  Duration: 60 minutes                    │
│ 👤 Host: Rico Martinez                      │
│                                             │
│ [🎥 Join Zoom Meeting]                      │
└─────────────────────────────────────────────┘
```

## Component Architecture

### Meetup Card Component

**File:** `frontend/components/dashboard/MeetupCard.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, Video } from 'lucide-react';
import { signupForMeetup } from '@/app/actions/meetups';

export interface MeetupCardProps {
  meetup: MeetupResponse;
}

interface MeetupResponse {
  meetupId: string;
  title: string;
  description: string;
  nextOccurrence: string;  // ISO timestamp
  isRunning: boolean;
  isSignedUp: boolean;
  zoomLink?: string;       // Only present if isRunning = true
  duration: number;
  hostName: string;
}

export function MeetupCard({ meetup }: MeetupCardProps) {
  const [isSignedUp, setIsSignedUp] = useState(meetup.isSignedUp);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await signupForMeetup(meetup.meetupId);
      setIsSignedUp(true);
    } catch (err) {
      setError('Failed to sign up. Please try again.');
      console.error('Signup error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinZoom = () => {
    if (meetup.zoomLink) {
      window.open(meetup.zoomLink, '_blank', 'noopener,noreferrer');
    }
  };

  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    }).format(date);
  };

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-2">
            {meetup.isRunning && (
              <Badge variant="destructive" className="animate-pulse">
                🔴 LIVE NOW
              </Badge>
            )}
            <h3 className="text-xl font-semibold">{meetup.title}</h3>
          </div>
          {isSignedUp && !meetup.isRunning && (
            <Badge variant="secondary">✅ Registered</Badge>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground mb-4">
          {meetup.description}
        </p>

        {/* Metadata */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{formatDate(meetup.nextOccurrence)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{meetup.duration} minutes</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>Host: {meetup.hostName}</span>
          </div>
        </div>

        {/* Action Button */}
        {meetup.isRunning && isSignedUp && meetup.zoomLink ? (
          <Button
            onClick={handleJoinZoom}
            className="w-full"
            size="lg"
          >
            <Video className="mr-2 h-5 w-5" />
            Join Zoom Meeting
          </Button>
        ) : isSignedUp ? (
          <div className="text-sm text-muted-foreground text-center p-3 bg-muted rounded-md">
            You're registered! We'll send you a calendar invite and reminder.
          </div>
        ) : (
          <Button
            onClick={handleSignup}
            variant="outline"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Signing up...' : 'Sign Up for Meetup'}
          </Button>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-2 text-sm text-destructive text-center">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### Dashboard Integration

**File:** `frontend/components/dashboard/DashboardContent.tsx`

**BEFORE:**
```tsx
export function DashboardContent() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [progressMap, setProgressMap] = useState<Map<string, ProgressResponse>>(new Map());

  // ... load courses and progress

  return (
    <div>
      <h1>My Learning Dashboard</h1>

      {/* Course Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {courses.map(course => <CourseCard key={course.courseId} course={course} />)}
      </div>
    </div>
  );
}
```

**AFTER:**
```tsx
export function DashboardContent() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [progressMap, setProgressMap] = useState<Map<string, ProgressResponse>>(new Map());
  const [meetups, setMeetups] = useState<MeetupResponse[]>([]);  // NEW
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [coursesData, enrollmentsData, meetupsData] = await Promise.all([
          getAllCourses(),
          getUserEnrollments(),
          getMeetups()  // NEW: Fetch meetups
        ]);

        // ... existing progress fetching logic

        setMeetups(meetupsData);  // NEW
        setLoading(false);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  return (
    <div>
      <h1 className="text-3xl md:text-4xl font-bold mb-2">
        My Learning Dashboard
      </h1>
      <p className="text-muted-foreground mb-8">
        Continue your learning journey
      </p>

      {/* Courses Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">My Courses</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {courses.map(course => (
            <CourseCard
              key={course.courseId}
              course={course}
              progress={progressMap.get(course.courseId)}
            />
          ))}
        </div>
      </section>

      {/* Meetups Section - NEW */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-2xl font-semibold">Community Meetups</h2>
          <Badge variant="secondary">New</Badge>
        </div>
        <p className="text-muted-foreground mb-4">
          Join our weekly meetups to connect with fellow learners, ask questions, and dive deeper into topics.
        </p>
        <div className="grid gap-6 md:grid-cols-2">
          {meetups.map(meetup => (
            <MeetupCard key={meetup.meetupId} meetup={meetup} />
          ))}
        </div>
      </section>
    </div>
  );
}
```

## Server Actions

**File:** `frontend/app/actions/meetups.ts`

```typescript
'use server';

import { getAuthToken } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface MeetupResponse {
  meetupId: string;
  title: string;
  description: string;
  nextOccurrence: string;
  isRunning: boolean;
  isSignedUp: boolean;
  zoomLink?: string;
  duration: number;
  hostName: string;
}

/**
 * Fetch all meetups with user signup status
 */
export async function getMeetups(): Promise<MeetupResponse[]> {
  const token = await getAuthToken();

  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_URL}/api/meetups`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    cache: 'no-store'  // Always fetch fresh data
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch meetups: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Sign up for a meetup
 */
export async function signupForMeetup(meetupId: string): Promise<void> {
  const token = await getAuthToken();

  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_URL}/api/meetups/${meetupId}/signup`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to sign up for meetup');
  }
}
```

## Visual Design

### Meetup Card Styling

**Color Palette:**
- **Live indicator**: Red badge with pulse animation (`bg-destructive animate-pulse`)
- **Registered badge**: Green/secondary badge (`bg-secondary`)
- **Card hover**: Subtle shadow elevation (`hover:shadow-md`)

**Layout:**
- **Max width**: 2 columns on desktop (`md:grid-cols-2`), 1 column on mobile
- **Card padding**: `p-6` for comfortable spacing
- **Typography**: Title `text-xl font-semibold`, description `text-sm text-muted-foreground`

### Join Button (Running State)

**DO ✅ - Prominent, action-oriented:**
```tsx
<Button
  onClick={handleJoinZoom}
  className="w-full"
  size="lg"
  variant="default"  // Primary color
>
  <Video className="mr-2 h-5 w-5" />
  Join Zoom Meeting
</Button>
```

**DON'T ❌ - Small or subtle button:**
```tsx
{/* Too subtle for a live meeting */}
<Button variant="ghost" size="sm">
  Join
</Button>
```

## Error Handling

### Signup Failure
```tsx
try {
  await signupForMeetup(meetup.meetupId);
  setIsSignedUp(true);
} catch (err) {
  setError('Failed to sign up. Please try again.');
  console.error('Signup error:', err);
}
```

### Meetups Fetch Failure
```tsx
{/* In DashboardContent */}
{meetups.length === 0 && !loading && (
  <div className="text-muted-foreground">
    No meetups available at this time.
  </div>
)}
```

## Interactive Behavior

### Optimistic UI Update
When user clicks "Sign Up":
1. Set loading state (button shows "Signing up...")
2. Call API
3. On success: Update local state `isSignedUp = true` (button disappears, shows confirmation)
4. On failure: Show error message, keep button visible

### Zoom Link Redirect
When user clicks "Join Zoom Meeting":
1. Open Zoom link in new tab (`window.open(zoomLink, '_blank')`)
2. Use `noopener,noreferrer` for security
3. No page navigation - user stays on dashboard

## Mobile Responsiveness

**Desktop (>= 768px):**
- Meetup cards: 2 columns side-by-side

**Mobile (< 768px):**
- Meetup cards: 1 column, full width
- Larger tap targets for buttons (already `size="lg"`)
- Readable text sizes (already `text-sm` for body, `text-xl` for title)

## Forward-Looking Requirements

### For Slice 6.6 (Mobile Optimizations)
- Meetup cards are already responsive (grid layout)
- Touch-friendly buttons (size="lg")

### For Future Enhancements
- **Real-time updates**: Poll or WebSocket to update `isRunning` status without refresh
- **Calendar integration**: "Add to Google Calendar" / "Add to Apple Calendar" buttons
- **Cancellation**: "Unregister" button for signed-up meetups
- **Reminders**: Push notifications or email reminders 15 minutes before meetup
- **Recording links**: Show recording link after meetup ends
- **Attendance tracking**: Check-in functionality during live meetup

## Testing Checklist

- [ ] Meetups section appears below courses on dashboard
- [ ] Both hardcoded meetups (Spec Driven Development, Context Engineering) are displayed
- [ ] "Sign Up" button works and updates state to "Registered"
- [ ] "Registered" badge appears after successful signup
- [ ] "Join Zoom Meeting" button appears only when meetup is running
- [ ] Clicking "Join Zoom Meeting" opens Zoom link in new tab
- [ ] Error message appears if signup fails
- [ ] Loading state shows during signup ("Signing up..." text)
- [ ] Meetup date/time formatted correctly (e.g., "Saturday, Jan 20 at 10:00 AM CST")
- [ ] Live badge ("🔴 LIVE NOW") appears only on Saturday 10-11 AM CST
- [ ] Cards are responsive (2 columns on desktop, 1 column on mobile)
- [ ] Hover effect works on cards
- [ ] Page doesn't crash if meetups API fails (shows empty state)
- [ ] Timezone displayed correctly in user's locale
