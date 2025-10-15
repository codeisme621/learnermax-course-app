# Pattern Analysis: Enrollment CourseId Logic

**Date**: 2025-10-13
**Spec**: `specs/student_enrollment/slices/enrollment-frontend/single-course-free-enrollment.md`
**Focus**: CourseId tracking through authentication flow

## Executive Summary

The spec requires tracking a `courseId` from the initial landing page click through a multi-step authentication flow (signup → verify → signin → dashboard) before enrolling the user. The codebase **does not use localStorage or sessionStorage anywhere**, relying instead on **URL query parameters** and **NextAuth session cookies** for state persistence.

**Recommended Approach**: Use a combination of URL query parameters (for pre-auth flow) and NextAuth JWT session storage (for post-auth flow) to track courseId, following existing patterns in the codebase.

---

## Existing Patterns Found

### 1. URL Query Parameter Pattern (Pre-Authentication)

**Pattern**: Pass data between pages via URL query parameters
**Consistency**: High - Used consistently throughout auth flow
**Locations**:
- `frontend/components/auth/SignInForm.tsx:16` - Reading `callbackUrl` parameter
- `frontend/components/enrollment/VerifyEmailForm.tsx:14-28` - Reading and validating `email` parameter
- `frontend/components/landing/HeroSection.tsx:40` - Passing `courseid` parameter
- `frontend/app/dashboard/page.tsx:17` - Setting `callbackUrl` on redirect

**Example from codebase**:
```tsx
// Setting parameter (EnrollmentForm.tsx:44)
router.push(`/verify-email?email=${encodeURIComponent(formData.email)}`);

// Reading parameter (VerifyEmailForm.tsx:14-16)
const searchParams = useSearchParams();
const email = searchParams.get('email') || '';
```

**Key aspects**:
- Uses Next.js 13+ App Router `useSearchParams()` hook
- Always includes default/fallback values
- URL-encodes values with `encodeURIComponent()`
- Validates presence with `useEffect` guards

**Current state**: CourseId is passed as `?courseid=course-001` from landing pages but **NOT currently read** in `/app/enroll/page.tsx`.

---

### 2. NextAuth Session/JWT Storage Pattern (Post-Authentication)

**Pattern**: Store user data in encrypted JWT tokens managed by NextAuth
**Consistency**: High - All authentication state uses this pattern
**Locations**:
- `frontend/auth.config.ts:31-91` - JWT callback for token management
- `frontend/auth.config.ts:93-114` - Session callback for exposing data
- `frontend/app/actions/auth.ts:57-74` - Token access utilities

**Example from codebase**:
```typescript
// JWT callback - storing custom data (auth.config.ts:31-47)
async jwt({ token, user, account }) {
  // Initial sign in
  if (user && account) {
    return {
      ...token,
      access_token: userWithTokens.accessToken,
      id_token: userWithTokens.idToken,
      refresh_token: userWithTokens.refreshToken,
      expires_at: account.expires_at,
      userId: user.id,
    };
  }
  return token;
}

// Session callback - exposing to client/server (auth.config.ts:93-114)
async session({ session, token }) {
  return {
    ...session,
    user: {
      ...session.user,
      id: token.userId as string,
    },
    access_token: token.access_token as string,
    id_token: token.id_token as string,
  };
}
```

**Key aspects**:
- JWT tokens stored in HTTP-only cookies (secure, not accessible to JavaScript)
- Custom data added to token during `jwt` callback
- Data exposed via `session` callback
- Server-side access via `await auth()`
- Client-side access via `useSession()` hook (from SessionProvider)

**Current state**: No courseId stored in session currently.

---

### 3. Server Action with Authentication Pattern

**Pattern**: Server-side functions callable from client components
**Consistency**: High - All API calls use this pattern
**Locations**:
- `frontend/app/actions/auth.ts:1-97` - Authentication actions
- `frontend/app/actions/courses.ts:1-98` - Course data fetching
- `frontend/app/actions/auth.ts:57-74` - Token access for authenticated requests

