# Slice 6.3: Course Layout Redesign

## Objectives

Transform the course viewing experience to match the reference images (image.png, image2.png): move lessons to a left sidebar, highlight the currently playing lesson, remove redundant title from main content area, add sidebar collapse functionality, and automatically resume from the last accessed lesson.

## User Stories

1. **As a student**, I want to see all lessons in a left sidebar (like the reference images) so I can easily scan and navigate my learning path.
2. **As a student**, I want to know which lesson I'm currently watching with a clear visual indicator in the sidebar.
3. **As a student returning to a course**, I want to automatically land on the lesson I was last working on instead of starting from the beginning.
4. **As a desktop user**, I want to collapse the sidebar when I want to focus on the video without distractions.
5. **As a mobile user**, I want the sidebar closed by default so my small screen is dedicated to the video player.

## Dependencies

**Requires:**
- ✅ Slice 6.1 (Unified Header) - Header already shows course progress
- ✅ Progress API (already exists) - Uses `lastAccessedLesson` field

## Current State (BEFORE)

### Course Page Layout (`frontend/app/course/[courseId]/page.tsx`)

**Desktop Layout:**
```
┌────────────────────────────────────────────────────┐
│ [Public Header: Sign In | Enroll Now]              │
├───────────────────────────────┬────────────────────┤
│                               │                    │
│  [Lesson Title]               │  Right Sidebar:   │
│                               │  - Lessons list    │
│  [Video Player]               │  - Completion ✓    │
│                               │  - Resume badge    │
│  [Lesson Description]         │                    │
│                               │                    │
│  [Course Info Card]           │                    │
│                               │                    │
└───────────────────────────────┴────────────────────┘
        Video: 2 cols                  Sidebar: 1 col
```

**Mobile Layout:**
- Hamburger menu (top right) opens slide-out drawer with lessons
- Main content full width

**Issues:**
- Lessons in **right sidebar** (reference images show left sidebar)
- **Redundant title** above video (also shows in sidebar)
- No sidebar collapse functionality on desktop
- Lesson navigation logic exists but doesn't auto-resume from `lastAccessedLesson`

### Current Lesson Selection (`determineCurrentLesson` function)

**Priority order:**
1. Query param: `?lesson=lessonId`
2. Last accessed incomplete lesson
3. First uncompleted lesson
4. First lesson (fallback)

**Issue:** Works correctly but doesn't automatically redirect to `lastAccessedLesson` on page load without query param.

## Target State (AFTER)

### Course Page Layout (Desktop)

**Sidebar Expanded (Default):**
```
┌────────────────────────────────────────────────────┐
│ [Authenticated Header with Progress Bar]           │
├────────────────┬───────────────────────────────────┤
│                │                                   │
│  Left Sidebar: │  [Video Player]                   │
│  ┌──────────┐  │                                   │
│  │[Collapse]│  │  [Lesson Description]             │
│  └──────────┘  │                                   │
│                │                                   │
│  Course Title  │                                   │
│                │                                   │
│  Lesson 1 ✓    │                                   │
│  Lesson 2 ✓    │                                   │
│  → Lesson 3    │  ← Currently playing (highlighted) │
│  Lesson 4      │                                   │
│  Lesson 5      │                                   │
│                │                                   │
└────────────────┴───────────────────────────────────┘
   1 col                   2 cols
```

**Sidebar Collapsed:**
```
┌────────────────────────────────────────────────────┐
│ [Authenticated Header with Progress Bar]           │
├──┬─────────────────────────────────────────────────┤
│[]│                                                 │
│ │  [Video Player - Full Width]                    │
│E│                                                  │
│x│  [Lesson Description]                           │
│p│                                                  │
│a│                                                  │
│n│                                                  │
│d│                                                  │
└──┴─────────────────────────────────────────────────┘
```

### Mobile Layout

**Default (Sidebar Closed):**
```
┌────────────────────────────────────────┐
│ [Header]                       [≡]     │
├────────────────────────────────────────┤
│                                        │
│  [Video Player - Full Width]           │
│                                        │
│  [Lesson Description]                  │
│                                        │
└────────────────────────────────────────┘
```

