# Slice 6.1: Unified Header Component

## Objectives

Create a unified, authenticated header component that works across both dashboard and course pages, providing consistent navigation and user controls. Replace the current public header with a context-aware header that shows profile, feedback, and course progress when applicable.

## User Stories

1. **As a student**, I want to access my profile and sign out from any page without scrolling or hunting for buttons.
2. **As a student in a course**, I want to see my course progress in the header so I always know how far I've come.
3. **As a mobile user**, I want a responsive header that doesn't clutter my screen but still gives me access to key actions.

## Current State (BEFORE)

**File:** `frontend/components/layout/Header.tsx`

This is a **public header** for unauthenticated users:
```tsx
<motion.header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
  <div className="container mx-auto px-4 py-4 flex items-center justify-between">
    {/* Logo/Brand */}
    <Link href="/" className="flex items-center gap-2">
      <div className="text-2xl font-bold text-primary">LearnerMax</div>
    </Link>

    {/* Navigation */}
    <nav className="flex items-center gap-4">
      <Button variant="ghost" asChild>
        <Link href="/signin">Sign In</Link>
      </Button>
      <Button onClick={handleEnrollClick}>Enroll Now</Button>
    </nav>
  </div>
</motion.header>
```

**Dashboard Usage:**
- Dashboard (`frontend/app/dashboard/page.tsx`) imports and renders this public header
- Not contextual - shows "Sign In" even though user is authenticated
- No profile dropdown, no feedback button

**Course Page Usage:**
- Course page also imports this same public header
- No progress bar shown in header

## Target State (AFTER)

**New File:** `frontend/components/layout/AuthenticatedHeader.tsx`

Create a new authenticated header component with two variants:

### Variant 1: Dashboard Header
```tsx
<AuthenticatedHeader
  variant="dashboard"
  user={session.user}
/>
```

**Structure:**
```
┌─────────────────────────────────────────────────────────────┐
│ [Logo: LearnerMax]              [Feedback] [Profile ▼]     │
└─────────────────────────────────────────────────────────────┘
```

**Components:**
- **Logo (left)**: "LearnerMax" brand → Links to `/dashboard`
- **Feedback icon (right)**: MessageCircle icon → Links to feedback form/modal
- **Profile dropdown (right)**:
  - Trigger: Avatar with user initials
  - Dropdown content:
    - User name (bold)
    - User email (muted)
    - Divider
    - "Sign Out" button

### Variant 2: Course Header
```tsx
<AuthenticatedHeader
  variant="course"
  user={session.user}
  courseProgress={{ percentage: 60, completedLessons: 3, totalLessons: 5 }}
/>
```

**Structure:**
```
┌─────────────────────────────────────────────────────────────┐
│ [Logo]  [Progress: 60%] [━━━━━━━──────]  [Feedback] [Profile ▼] │
└─────────────────────────────────────────────────────────────┘
```

**Additional Components (course variant only):**
- **Progress indicator**: "3 of 5 lessons • 60%"
- **Progress bar**: Horizontal bar showing visual progress

## Type Contracts

**File:** `frontend/components/layout/AuthenticatedHeader.tsx`

```typescript
export interface AuthenticatedHeaderProps {
  variant: 'dashboard' | 'course';
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image?: string | null;
  };
  courseProgress?: {
    percentage: number;
    completedLessons: number;
    totalLessons: number;
  };
}

export function AuthenticatedHeader({
  variant,
  user,
  courseProgress
}: AuthenticatedHeaderProps) {
  // Implementation
}
```

## Implementation Details

### Logo Behavior
```tsx
<Link href="/dashboard" className="flex items-center gap-2">
  <div className="text-2xl font-bold text-primary">LearnerMax</div>
</Link>
```

### Profile Dropdown (using shadcn/ui DropdownMenu)

**DO ✅ - Use shadcn DropdownMenu with proper structure:**
```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
      <Avatar className="h-10 w-10">
        <AvatarImage src={user.image || undefined} alt={user.name || 'User'} />
        <AvatarFallback>{getUserInitials(user.name)}</AvatarFallback>
      </Avatar>
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" className="w-56">
    <DropdownMenuLabel>
      <div className="flex flex-col space-y-1">
        <p className="text-sm font-medium leading-none">{user.name}</p>
        <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
      </div>
    </DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={() => signOut()}>
      <LogOut className="mr-2 h-4 w-4" />
      <span>Sign Out</span>
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

**DON'T ❌ - Don't use a Card component for profile:**
```tsx
{/* This was the old dashboard pattern - don't do this in header */}
<Card className="p-6">
  <div className="flex items-start justify-between">
    <div className="flex items-center gap-4">
      <Avatar className="w-16 h-16">...</Avatar>
      <div>
        <h2>{user.name}</h2>
        <div>{user.email}</div>
      </div>
    </div>
  </div>