**Example from codebase**:
```typescript
// Server action pattern (courses.ts:8-64)
'use server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export async function getAllCourses(): Promise<
  { courses: Course[] } | { error: string }
> {
  try {
    const response = await fetch(`${API_URL}/api/courses`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      return { error: 'Failed to fetch courses' };
    }

    const courses: Course[] = await response.json();
    return { courses };
  } catch (error) {
    return { error: 'Failed to fetch courses' };
  }
}

// Authenticated request pattern (auth.ts:57-74)
export const getAccessToken = cache(async (): Promise<string | null> => {
  const session = await auth();
  if (!session) return null;
  return session.access_token;
});
```

**Key aspects**:
- `'use server'` directive at top of file
- Returns discriminated union types for error handling
- Uses `cache()` for deduplication
- Access tokens retrieved from session for backend calls

---

### 4. Backend Enrollment API Pattern

**Pattern**: RESTful enrollment endpoints with authentication
**Consistency**: High - Matches all other backend endpoints
**Locations**:
- `backend/src/features/enrollment/enrollment.routes.ts:11-32` - POST enrollment
- `backend/src/features/enrollment/enrollment.service.ts:9-45` - Business logic
- `backend/src/features/enrollment/enrollment.repository.ts:7-61` - Data access

**Example from codebase**:
```typescript
// POST /api/enrollments (enrollment.routes.ts:12-31)
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromContext(req);
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { courseId } = req.body;
    if (!courseId) {
      res.status(400).json({ error: 'courseId is required' });
      return;
    }

    const result = await enrollmentService.enrollUser(userId, courseId);
    res.status(201).json(result);
  } catch (error) {
    logger.error('Enrollment failed', { error });
    res.status(500).json({ error: 'Failed to enroll' });
  }
});
```

**Key aspects**:
- Requires authentication via `getUserIdFromContext()`
- Expects `{ courseId }` in request body
- Returns enrollment result or error
- Includes idempotency check (service layer)

---

### 5. Dashboard Pattern (Ideal Trigger Point)

**Pattern**: Server component with session check and client data display
**Consistency**: Standard pattern for protected pages
**Location**: `frontend/app/dashboard/page.tsx:1-31`

**Example from codebase**:
```typescript
// Server component with auth check (dashboard/page.tsx:13-31)
export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect('/signin?callbackUrl=/dashboard');
  }

  return (
    <>
      <Header />
      <main className="min-h-screen pt-20 py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <DashboardContent session={session} />
        </div>
      </main>
      <Footer />
    </>
  );
}
```

**Key aspects**:
- Server-side auth check with `await auth()`
- Passes session to client component as prop
- Redirects with callbackUrl if not authenticated
- **This is the ideal place to trigger enrollment** after authentication completes

---

## Pattern Gap Analysis

### What's Missing

**No localStorage/sessionStorage Pattern**:
- Search performed: `frontend/**/*.{ts,tsx,js,jsx}`
- Result: Zero usage found
- Implication: The spec's suggestion to use sessionStorage would introduce a **new pattern** not used anywhere else

**No "Deferred Action" Pattern**:
- No existing code performs actions after authentication completes
- No pattern for "save intent, execute later"
- Dashboard currently only displays data, doesn't trigger side effects

**CourseId Parameter Currently Unused**:
- Landing pages pass `?courseid=course-001`
- Enrollment page (`/app/enroll/page.tsx`) doesn't read it
- Not passed through auth flow
- Not stored anywhere

---

## Requirements Mapping

### Requirement 1: Track courseId from Landing Page Click
**From spec**: "When you enroll you do a Auth.js / Cognito signup... the tech challenge is to keep track of the courseId from the landing page"