**Sidebar Open (Slide-out):**
```
┌──────────────┬─────────────────────────┐
│              │ [Header]          [X]   │
│  Course      ├─────────────────────────┤
│  Title       │                         │
│              │  [Video dimmed/         │
│  Lesson 1 ✓  │   blurred]              │
│  Lesson 2 ✓  │                         │
│  → Lesson 3  │                         │
│  Lesson 4    │                         │
│              │                         │
└──────────────┴─────────────────────────┘
```

## Component Architecture

### New Component: CollapsibleLessonSidebar

**File:** `frontend/components/course/CollapsibleLessonSidebar.tsx`

```typescript
'use client';

interface CollapsibleLessonSidebarProps {
  course: Course;
  lessons: Lesson[];
  currentLessonId: string;
  progress: ProgressResponse;
  defaultCollapsed?: boolean;  // For mobile: true
}

export function CollapsibleLessonSidebar({
  course,
  lessons,
  currentLessonId,
  progress,
  defaultCollapsed = false
}: CollapsibleLessonSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden lg:block transition-all duration-300",
        isCollapsed ? "w-16" : "w-80"
      )}>
        {isCollapsed ? (
          <CollapsedSidebarView onExpand={() => setIsCollapsed(false)} />
        ) : (
          <ExpandedSidebarView
            course={course}
            lessons={lessons}
            currentLessonId={currentLessonId}
            progress={progress}
            onCollapse={() => setIsCollapsed(true)}
          />
        )}
      </aside>

      {/* Mobile Sidebar (Sheet) */}
      <MobileLessonMenu
        course={course}
        lessons={lessons}
        currentLessonId={currentLessonId}
        progress={progress}
      />
    </>
  );
}
```

### Expanded Sidebar View

**Structure:**
```tsx
function ExpandedSidebarView({ course, lessons, currentLessonId, progress, onCollapse }) {
  return (
    <div className="h-screen sticky top-16 bg-card border-r border-border overflow-y-auto">
      {/* Collapse Button */}
      <div className="p-4 border-b border-border flex justify-between items-center">
        <h2 className="font-semibold text-lg truncate">{course.name}</h2>
        <Button variant="ghost" size="icon" onClick={onCollapse}>
          <ChevronLeft className="h-5 w-5" />
          <span className="sr-only">Collapse sidebar</span>
        </Button>
      </div>

      {/* Lessons List */}
      <nav className="p-2">
        {lessons.map(lesson => {
          const isCompleted = progress.completedLessons.includes(lesson.lessonId);
          const isCurrent = lesson.lessonId === currentLessonId;
          const isLastAccessed = lesson.lessonId === progress.lastAccessedLesson;

          return (
            <Link
              key={lesson.lessonId}
              href={`/course/${course.courseId}?lesson=${lesson.lessonId}`}
              className={cn(
                "block p-3 rounded-lg mb-1 transition-colors",
                isCurrent && "bg-primary/10 border-l-4 border-primary",
                !isCurrent && "hover:bg-muted"
              )}
            >
              <div className="flex items-start gap-3">
                {/* Completion Icon */}
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                ) : isCurrent ? (
                  <PlayCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                )}

                {/* Lesson Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {lesson.title}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {lesson.lengthInMins} min
                    {isLastAccessed && !isCompleted && (
                      <span className="ml-2 text-primary font-medium">Resume</span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Progress Summary */}
      <div className="p-4 border-t border-border">
        <div className="text-sm font-medium mb-2">
          {progress.completedLessons.length} of {progress.totalLessons} lessons • {progress.percentage}%
        </div>
        <div className="w-full bg-secondary rounded-full h-2">
          <div
            className="bg-primary rounded-full h-2 transition-all"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}
```

### Collapsed Sidebar View

**Structure:**
```tsx
function CollapsedSidebarView({ onExpand }) {
  return (
    <div className="h-screen sticky top-16 bg-card border-r border-border flex flex-col items-center py-4">
      <Button variant="ghost" size="icon" onClick={onExpand}>
        <ChevronRight className="h-5 w-5" />
        <span className="sr-only">Expand sidebar</span>
      </Button>

      {/* Vertical "Lessons" text (optional) */}
      <div className="mt-4 writing-mode-vertical text-sm text-muted-foreground">
        Lessons
      </div>
    </div>
  );
}
```

