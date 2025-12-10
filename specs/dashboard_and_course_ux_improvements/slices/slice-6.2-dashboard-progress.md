# Slice 6.2: Dashboard Progress Integration

## Objectives

Integrate live progress from the Progress API into dashboard course cards, remove separate action buttons, make entire cards clickable, and eliminate the user info card from the dashboard body (profile now lives in header from Slice 6.1).

## User Stories

1. **As a returning student**, I want to see my actual progress percentage on each course card so I can quickly identify where I left off.
2. **As a student browsing courses**, I want to click anywhere on a course card to open the course, not hunt for a specific button.
3. **As a student**, I want a clean dashboard without redundant user info taking up screen space (my profile is in the header now).

## Dependencies

**Requires:**
- ✅ Slice 6.1 (Unified Header) - User info moved to header dropdown

## Current State (BEFORE)

### Dashboard Layout (`frontend/components/dashboard/DashboardContent.tsx`)

**Structure:**
1. Welcome message: "Welcome back, [name]!"
2. **User Info Card** (large card showing name, email, userId, sign out)
3. **Session Debug Card** (development only, shows full session JSON)
4. Course grid with course cards

### Course Card Implementation (`frontend/components/dashboard/CourseCard.tsx`)

**Enrolled State:**
- Shows progress bar with percentage
- Progress comes from **enrollment data**, not Progress API:
  ```typescript
  enrollment: {
    userId: string;
    courseId: string;
    progress: number;  // Static value from enrollment record
    enrolledAt: string;
  }
  ```
- Has separate "Continue Course" button
- Button navigates to `/course/${courseId}`

**Non-Enrolled State:**
- Shows "Enroll Now" button
- Button triggers enrollment flow

**Key Issues:**
- Progress is **static** from enrollment record, not live from Progress API
- Cards are **not clickable** - only buttons are interactive
- **No hover effect** to signal interactivity
- User info card takes up valuable dashboard space

## Target State (AFTER)

### Dashboard Layout

**BEFORE:**
```
┌─────────────────────────────────────────────────────┐
│ Welcome back, Rico!                                 │
│ Ready to continue your learning journey?            │
├─────────────────────────────────────────────────────┤
│ [Avatar] Rico Martinez                              │
│         rico@example.com                           │
│         User ID: user-123               [Sign Out] │
├─────────────────────────────────────────────────────┤
│ {Session JSON debug info} (dev only)                │
├─────────────────────────────────────────────────────┤
│ Available Courses                                   │
│ ┌────────┐ ┌────────┐ ┌────────┐                   │
│ │ Card 1 │ │ Card 2 │ │ Card 3 │                   │
│ └────────┘ └────────┘ └────────┘                   │
└─────────────────────────────────────────────────────┘
```

**AFTER:**
```
┌─────────────────────────────────────────────────────┐
│ Welcome back, Rico!                                 │
│ Ready to continue your learning journey?            │
├─────────────────────────────────────────────────────┤
│ My Courses                                          │
│ ┌────────┐ ┌────────┐ ┌────────┐                   │
│ │ Card 1 │ │ Card 2 │ │ Card 3 │  (entire card    │
│ └────────┘ └────────┘ └────────┘   clickable)      │
└─────────────────────────────────────────────────────┘
```

**Removed:**
- ❌ User info card (profile in header now)
- ❌ Session debug card (removed even in development)

### Course Card - Enrolled State

**Interactive Behavior:**
- **Entire card is clickable** (wrapped in Link or onClick handler)
- **Hover effect**: Shadow elevation, border color, or subtle scale transform
- **No separate button** - the whole card navigates to `/course/${courseId}`

**Visual Structure:**
```
┌─────────────────────────────────────────────────────┐
│ [Course Thumbnail]                   [Enrolled ✓]   │
│                                                      │
│ Spec Driven Development Course                      │
│ Learn to write specs that guide implementation...   │
│                                                      │
│ Progress: 60% complete                               │
│ [━━━━━━━━━━━━━──────────] 60%                       │
│                                                      │
│ 📚 Self-paced • All Levels                          │
│ Enrolled on Jan 15, 2025                            │
└─────────────────────────────────────────────────────┘
        ↑ Entire card is clickable with hover effect
```

**Live Progress Integration:**
- Fetch progress from Progress API: `GET /api/progress/:courseId`
- Display `percentage` from API response (0-100)
- Show `completedLessons.length` of `totalLessons`
- Example: "3 of 5 lessons • 60% complete"

### Course Card - Non-Enrolled State

**Interactive Behavior:**
- **Entire card is clickable** (triggers enrollment flow)
- **Hover effect**: Same as enrolled state for consistency