**Existing Pattern Match**: URL Query Parameter Pattern
**Location**: `frontend/components/landing/HeroSection.tsx:40`, `frontend/components/landing/CtaSection.tsx:29`
**Current State**: Links already include `?courseid=course-001` but parameter is not read
**Fit Assessment**: ✅ Perfect match - Already in use for similar purposes (`email`, `callbackUrl`)

---

### Requirement 2: Preserve courseId Through Signup Flow
**From spec**: "Since you must sign up first... you will have a few hops"

**Existing Pattern Match**: Combination of URL Parameters + NextAuth JWT
**Examples**:
- Email persists via URL: `/verify-email?email=user@example.com`
- CallbackUrl persists via URL: `/signin?callbackUrl=/dashboard`
**Fit Assessment**: ✅ Strong match - Can chain parameters through redirects OR store in JWT once user exists

---

### Requirement 3: Wait Until Dashboard to Call Enrollment API
**From spec**: "I'm thinking right when the user clicks on enroll button we store the courseId in session storage and we check this key on the dashboard each time and if there call the enroll api"

**Existing Pattern Match**: Dashboard Server Component + useEffect in Client Component
**Location**: `frontend/app/dashboard/page.tsx` (server) + `frontend/components/dashboard/DashboardContent.tsx` (client)
**Fit Assessment**: ⚠️ Partial match - Pattern exists but needs extension
- Dashboard already checks session server-side
- Could add courseId check in DashboardContent's useEffect
- No existing "trigger action on dashboard mount" pattern

---

### Requirement 4: Store courseId Temporarily
**From spec**: "store the courseId in session storage"

**Existing Pattern Match**: ❌ No direct match
**Alternative Patterns Available**:
1. **URL Query Parameters** (existing pattern) - Pass through redirects
2. **NextAuth JWT** (existing pattern) - Store in session token
3. **sessionStorage** (spec suggestion) - Not used anywhere in codebase

**Fit Assessment**: Mixed
- sessionStorage is simplest but introduces new pattern
- JWT storage is most consistent with codebase patterns
- URL parameters work but get messy with long redirect chains

---

## Recommendations

### Option A: NextAuth JWT Storage (Recommended - Most Consistent)

**Why**: Follows existing authentication patterns, secure, persists through redirects

**Implementation**:
1. **Capture courseId on enroll page**:
   ```tsx
   // frontend/app/enroll/page.tsx
   const searchParams = useSearchParams();
   const courseId = searchParams.get('courseid') || null;
   ```

2. **Store in JWT during signup** via custom Cognito attribute:
   ```typescript
   // frontend/lib/cognito.ts - signUp function
   const command = new SignUpCommand({
     ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '',
     Username: email,
     Password: password,
     UserAttributes: [
       { Name: 'name', Value: name },
       { Name: 'email', Value: email },
       { Name: 'custom:pending_course', Value: courseId || '' }, // Custom attribute
     ],
   });
   ```

3. **Add to JWT token**:
   ```typescript
   // frontend/auth.config.ts - jwt callback
   async jwt({ token, user, account }) {
     if (user && account) {
       return {
         ...token,
         // ... existing fields
         pendingCourseId: user.pending_course || null, // Add from Cognito
       };
     }
     return token;
   }
   ```

4. **Expose in session**:
   ```typescript
   // frontend/auth.config.ts - session callback
   async session({ session, token }) {
     return {
       ...session,
       // ... existing fields
       pendingCourseId: token.pendingCourseId as string | null,
     };
   }
   ```

5. **Check and enroll on dashboard mount**:
   ```tsx
   // frontend/components/dashboard/DashboardContent.tsx
   useEffect(() => {
     const handlePendingEnrollment = async () => {
       if (session.pendingCourseId) {
         const result = await enrollInCourse(session.pendingCourseId);
         if ('enrollment' in result) {
           // Clear pending course from session
           // Show success toast
         }
       }
     };
     handlePendingEnrollment();
   }, [session.pendingCourseId]);
   ```