</Card>
```

### Feedback Button
```tsx
<Button variant="ghost" size="icon" asChild>
  <Link href="/feedback">
    <MessageCircle className="h-5 w-5" />
    <span className="sr-only">Feedback</span>
  </Link>
</Button>
```

### Course Progress Display (course variant only)
```tsx
{variant === 'course' && courseProgress && (
  <div className="flex items-center gap-4 flex-1 max-w-md mx-4">
    <div className="text-sm font-medium whitespace-nowrap">
      {courseProgress.completedLessons} of {courseProgress.totalLessons} lessons • {courseProgress.percentage}%
    </div>
    <div className="flex-1 bg-secondary rounded-full h-2">
      <div
        className="bg-primary rounded-full h-2 transition-all"
        style={{ width: `${courseProgress.percentage}%` }}
      />
    </div>
  </div>
)}
```

## Mobile Responsiveness

**Breakpoints:**
- **Mobile (< 768px)**: Hide progress text, show only progress bar
- **Tablet/Desktop (>= 768px)**: Show full progress text + bar

```tsx
{/* Progress - responsive */}
{variant === 'course' && courseProgress && (
  <div className="flex items-center gap-2 flex-1 max-w-md mx-4">
    <div className="hidden md:block text-sm font-medium whitespace-nowrap">
      {courseProgress.completedLessons} of {courseProgress.totalLessons} • {courseProgress.percentage}%
    </div>
    <div className="flex-1 bg-secondary rounded-full h-2">
      <div className="bg-primary rounded-full h-2 transition-all"
           style={{ width: `${courseProgress.percentage}%` }} />
    </div>
  </div>
)}
```

## Integration Points

### Dashboard Page Updates

**File:** `frontend/app/dashboard/page.tsx`

**BEFORE:**
```tsx
import { Header } from '@/components/layout/Header';

export default async function DashboardPage() {
  const session = await auth();

  return (
    <>
      <Header />  {/* Public header */}
      <main>...</main>
    </>
  );
}
```

**AFTER:**
```tsx
import { AuthenticatedHeader } from '@/components/layout/AuthenticatedHeader';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/signin?callbackUrl=/dashboard');
  }

  return (
    <>
      <AuthenticatedHeader variant="dashboard" user={session.user} />
      <main>...</main>
    </>
  );
}
```

### Course Page Updates

**File:** `frontend/app/course/[courseId]/page.tsx`

**BEFORE:**
```tsx
import { Header } from '@/components/layout/Header';

export default async function CoursePage({ params, searchParams }) {
  // ... fetch course, progress, etc.

  return (
    <>
      <Header />
      <main>...</main>
    </>
  );
}
```

**AFTER:**
```tsx
import { AuthenticatedHeader } from '@/components/layout/AuthenticatedHeader';

export default async function CoursePage({ params, searchParams }) {
  const session = await auth();
  const progress = await getProgress(params.courseId);

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
      <main>...</main>
    </>
  );
}
```

## Styling Consistency

Use existing patterns from the codebase:
- **Fixed positioning**: `fixed top-0 left-0 right-0 z-50`
- **Backdrop blur**: `bg-background/80 backdrop-blur-sm`
- **Border**: `border-b border-border`
- **Container**: `container mx-auto px-4 py-4`
- **Framer Motion**: Animate entrance with `initial={{ y: -20, opacity: 0 }}` and `animate={{ y: 0, opacity: 1 }}`

## Forward-Looking Requirements

### For Slice 6.2 (Dashboard Progress Integration)
- Header is ready; no changes needed
- Dashboard will pass `user` prop from session

### For Slice 6.3 (Course Layout Redesign)
- Header is ready; course page will pass `courseProgress` prop
- Progress data will be fetched fresh on each course page load

### For Future Features
- Notifications icon can be added next to Feedback icon
- Course selector dropdown could be added for quick course switching
- Dark mode toggle could live in profile dropdown



**No API changes needed** - This is purely a frontend UI component.

## Testing Checklist

- [ ] Header renders correctly on dashboard page
- [ ] Header renders correctly on course page with progress
- [ ] Logo links to `/dashboard`
- [ ] Profile dropdown shows user name and email
- [ ] Sign out button works and redirects to sign-in page
- [ ] Feedback button links to `/feedback` (or shows "coming soon" if not implemented)
- [ ] Progress bar in course header updates when lesson is marked complete
- [ ] Mobile: Header is responsive and doesn't overflow
- [ ] Mobile: Progress text is hidden, progress bar is visible
- [ ] Avatar shows user image if available, falls back to initials