## Auto-Resume from Last Accessed Lesson

### Page Component Updates

**File:** `frontend/app/course/[courseId]/page.tsx`

**BEFORE:**
```tsx
export default async function CoursePage({ params, searchParams }) {
  const { courseId } = params;
  const requestedLesson = searchParams?.lesson;

  const [course, lessons, progress] = await Promise.all([
    getCourse(courseId),
    getLessons(courseId),
    getProgress(courseId)
  ]);

  const currentLesson = determineCurrentLesson(lessons, progress, requestedLesson);

  return (
    <>
      <Header />
      <main className="grid lg:grid-cols-3 gap-6">
        {/* Video: 2 cols, Sidebar: 1 col */}
        <CourseVideoSection lesson={currentLesson} />
        <LessonListSidebar lessons={lessons} />
      </main>
    </>
  );
}
```

**AFTER:**
```tsx
export default async function CoursePage({ params, searchParams }) {
  const { courseId } = params;
  const requestedLesson = searchParams?.lesson;

  const [session, course, lessons, progress] = await Promise.all([
    auth(),
    getCourse(courseId),
    getLessons(courseId),
    getProgress(courseId)
  ]);

  // Determine target lesson
  const targetLesson = determineCurrentLesson(lessons, progress, requestedLesson);

  // If no query param and we have a target lesson different from first,
  // redirect to include the lesson query param for explicit URL state
  if (!requestedLesson && targetLesson.lessonId !== lessons[0]?.lessonId) {
    redirect(`/course/${courseId}?lesson=${targetLesson.lessonId}`);
  }

  return (
    <>
      <AuthenticatedHeader
        variant="course"
        user={session.user}
        courseProgress={{
          percentage: progress.percentage,
          completedLessons: progress.completedLessons.length,
          totalLessons: progress.totalLessons
        }}
      />
      <main className="flex">
        {/* Left Sidebar: 1 col (or collapsed) */}
        <CollapsibleLessonSidebar
          course={course}
          lessons={lessons}
          currentLessonId={targetLesson.lessonId}
          progress={progress}
        />

        {/* Main Content: Flex-1 (grows to fill) */}
        <div className="flex-1 pt-20 pb-12">
          <CourseVideoSection
            lesson={targetLesson}
            course={course}
            allLessons={lessons}
            progress={progress}
          />
        </div>
      </main>
    </>
  );
}
```

### determineCurrentLesson Logic (Updated)

**File:** `frontend/lib/course-utils.ts`

**BEFORE:**
```typescript
export function determineCurrentLesson(
  lessons: Lesson[],
  progress: ProgressResponse,
  requestedLessonId?: string
): Lesson {
  // 1. Query param (if valid)
  if (requestedLessonId) {
    const lesson = lessons.find(l => l.lessonId === requestedLessonId);
    if (lesson) return lesson;
  }

  // 2. Last accessed incomplete lesson
  if (progress.lastAccessedLesson) {
    const lastLesson = lessons.find(l => l.lessonId === progress.lastAccessedLesson);
    const isComplete = progress.completedLessons.includes(progress.lastAccessedLesson);
    if (lastLesson && !isComplete) return lastLesson;
  }

  // 3. First uncompleted lesson
  const firstIncomplete = lessons.find(l => !progress.completedLessons.includes(l.lessonId));
  if (firstIncomplete) return firstIncomplete;

  // 4. First lesson (fallback)
  return lessons[0];
}
```

**AFTER (no changes needed - logic is already correct):**
- Logic stays the same
- Page component now handles redirect to make URL explicit

## Main Content Area Changes

### Remove Redundant Title

**File:** `frontend/components/course/CourseVideoSection.tsx`

**BEFORE:**
```tsx
export function CourseVideoSection({ lesson, course }) {
  return (
    <div>
      {/* ❌ REMOVE THIS - Title shown in sidebar */}
      <h1 className="text-3xl font-bold mb-4">{lesson.title}</h1>

      <VideoPlayer lessonId={lesson.lessonId} courseId={course.courseId} />

      <Card className="mt-4">
        <CardContent className="p-4">
          <p className="text-muted-foreground">{lesson.description}</p>
        </CardContent>
      </Card>
    </div>
  );
}
```