**Pros**:
- ✅ Follows existing NextAuth pattern
- ✅ Secure (HTTP-only cookies)
- ✅ Persists through redirects automatically
- ✅ No new patterns introduced
- ✅ Works for both email and Google signup

**Cons**:
- ⚠️ Requires Cognito custom attribute setup
- ⚠️ More complex than sessionStorage
- ⚠️ Harder to debug (tokens are encrypted)

---

### Option B: SessionStorage (Spec Suggestion - Simplest)

**Why**: Simple, direct, matches spec suggestion

**Implementation**:
1. **Capture and store on enroll button click**:
   ```tsx
   // frontend/components/landing/HeroSection.tsx or EnrollmentForm
   const handleEnrollClick = (courseId: string) => {
     sessionStorage.setItem('pendingCourseId', courseId);
     router.push('/enroll');
   };
   ```

2. **Check and enroll on dashboard mount**:
   ```tsx
   // frontend/components/dashboard/DashboardContent.tsx
   useEffect(() => {
     const pendingCourseId = sessionStorage.getItem('pendingCourseId');
     if (pendingCourseId) {
       enrollInCourse(pendingCourseId).then((result) => {
         if ('enrollment' in result) {
           sessionStorage.removeItem('pendingCourseId');
           // Show success
         }
       });
     }
   }, []);
   ```

**Pros**:
- ✅ Simplest implementation
- ✅ Matches spec suggestion
- ✅ Easy to debug (inspect Application tab)
- ✅ No backend changes needed
- ✅ Works immediately

**Cons**:
- ❌ Introduces new pattern not used anywhere in codebase
- ⚠️ Cleared if user opens in new tab
- ⚠️ Not accessible server-side
- ⚠️ Requires client component for access

---

### Option C: URL Query Parameter Chaining (Existing Pattern)

**Why**: Uses existing pattern, no new concepts

**Implementation**:
1. **Pass courseId through entire flow**:
   ```tsx
   // From landing page
   <Link href="/enroll?courseid=course-001">

   // Enrollment form submit
   router.push(`/verify-email?email=${email}&courseid=${courseId}`);

   // After verification
   router.push(`/signin?callbackUrl=/dashboard&courseid=${courseId}`);

   // Dashboard reads and enrolls
   const courseId = searchParams.get('courseid');
   ```

**Pros**:
- ✅ Uses existing pattern consistently
- ✅ No new patterns introduced
- ✅ Visible in URL for debugging
- ✅ Works server-side and client-side

**Cons**:
- ❌ CourseId visible in URL (not sensitive but aesthetically poor)
- ❌ Gets messy with multiple parameters
- ⚠️ Lost if user manually navigates to dashboard
- ⚠️ Requires passing through every redirect

---

## Final Recommendation

**Use Option A (NextAuth JWT Storage) for production quality, Option B (SessionStorage) for MVP speed.**

### For MVP / Quick Implementation:
**Choose Option B (SessionStorage)**
- Fastest to implement (30 minutes)
- Matches spec suggestion
- Easy to understand and debug
- Can be refactored later

### For Production / Long-term:
**Choose Option A (NextAuth JWT Storage)**
- Most consistent with codebase architecture
- More robust (survives tab changes)
- Follows authentication patterns
- Better security posture

### Implementation Plan for Option B (SessionStorage - Recommended for MVP):

1. **Update landing page links** to call handler:
   ```tsx
   // frontend/components/landing/HeroSection.tsx:40
   <Link
     href="/enroll"
     onClick={() => sessionStorage.setItem('pendingCourseId', course.id)}
   >
     Enroll Now
   </Link>
   ```