**Visual Structure:**
```
┌─────────────────────────────────────────────────────┐
│ [Course Thumbnail]                   [Free / $49]   │
│                                                      │
│ Advanced Context Engineering                         │
│ Master the art of context engineering for AI...     │
│                                                      │
│ 👤 Instructor: Rico Martinez                        │
│ 📚 Self-paced • All Levels                          │
└─────────────────────────────────────────────────────┘
        ↑ Entire card is clickable (triggers enrollment)
```

**Loading States:**
- Show skeleton loader or spinner while enrolling
- Disable card interaction during enrollment

## Type Contracts

### DashboardContent Component

**File:** `frontend/components/dashboard/DashboardContent.tsx`

**BEFORE:**
```typescript
interface DashboardContentProps {
  session: Session;  // NextAuth session with user info
}
```

**AFTER:**
```typescript
interface DashboardContentProps {
  // Session no longer needed - header handles user info
}

// Component is now a client component that fetches its own data
'use client';

export function DashboardContent() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [progressMap, setProgressMap] = useState<Map<string, ProgressResponse>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      const [coursesData, enrollmentsData] = await Promise.all([
        getAllCourses(),
        getUserEnrollments()
      ]);

      // Fetch progress for each enrolled course
      const progressPromises = enrollmentsData.map(e =>
        getProgress(e.courseId).then(p => [e.courseId, p])
      );
      const progressEntries = await Promise.all(progressPromises);
      const progressMap = new Map(progressEntries);

      setCourses(coursesData);
      setEnrollments(enrollmentsData);
      setProgressMap(progressMap);
      setLoading(false);
    }

    loadDashboardData();
  }, []);

  // Render logic...
}
```

### CourseCard Component

**File:** `frontend/components/dashboard/CourseCard.tsx`

**BEFORE:**
```typescript
interface CourseCardProps {
  course: Course;
  enrollment?: Enrollment;  // Contains static progress
  onEnroll: (courseId: string) => Promise<void>;
}
```

**AFTER:**
```typescript
interface CourseCardProps {
  course: Course;
  enrollment?: Enrollment;
  progress?: ProgressResponse;  // NEW: Live progress from API
}

interface ProgressResponse {
  courseId: string;
  completedLessons: string[];
  lastAccessedLesson?: string;
  percentage: number;          // 0-100 (calculated in backend)
  totalLessons: number;
  updatedAt: string;
}
```

## Implementation Details

### Making Cards Clickable

**DO ✅ - Wrap entire card in Link with hover effects:**
```tsx
export function CourseCard({ course, enrollment, progress }: CourseCardProps) {
  const isEnrolled = !!enrollment;
  const href = isEnrolled ? `/course/${course.courseId}` : undefined;

  if (isEnrolled) {
    return (
      <Link href={href!}>
        <Card className="overflow-hidden transition-all hover:shadow-lg hover:border-primary/50 cursor-pointer">
          <CourseCardContent course={course} progress={progress} />
        </Card>
      </Link>
    );
  } else {
    return (
      <Card
        className="overflow-hidden transition-all hover:shadow-lg hover:border-primary/50 cursor-pointer"
        onClick={() => handleEnroll(course.courseId)}
      >
        <CourseCardContent course={course} />
      </Card>
    );
  }
}
```

**DON'T ❌ - Don't use separate buttons inside cards:**
```tsx
{/* OLD PATTERN - Don't do this */}
<Card>
  <CardContent>
    {/* ... course info ... */}
    <Button onClick={() => navigate(`/course/${courseId}`)}>
      Continue Course
    </Button>
  </CardContent>
</Card>
```

### Progress Display

**DO ✅ - Use live progress from API:**
```tsx
{progress && (
  <div className="space-y-2">
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">Progress</span>
      <span className="font-medium">
        {progress.completedLessons.length} of {progress.totalLessons} lessons • {progress.percentage}%
      </span>
    </div>
    <div className="w-full bg-secondary rounded-full h-2">
      <div
        className="bg-primary rounded-full h-2 transition-all duration-500"
        style={{ width: `${progress.percentage}%` }}
      />
    </div>
  </div>
)}
```

**DON'T ❌ - Don't use static enrollment progress:**
```tsx
{/* OLD PATTERN - enrollment.progress is static */}
{enrollment && (
  <div className="flex justify-between text-sm">
    <span>Progress</span>
    <span>{enrollment.progress}%</span>  {/* ❌ Static value */}
  </div>
)}
```

### Removing User Info Card

**File:** `frontend/components/dashboard/DashboardContent.tsx`