**AFTER:**
```tsx
export function CourseVideoSection({ lesson, course }) {
  return (
    <div className="container mx-auto px-4">
      {/* No title here - it's in the sidebar */}

      <VideoPlayer lessonId={lesson.lessonId} courseId={course.courseId} />

      <Card className="mt-4">
        <CardContent className="p-4">
          <p className="text-muted-foreground">{lesson.description}</p>
        </CardContent>
      </Card>

      {/* Next Lesson CTA (if exists) */}
      {nextLesson && (
        <div className="mt-6 flex justify-end">
          <Button asChild>
            <Link href={`/course/${course.courseId}?lesson=${nextLesson.lessonId}`}>
              Next Lesson: {nextLesson.title}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
```

## Visual Indicators for Current Lesson

**DO ✅ - Clear visual hierarchy:**
```tsx
<Link
  href={`/course/${courseId}?lesson=${lesson.lessonId}`}
  className={cn(
    "block p-3 rounded-lg mb-1 transition-colors",
    isCurrent && [
      "bg-primary/10",           // Light background
      "border-l-4",              // Left border accent
      "border-primary",          // Primary color
      "font-semibold"            // Bold text
    ],
    !isCurrent && "hover:bg-muted"
  )}
>
  <div className="flex items-start gap-3">
    {isCurrent ? (
      <PlayCircle className="h-5 w-5 text-primary" />  // Playing icon
    ) : isCompleted ? (
      <CheckCircle2 className="h-5 w-5 text-green-600" />
    ) : (
      <Circle className="h-5 w-5 text-muted-foreground" />
    )}
    <div>{lesson.title}</div>
  </div>
</Link>
```

**DON'T ❌ - Subtle indicators that are hard to see:**
```tsx
{/* Too subtle - hard to tell what's current */}
<Link className={isCurrent ? "font-bold" : ""}>
  {lesson.title}
</Link>
```

## Responsive Behavior

### Desktop (>= 1024px)
- Sidebar visible by default (expanded)
- Collapse button in sidebar header
- Sidebar width: 320px (w-80) when expanded, 64px (w-16) when collapsed
- Main content adjusts to fill remaining space

### Tablet (768px - 1023px)
- Sidebar hidden by default
- Hamburger button (fixed top-right) opens mobile sheet
- Main content full width

### Mobile (< 768px)
- Same as tablet
- Sheet (slide-out) shows lessons
- Video player optimized for small screens

## Forward-Looking Requirements

### For Slice 6.6 (Mobile Optimizations)
- Sidebar collapse state persisted in localStorage
- Touch-friendly lesson buttons (larger tap targets)
- Smooth animations for sidebar transitions

### For Future Enhancements
- Keyboard navigation (arrow keys to navigate lessons)
- Lesson preview on hover (thumbnail, duration)
- Drag-to-resize sidebar width
- Picture-in-picture mode when sidebar is expanded

## Testing Checklist

- [ ] Lessons appear in **left sidebar** (not right)
- [ ] Currently playing lesson is **visually highlighted** (background, border, icon)
- [ ] Lesson title **removed from main content area** (only in sidebar)
- [ ] Course title appears at top of sidebar
- [ ] Collapse button works on desktop (sidebar shrinks to icon bar)
- [ ] Expand button works when sidebar is collapsed
- [ ] Auto-resume: Entering course without query param redirects to `?lesson=lastAccessedLesson`
- [ ] Auto-resume: Only happens if `lastAccessedLesson` is incomplete
- [ ] Mobile: Sidebar closed by default, hamburger opens sheet
- [ ] Mobile: Clicking lesson in sheet closes sheet and plays lesson
- [ ] Completed lessons show checkmark icon
- [ ] Incomplete lessons show circle icon
- [ ] Current lesson shows play icon
- [ ] "Resume" badge appears on last accessed incomplete lesson
- [ ] Progress summary at bottom of sidebar matches header progress
- [ ] Sidebar scrolls independently if lesson list is long
- [ ] Layout matches reference images (image.png, image2.png)
