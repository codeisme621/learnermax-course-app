# Slice 6.6: Mobile Optimizations

## Objectives

Polish and optimize all dashboard and course UX improvements for mobile devices. Ensure responsive layouts, touch-friendly interactions, and appropriate mobile-specific behaviors across all features from Slices 6.1-6.5.

## User Stories

1. **As a mobile user**, I want the header to be compact and functional without taking up too much screen space.
2. **As a mobile user**, I want easy access to my profile and feedback without navigating through multiple menus.
3. **As a mobile learner**, I want the video player to be the primary focus with easy access to the lesson list when I need it.
4. **As a mobile user**, I want all interactive elements to be easy to tap without accidentally hitting the wrong button.

## Dependencies

**Requires:**
- ✅ Slice 6.1 (Unified Header)
- ✅ Slice 6.2 (Dashboard Progress Integration)
- ✅ Slice 6.3 (Course Layout Redesign)
- ✅ Slice 6.4 (Meetups Backend)
- ✅ Slice 6.5 (Meetups Frontend)

## Mobile Breakpoints

Following Tailwind CSS conventions:
- **Mobile**: `< 768px` (default, no prefix)
- **Tablet**: `>= 768px` (`md:` prefix)
- **Desktop**: `>= 1024px` (`lg:` prefix)

## Slice 6.1 Mobile: Authenticated Header

### Current Implementation Review

**Desktop Header:**
```
┌───────────────────────────────────────────────────────────┐
│ [Logo: LearnerMax]    [Progress Bar]    [Feedback] [Profile ▼]│
└───────────────────────────────────────────────────────────┘
```

### Mobile Optimization

**Mobile Header (<768px):**
```
┌────────────────────────────────────────────┐
│ [LM]     [Progress: 60%]    [📧] [👤]     │
└────────────────────────────────────────────┘
```

**Changes:**
1. **Logo**: Abbreviated to "LM" or icon only (save space)
2. **Progress text**: Hide full text, show only percentage
3. **Progress bar**: Maintain visual bar (most important feedback)
4. **Icons**: Use icons only (no text labels)

**File:** `frontend/components/layout/AuthenticatedHeader.tsx`

```tsx
export function AuthenticatedHeader({ variant, user, courseProgress }: AuthenticatedHeaderProps) {
  return (
    <motion.header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between gap-2">
        {/* Logo - Responsive */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="text-xl md:text-2xl font-bold text-primary">
            <span className="hidden sm:inline">LearnerMax</span>
            <span className="sm:hidden">LM</span>
          </div>
        </Link>

        {/* Course Progress - Only in course variant */}
        {variant === 'course' && courseProgress && (
          <div className="flex items-center gap-2 flex-1 max-w-xs md:max-w-md mx-2">
            {/* Hide text on mobile, show on tablet+ */}
            <div className="hidden md:block text-sm font-medium whitespace-nowrap">
              {courseProgress.completedLessons} of {courseProgress.totalLessons} • {courseProgress.percentage}%
            </div>
            {/* Show only percentage on mobile */}
            <div className="md:hidden text-xs font-medium">
              {courseProgress.percentage}%
            </div>
            {/* Progress bar - always visible */}
            <div className="flex-1 bg-secondary rounded-full h-2">
              <div
                className="bg-primary rounded-full h-2 transition-all"
                style={{ width: `${courseProgress.percentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Actions - Icons only on mobile */}
        <div className="flex items-center gap-2">
          {/* Feedback Button */}
          <Button variant="ghost" size="icon" asChild className="h-9 w-9">
            <Link href="/feedback" aria-label="Send Feedback">
              <MessageCircle className="h-5 w-5" />
            </Link>
          </Button>

          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full" aria-label="User menu">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user.image || undefined} alt={user.name || 'User'} />
                  <AvatarFallback className="text-xs">{getUserInitials(user.name)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.name}</p>
                  <p className="text-xs leading-none text-muted-foreground truncate">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.header>
  );
}
```

**Key Mobile Optimizations:**
- Reduced padding: `py-3` on mobile, `py-4` on desktop
- Logo responsive: "LM" on mobile, "LearnerMax" on tablet+
- Progress text hidden on mobile: only percentage visible
- Icons sized appropriately: `h-9 w-9` for comfortable tapping

## Slice 6.2 Mobile: Dashboard Course Cards

### Mobile Optimization

**Course Cards Layout:**
```tsx
{/* In DashboardContent */}
<div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  {courses.map(course => (
    <CourseCard key={course.courseId} course={course} progress={progress} />
  ))}