**BEFORE:**
```tsx
export function DashboardContent({ session }: DashboardContentProps) {
  return (
    <div>
      <div className="mb-8">
        <h1>Welcome back, {session.user?.name}!</h1>
      </div>

      {/* ❌ REMOVE THIS CARD */}
      <Card className="p-6 mb-8">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarFallback>{userInitials}</AvatarFallback>
            </Avatar>
            <div>
              <h2>{session.user?.name}</h2>
              <div>{session.user?.email}</div>
              <div>User ID: {session.user?.id}</div>
            </div>
          </div>
          <Button onClick={signOut}>Sign Out</Button>
        </div>
      </Card>

      {/* ❌ REMOVE THIS DEBUG CARD */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="p-6 mb-8 bg-muted">
          <pre>{JSON.stringify(session, null, 2)}</pre>
        </Card>
      )}

      {/* Course grid */}
      <div>...</div>
    </div>
  );
}
```

**AFTER:**
```tsx
export function DashboardContent() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [progressMap, setProgressMap] = useState<Map<string, ProgressResponse>>(new Map());

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          My Learning Dashboard
        </h1>
        <p className="text-muted-foreground">
          Continue your learning journey
        </p>
      </div>

      {/* No user info card - it's in the header now */}
      {/* No debug card - removed entirely */}

      {/* Course grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {courses.map(course => {
          const enrollment = enrollmentMap.get(course.courseId);
          const progress = progressMap.get(course.courseId);

          return (
            <CourseCard
              key={course.courseId}
              course={course}
              enrollment={enrollment}
              progress={progress}  {/* Pass live progress */}
            />
          );
        })}
      </div>
    </div>
  );
}
```

## Data Flow

```
DASHBOARD PAGE LOAD
├── Fetch all courses: getAllCourses()
├── Fetch user enrollments: getUserEnrollments()
├── For each enrolled course:
│   └── Fetch progress: getProgress(courseId)
│       └── GET /api/progress/:courseId
│           └── Returns: { percentage, completedLessons[], totalLessons, ... }
└── Render course cards with live progress

COURSE CARD INTERACTION
├── User hovers → Shadow effect, border highlight
├── User clicks card → Navigate to /course/:courseId
│   └── (or trigger enrollment flow if not enrolled)
└── User completes lesson in course → Returns to dashboard → Progress refetches
```

## Hover Effect Patterns

**Option 1: Shadow + Border (Recommended)**
```tsx
<Card className="
  overflow-hidden
  transition-all
  duration-200
  hover:shadow-lg
  hover:border-primary/50
  hover:scale-[1.02]
  cursor-pointer
">
```

**Option 2: Just Shadow**
```tsx
<Card className="
  overflow-hidden
  transition-shadow
  duration-200
  hover:shadow-xl
  cursor-pointer
">
```

**Option 3: Scale + Shadow**
```tsx
<Card className="
  overflow-hidden
  transition-transform
  duration-200
  hover:scale-105
  hover:shadow-lg
  cursor-pointer
">
```

Choose Option 1 for a balanced, professional feel that clearly signals clickability.

## Error Handling

### Progress Fetch Failure
If `getProgress(courseId)` fails for any enrolled course:
- **Graceful degradation**: Show enrollment date instead of progress
- **Fallback UI**: "Progress unavailable" with a subtle info icon
- **Don't block rendering**: Other courses should still show progress

```tsx
{progress ? (
  <div>
    {/* Progress bar */}
    <div className="w-full bg-secondary rounded-full h-2">
      <div style={{ width: `${progress.percentage}%` }} />
    </div>
  </div>
) : (
  <div className="text-sm text-muted-foreground">
    Enrolled on {formatDate(enrollment.enrolledAt)}
  </div>
)}
```

## Forward-Looking Requirements

### For Slice 6.3 (Course Layout Redesign)
- No dependencies - course layout is independent

### For Slice 6.5 (Meetups Frontend)
- Meetups section will be added **below** course grid
- Course grid layout stays the same

### For Future Enhancements
- Real-time progress updates (WebSocket/polling)
- "Last accessed" timestamp on cards
- Sorting/filtering courses by progress

## Testing Checklist

- [ ] User info card removed from dashboard body
- [ ] Session debug card removed (check in development mode too)
- [ ] Course cards fetch live progress from Progress API for enrolled courses
- [ ] Progress bar updates when returning from course after completing lesson
- [ ] Entire enrolled course card is clickable (navigates to `/course/:courseId`)
- [ ] Entire non-enrolled course card is clickable (triggers enrollment)
- [ ] Hover effect shows on cards (shadow, border, or scale)
- [ ] Cursor changes to pointer on card hover
- [ ] Progress displays correctly: "X of Y lessons • Z%"
- [ ] Progress bar visual matches percentage number
- [ ] Loading state shows while fetching courses/progress
- [ ] Error handling: Failed progress fetch doesn't break dashboard
- [ ] Mobile: Cards are responsive and hover effects work on touch devices