2. **Create enrollment server action**:
   ```typescript
   // frontend/app/actions/enrollment.ts (NEW FILE)
   'use server';

   import { getAccessToken } from './auth';

   export async function enrollInCourse(courseId: string) {
     const token = await getAccessToken();
     if (!token) return { error: 'Not authenticated' };

     const response = await fetch(`${API_URL}/api/enrollments`, {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${token}`,
       },
       body: JSON.stringify({ courseId }),
     });

     if (!response.ok) return { error: 'Enrollment failed' };
     return await response.json();
   }
   ```

3. **Add enrollment check to dashboard**:
   ```tsx
   // frontend/components/dashboard/DashboardContent.tsx
   'use client';

   export function DashboardContent({ session }: Props) {
     const [enrollmentStatus, setEnrollmentStatus] = useState<string | null>(null);

     useEffect(() => {
       const pendingCourseId = sessionStorage.getItem('pendingCourseId');
       if (pendingCourseId) {
         enrollInCourse(pendingCourseId).then((result) => {
           if ('enrollment' in result) {
             sessionStorage.removeItem('pendingCourseId');
             setEnrollmentStatus('Successfully enrolled!');
           } else {
             setEnrollmentStatus(`Error: ${result.error}`);
           }
         });
       }
     }, []);

     // ... rest of component
   }
   ```

4. **Add enrollment data fetching** (after enrollment completes):
   ```tsx
   // Fetch and display enrolled courses
   const [enrollments, setEnrollments] = useState([]);

   useEffect(() => {
     if (enrollmentStatus?.includes('Success')) {
       getUserEnrollments().then(data => setEnrollments(data));
     }
   }, [enrollmentStatus]);
   ```

---

## Alternative Approaches Considered

### ❌ Cookies
**Why not**: NextAuth already uses cookies for session; adding more cookies is redundant when session storage exists

### ❌ React Context
**Why not**: Context is cleared on page reload; won't survive authentication redirects

### ❌ Database Storage
**Why not**: Overkill for temporary intent; requires backend changes and cleanup logic

---

## Testing Strategy

### E2E Test Pattern:
```typescript
// e2e/ui/enrollment-flow.spec.ts
test('should enroll user in course after signup', async ({ page }) => {
  // 1. Click enroll from landing page
  await page.goto('/');
  await page.getByRole('link', { name: /enroll now/i }).click();

  // 2. Verify courseId stored
  const courseId = await page.evaluate(() =>
    sessionStorage.getItem('pendingCourseId')
  );
  expect(courseId).toBe('course-001');

  // 3. Complete signup flow
  await page.fill('[name="email"]', 'test@example.com');
  // ... rest of signup

  // 4. Verify enrollment on dashboard
  await page.waitForURL('/dashboard');
  await expect(page.getByText(/successfully enrolled/i)).toBeVisible();

  // 5. Verify courseId cleared
  const clearedId = await page.evaluate(() =>
    sessionStorage.getItem('pendingCourseId')
  );
  expect(clearedId).toBeNull();
});
```

---

## Summary

**Use sessionStorage for MVP speed** (matches spec, simplest):
- Store courseId when user clicks "Enroll Now"
- Check sessionStorage on dashboard mount
- Call enrollment API if courseId present
- Clear sessionStorage after successful enrollment

**Pattern consistency**: While sessionStorage introduces a new pattern, it's isolated to this specific flow and can be easily refactored to NextAuth JWT storage later if needed.

**Files to modify**:
1. `frontend/components/landing/HeroSection.tsx` - Add sessionStorage.setItem
2. `frontend/components/landing/CtaSection.tsx` - Add sessionStorage.setItem
3. `frontend/app/actions/enrollment.ts` - NEW FILE for enrollment server action
4. `frontend/components/dashboard/DashboardContent.tsx` - Add useEffect to check and enroll
5. `e2e/ui/enrollment-flow.spec.ts` - NEW FILE for E2E test

**Trade-offs accepted**:
- New pattern (sessionStorage) not used elsewhere
- Client-side only (not accessible in Server Components)
- Cleared on new tab (acceptable for this flow)