</div>
```

**Changes:**
1. **Grid**: Single column on mobile, 2 columns on tablet, 3 columns on desktop
2. **Gap**: Smaller gap on mobile (`gap-4`) vs desktop (`gap-6`)
3. **Card padding**: Responsive padding inside cards

**File:** `frontend/components/dashboard/CourseCard.tsx`

```tsx
export function CourseCard({ course, enrollment, progress }: CourseCardProps) {
  const href = enrollment ? `/course/${course.courseId}` : undefined;

  return (
    <Link href={href || '#'} className={href ? '' : 'pointer-events-none'}>
      <Card className="overflow-hidden transition-all hover:shadow-lg hover:border-primary/50 cursor-pointer h-full">
        {/* Course Thumbnail */}
        <div className="h-32 sm:h-40 bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
          <BookOpen className="h-12 w-12 sm:h-16 sm:w-16 text-primary-foreground/80" />
        </div>

        {/* Content - Responsive padding */}
        <CardContent className="p-4 sm:p-6">
          {/* Course info */}
          <div className="space-y-3 sm:space-y-4">
            <div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">{course.name}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>
            </div>

            {/* Progress - if enrolled */}
            {progress && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">
                    {progress.completedLessons.length}/{progress.totalLessons} • {progress.percentage}%
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
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
```

**Key Mobile Optimizations:**
- Thumbnail height: Smaller on mobile (`h-32`) vs desktop (`h-40`)
- Icon size: Responsive (`h-12 w-12` mobile, `h-16 w-16` desktop)
- Card padding: `p-4` on mobile, `p-6` on desktop
- Text size: `text-lg` title on mobile, `text-xl` on desktop
- Line clamp: Limit description to 2 lines to prevent tall cards

## Slice 6.3 Mobile: Course Layout

### Mobile Optimization

**Course Page Mobile Layout:**
```
┌────────────────────────────────────┐
│ [Header: LM | 60% | 📧 👤]   [≡]  │  ← Fixed header + hamburger
├────────────────────────────────────┤
│                                    │
│  [Video Player - Full Width]       │
│                                    │
│                                    │
├────────────────────────────────────┤
│  Lesson Description                │
│  [Next Lesson Button]              │
└────────────────────────────────────┘
```

**Sidebar Behavior:**
- **Default**: Collapsed (not visible)
- **Trigger**: Hamburger button (fixed top-right, `top-4 right-4 z-50`)
- **Open**: Slide-out sheet from right with backdrop

**File:** `frontend/components/course/CollapsibleLessonSidebar.tsx`

```tsx
export function CollapsibleLessonSidebar({
  course,
  lessons,
  currentLessonId,
  progress
}: CollapsibleLessonSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden lg:block sticky top-16 h-[calc(100vh-4rem)] transition-all duration-300",
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

      {/* Mobile: Sheet Component */}
      <div className="lg:hidden">
        <MobileLessonSheet
          course={course}
          lessons={lessons}
          currentLessonId={currentLessonId}
          progress={progress}
        />
      </div>
    </>
  );
}
```

**Mobile Sheet Component:**
```tsx
'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

function MobileLessonSheet({ course, lessons, currentLessonId, progress }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {/* Trigger: Hamburger Button (Fixed) */}
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="fixed top-20 right-4 z-50 lg:hidden h-12 w-12 rounded-full shadow-lg"
          aria-label="Open lesson menu"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>

      {/* Sheet Content */}
      <SheetContent side="right" className="w-80 sm:w-96 p-0">
        <SheetHeader className="p-4 border-b border-border">
          <SheetTitle className="text-left">{course.name}</SheetTitle>
        </SheetHeader>

        {/* Lessons List */}
        <div className="overflow-y-auto h-[calc(100vh-8rem)] p-2">
          {lessons.map(lesson => {
            const isCompleted = progress.completedLessons.includes(lesson.lessonId);
            const isCurrent = lesson.lessonId === currentLessonId;

            return (
              <Link
                key={lesson.lessonId}
                href={`/course/${course.courseId}?lesson=${lesson.lessonId}`}
                onClick={() => setOpen(false)}  // Close sheet on selection
                className={cn(
                  "block p-4 rounded-lg mb-2 transition-colors",
                  isCurrent && "bg-primary/10 border-l-4 border-primary",
                  !isCurrent && "hover:bg-muted active:bg-muted"  // Touch feedback
                )}
              >
                <div className="flex items-start gap-3">
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  ) : isCurrent ? (
                    <PlayCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{lesson.title}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {lesson.lengthInMins} min
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Progress Summary */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-background">
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
      </SheetContent>
    </Sheet>
  );
}
```

**Key Mobile Optimizations:**
- Hamburger button: Fixed position (`fixed top-20 right-4`), above content
- Large tap target: `h-12 w-12` (48px minimum for accessibility)
- Sheet width: `w-80` (320px) on mobile, `w-96` (384px) on larger screens
- Auto-close: Sheet closes when user selects a lesson
- Touch feedback: `active:bg-muted` for visual tap confirmation
- Scrollable: Lesson list scrolls independently

**Video Player Container:**
```tsx
{/* In Course Page */}
<main className="flex pt-16">  {/* Account for fixed header */}
  <CollapsibleLessonSidebar ... />

  <div className="flex-1 p-4 sm:p-6 lg:p-8">  {/* Responsive padding */}
    <CourseVideoSection ... />
  </div>
</main>
```

## Slice 6.5 Mobile: Meetups Cards

### Mobile Optimization

**Meetups Grid:**
```tsx
{/* In DashboardContent */}
<div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
  {meetups.map(meetup => (
    <MeetupCard key={meetup.meetupId} meetup={meetup} />
  ))}
</div>
```

**Meetup Card Mobile Adjustments:**
```tsx
export function MeetupCard({ meetup }: MeetupCardProps) {
  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardContent className="p-4 sm:p-6">  {/* Responsive padding */}
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start justify-between gap-2 mb-4">
          <div className="flex items-start gap-2">
            {meetup.isRunning && (
              <Badge variant="destructive" className="animate-pulse text-xs">
                🔴 LIVE
              </Badge>
            )}
            <h3 className="text-base sm:text-xl font-semibold">{meetup.title}</h3>
          </div>
          {isSignedUp && !meetup.isRunning && (
            <Badge variant="secondary" className="text-xs">✅ Registered</Badge>
          )}
        </div>

        {/* Description */}
        <p className="text-xs sm:text-sm text-muted-foreground mb-4 line-clamp-3">
          {meetup.description}
        </p>

        {/* Metadata - Stack on mobile */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="truncate">{formatDate(meetup.nextOccurrence)}</span>
          </div>
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span>{meetup.duration} minutes</span>
          </div>
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span>Host: {meetup.hostName}</span>
          </div>
        </div>

        {/* Action Button - Full width, large tap target */}
        {meetup.isRunning && isSignedUp && meetup.zoomLink ? (
          <Button
            onClick={handleJoinZoom}
            className="w-full h-11 sm:h-10"  // Taller on mobile
            size="lg"
          >
            <Video className="mr-2 h-5 w-5" />
            Join Zoom Meeting
          </Button>
        ) : isSignedUp ? (
          <div className="text-xs sm:text-sm text-muted-foreground text-center p-3 bg-muted rounded-md">
            You're registered! Calendar invite coming soon.
          </div>
        ) : (
          <Button
            onClick={handleSignup}
            variant="outline"
            className="w-full h-11 sm:h-10"
            disabled={isLoading}
          >
            {isLoading ? 'Signing up...' : 'Sign Up for Meetup'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
```

**Key Mobile Optimizations:**
- Card padding: `p-4` on mobile, `p-6` on desktop
- Title size: `text-base` on mobile, `text-xl` on desktop
- Text size: `text-xs` on mobile, `text-sm` on desktop
- Description: Line-clamp to 3 lines on mobile
- Button height: `h-11` (44px) on mobile for better tap target
- Badges: Smaller text (`text-xs`) on mobile
- Truncate long dates: Prevent horizontal overflow

## Touch Interactions

### Tap Target Sizes

Following **WCAG 2.5.5 Target Size** guidelines:
- **Minimum**: 44px × 44px (iOS), 48px × 48px (Android)
- **Comfortable**: 48px × 48px minimum

**Applied to:**
- Header buttons: `h-9 w-9` (36px) → Increased to `h-10 w-10` (40px) on mobile
- Hamburger menu: `h-12 w-12` (48px) ✅
- Meetup buttons: `h-11` (44px) ✅
- Lesson links: `p-4` (16px padding) → Total height ~56px ✅

### Active States (Touch Feedback)

```tsx
{/* Course cards */}
<Link className="
  active:scale-[0.98]     // Slight shrink on tap
  active:opacity-90       // Slight fade on tap
  transition-transform
">

{/* Lesson links in mobile sheet */}
<Link className="
  hover:bg-muted
  active:bg-muted         // Instant background on tap
  transition-colors
">

{/* Buttons */}
<Button className="
  active:scale-95         // Button press effect
  transition-transform
">
```

## Responsive Spacing

### Dashboard Sections

```tsx
<div className="space-y-8 sm:space-y-12">  {/* Section gaps */}
  <section>
    <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">My Courses</h2>
    <div className="grid gap-4 sm:gap-6 ...">...</div>
  </section>

  <section>
    <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">Community Meetups</h2>
    <div className="grid gap-4 sm:gap-6 ...">...</div>
  </section>
</div>
```

### Page Padding

```tsx
{/* Dashboard page */}
<main className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8 bg-muted/30">
  <div className="container mx-auto">
    <DashboardContent />
  </div>
</main>

{/* Course page */}
<main className="flex pt-16">
  <CollapsibleLessonSidebar ... />
  <div className="flex-1 p-4 sm:p-6 lg:p-8">
    <CourseVideoSection ... />
  </div>
</main>
```

## Performance Optimizations

### Reduce Animations on Mobile

```tsx
{/* Use prefers-reduced-motion for accessibility */}
<motion.header
  initial={{ y: -20, opacity: 0 }}
  animate={{ y: 0, opacity: 1 }}
  transition={{
    duration: 0.3,
    // Respect user preference
    ...(window.matchMedia('(prefers-reduced-motion: reduce)').matches && {
      duration: 0
    })
  }}
>
```

### Image Loading

```tsx
{/* Course thumbnails - use gradient instead of images for performance */}
<div className="h-32 sm:h-40 bg-gradient-to-br from-primary to-primary/60">
  <BookOpen className="h-12 w-12 sm:h-16 sm:w-16" />
</div>
```

## Testing Checklist (Mobile-Specific)

### Header
- [ ] Logo abbreviated to "LM" on screens < 640px
- [ ] Progress text hidden on mobile, only percentage visible
- [ ] Header icons (Feedback, Profile) are tappable (40px minimum)
- [ ] Profile dropdown opens on mobile without issues
- [ ] Header doesn't overlap content (fixed positioning correct)

### Dashboard
- [ ] Course cards stack in single column on mobile
- [ ] Course cards have appropriate padding (not cramped)
- [ ] Progress bars visible and not cut off
- [ ] Meetup cards stack in single column on mobile
- [ ] All buttons are easy to tap (44px+ height)
- [ ] Hover effects work on touch devices (active states visible)

### Course Page
- [ ] Hamburger menu visible on mobile (fixed top-right)
- [ ] Hamburger button is large enough to tap easily (48px)
- [ ] Tapping hamburger opens lesson sheet from right
- [ ] Lesson sheet covers most of screen (320px-384px width)
- [ ] Selecting lesson closes sheet automatically
- [ ] Video player is full width on mobile
- [ ] Lesson description readable (not too small)
- [ ] "Next Lesson" button is full width and tappable

### Meetups
- [ ] Meetup cards full width on mobile
- [ ] "Join Zoom Meeting" button is large and tappable
- [ ] Date/time doesn't overflow horizontally
- [ ] Live badge ("LIVE NOW") visible on mobile

### General
- [ ] No horizontal scrolling on any page
- [ ] Text is readable (minimum 14px for body text)
- [ ] Touch targets meet 44px minimum guideline
- [ ] Active/tap states provide visual feedback
- [ ] Page loads quickly on mobile networks
- [ ] Animations respect prefers-reduced-motion
- [ ] All functionality works on iOS Safari and Chrome Android

## Forward-Looking Requirements

### For Future Enhancements
- **PWA (Progressive Web App)**: Add to home screen, offline support
- **Pull-to-refresh**: Native-like gesture for refreshing dashboard
- **Swipe gestures**: Swipe between lessons in course view
- **Bottom navigation**: Alternative navigation pattern for mobile
- **Haptic feedback**: Vibration on button taps (where supported)
- **Picture-in-picture**: Continue watching video while browsing lessons
