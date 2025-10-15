# Research: Single Course Free Enrollment (Frontend)

**Date**: 2025-10-13
**Research Question**: Research codebase for implementing frontend single course free enrollment flow from landing page to dashboard

## Summary

The LearnerMax frontend already has most components needed for the single course free enrollment flow, but requires modifications to implement the courseId tracking pattern specified in the user story. The current implementation passes courseId via URL parameters (`/enroll?courseid=course-001`), which the spec explicitly states should be removed in favor of session storage.

**Key Findings**:
- Landing page with enrollment buttons exists and currently uses hardcoded `course-001`
- Complete authentication flow exists using NextAuth.js + AWS Cognito
- Dashboard page exists with placeholder for "Your Courses"
- Backend enrollment API is fully functional and documented
- **Critical Gap**: No session storage pattern exists in codebase - this will be a new pattern
- **Critical Gap**: No course page/player exists - only placeholder needed per spec

## Detailed Findings

### 1. Landing Page Implementation

**Location**: `frontend/app/page.tsx:1`

The landing page is a composition of multiple sections displaying course information:

```typescript
// Composed of landing sections
<HeroSection course={mockCourse} />
<BenefitsSection benefits={mockCourse.benefits} />
<CourseMetadataSection
  instructor={mockCourse.instructor}
  curriculum={mockCourse.curriculum}
/>
<TestimonialsSection testimonials={mockCourse.testimonials} />
<CtaSection />
```

**Enrollment Buttons Found**:

1. **HeroSection** (`frontend/components/landing/HeroSection.tsx:40`)
   - Dynamic courseId: `href={/enroll?courseid=${course.id}}`
   - Button text: "Enroll Now"
   - Uses course prop passed from parent

2. **CtaSection** (`frontend/components/landing/CtaSection.tsx:29`)
   - Hardcoded courseId: `href="/enroll?courseid=course-001"`
   - Button text: "Get Started"
   - No props, statically defined

3. **Header Component** (`frontend/components/layout/Header.tsx:24`)
   - Hardcoded courseId: `href="/enroll?courseid=course-001"`
   - Button text: "Enroll Now"
   - Shows on all pages

**Mock Data** (`frontend/lib/mock-data/course.ts:37`):
```typescript
export const mockCourse: CourseData = {
  id: "course-001",
  // ... other properties
}
```

**Spec Requirement**:
- Replace URL parameter pattern with session storage
- When user clicks enroll button, store courseId `TEST-COURSE-001` in session storage
- Remove courseId from URL entirely

---

### 2. Authentication Flow

**Architecture**: NextAuth.js v5 with AWS Cognito User Pool

**Configuration Files**:
- `frontend/lib/auth.ts:1` - NextAuth instance with Credentials provider
- `frontend/auth.config.ts:31-114` - JWT callbacks, token refresh, session handling
- `frontend/middleware.ts:1` - Route protection middleware
- `frontend/lib/cognito.ts:1` - Cognito operations (signUp, confirmSignUp)
- `frontend/lib/cognito-auth.ts:1` - Cognito sign-in logic

**User Flows**:

#### Email Signup Flow
1. User clicks enrollment button → `/enroll` page
2. Fills `EnrollmentForm` (`frontend/components/enrollment/EnrollmentForm.tsx:17`)
   - Fields: name, email, password
   - Calls `signUpAction()` server action
3. Redirects to `/verify-email?email={email}`
4. User enters verification code in `VerifyEmailForm` (`frontend/components/enrollment/VerifyEmailForm.tsx:14`)
   - Calls `verifyEmailAction()` server action
5. After verification, calls `signInAction()` automatically
6. NextAuth creates JWT session
7. Redirects to `/dashboard`

**Server Actions** (`frontend/app/actions/auth.ts`):
- `signUpAction(name, email, password)` - Line 21-57
- `verifyEmailAction(email, code)` - Line 75-132
- `signInAction(email, password)` - Line 134-173

#### Google OAuth Flow
1. User clicks Google button → `GoogleSignInButton` (`frontend/components/enrollment/GoogleSignInButton.tsx:1`)
2. Calls NextAuth `signIn('google')`
3. Redirects to Google OAuth
4. Returns to app with Google credentials
5. NextAuth creates JWT session automatically
6. Redirects to `/dashboard`

**Current Limitation**:
- Spec requires courseId persistence through entire auth flow
- Currently no mechanism to carry courseId from enroll click → verification → sign-in → dashboard
- Session storage would solve this (new pattern to implement)

---

### 3. Session Storage Implementation

**Current State**: **No session storage or local storage usage exists in the codebase**

**Session Management Architecture**:
```
NextAuth.js JWT (server-side)
    ↓
HTTP-Only Cookies (automatic)
    ↓
No client-side storage used
```

**Existing Patterns for State**:
- **Persistent auth state**: NextAuth JWT tokens (server-managed)
- **Temporary UI state**: React useState
- **Inter-page state**: URL search parameters (e.g., `?email=user@example.com`)
- **Form state**: Controlled components with useState

**Spec Requirement**:
- Implement NEW pattern: Session storage for courseId tracking
- Store on enroll button click
- Check on dashboard mount
- Call enrollment API if courseId present
- Clear after enrollment complete

**Implementation Note**: This will establish the first browser storage pattern in the codebase.

---

### 4. Dashboard Implementation

**Location**: `frontend/app/dashboard/page.tsx:13-18`

Server component that:
- Calls `auth()` to get session
- Redirects to `/signin?callbackUrl=/dashboard` if not authenticated
- Renders layout with `DashboardContent` component

**DashboardContent** (`frontend/components/dashboard/DashboardContent.tsx:11-136`):

Client component displaying:
- User welcome message with name from session
- User avatar with initials
- **"Your Courses" section** (line 82) - Currently placeholder:
  ```typescript
  <p className="text-muted-foreground">
    Your enrolled courses will appear here. Coming soon!
  </p>
  ```

**Course Data API** (`frontend/app/actions/courses.ts:1-98`):

Server actions available:
- `getAllCourses()` - Fetches from `${API_URL}/api/courses`
- `getCourse(courseId)` - Fetches from `${API_URL}/api/courses/${courseId}`

**Type Definitions** (lines 3-28):
```typescript
export interface Course {
  id: string;
  title: string;
  description: string;
  instructor: string;
  pricingModel: 'free' | 'paid';
  price?: number;
  // ... other fields
}
```

**Spec Requirements**:
1. Check session storage for courseId on dashboard mount
2. If courseId exists, call enrollment API
3. Display enrolled course card after enrollment
4. Course card should be clickable and lead to course page

**Current Gap**: No enrollment API integration on dashboard exists

---

### 5. Course Page Implementation

**Current State**: **No dedicated course page/player exists**

**Existing Course Display**:
- Landing page (`frontend/app/page.tsx`) - Marketing view of course
- No `/course/[courseId]` route exists
- No video player component exists
- No lesson/module navigation exists

**Spec Requirement**:
> "We are not building a full on course page. Just a minimum placeholder course page with shells of where the video, etc might be."

**Implementation Note**:
- Need to create new route: `/course/[courseId]`
- Placeholder page with:
  - Course title
  - Placeholder for video player
  - Placeholder for curriculum/lessons
  - Minimal styling

---

### 6. Backend Enrollment API

**Base URL**: `${API_URL}/api/enrollments`

**Environment Variable**: `NEXT_PUBLIC_API_URL` (configured in frontend)

#### POST /api/enrollments - Create Enrollment

**Location**: `backend/src/features/enrollment/enrollment.routes.ts:12-32`

**Request**:
```typescript
POST /api/enrollments
Headers: {
  "Authorization": "Bearer {accessToken}",
  "Content-Type": "application/json"
}
Body: {
  "courseId": "string"
}
```

**Response (201 Created)**:
```json
{
  "enrollment": {
    "userId": "string",
    "courseId": "string",
    "enrollmentType": "free",
    "enrolledAt": "2025-10-13T12:00:00.000Z",
    "paymentStatus": "free",
    "progress": 0,
    "completed": false
  },
  "status": "active"
}
```

**Authentication**:
- Requires AWS Cognito JWT token in Authorization header
- Backend extracts userId from `x-amzn-request-context` header (API Gateway)
- Returns 401 if unauthorized

**Business Logic** (`backend/src/features/enrollment/enrollment.service.ts:10-33`):
- Checks if enrollment already exists (idempotency)
- Returns existing enrollment if found
- For free courses: Uses `FreeEnrollmentStrategy`
- Creates enrollment record in DynamoDB
- Returns `{ enrollment, status: 'active' }`

#### GET /api/enrollments - Get User's Enrollments

**Location**: `backend/src/features/enrollment/enrollment.routes.ts:35-49`

**Request**:
```typescript
GET /api/enrollments
Headers: {
  "Authorization": "Bearer {accessToken}"
}
```

**Response (200 OK)**:
```json
[
  {
    "userId": "string",
    "courseId": "string",
    "enrollmentType": "free",
    "enrolledAt": "2025-10-13T12:00:00.000Z",
    "paymentStatus": "free",
    "progress": 0,
    "completed": false
  }
]
```

**Usage**: Dashboard should call this to display enrolled courses

#### GET /api/enrollments/check/:courseId - Check Enrollment Status

**Location**: `backend/src/features/enrollment/enrollment.routes.ts:52-67`

**Request**:
```typescript
GET /api/enrollments/check/TEST-COURSE-001
Headers: {
  "Authorization": "Bearer {accessToken}"
}
```

**Response (200 OK)**:
```json
{
  "enrolled": true
}
```

**Logic**: Returns true if enrollment exists AND payment status is not 'pending'

---

## Architecture Documentation

### Data Flow: Current State

```
Landing Page
    ↓
[User clicks "Enroll Now"]
    ↓
/enroll?courseid=course-001 (URL param)
    ↓
EnrollmentForm (signup)
    ↓
/verify-email?email=user@example.com (URL param)
    ↓
VerifyEmailForm
    ↓
Auto sign-in
    ↓
/dashboard
    ↓
DashboardContent (placeholder - no enrollment logic)
```

**Problem**: courseId lost after enrollment click - no way to complete enrollment on dashboard

### Data Flow: Spec Requirements

```
Landing Page
    ↓
[User clicks "Enroll Now"]
    ↓
Store courseId in sessionStorage → "TEST-COURSE-001"
    ↓
/enroll (no URL params)
    ↓
EnrollmentForm (signup)
    ↓
/verify-email?email=user@example.com
    ↓
VerifyEmailForm
    ↓
Auto sign-in
    ↓
/dashboard
    ↓
Check sessionStorage for courseId
    ↓
Call POST /api/enrollments { courseId }
    ↓
Fetch enrolled courses: GET /api/enrollments
    ↓
Display course card with link to /course/TEST-COURSE-001
    ↓
Clear sessionStorage
```

### Authentication Token Flow

```
User authenticates
    ↓
NextAuth creates JWT session
    ↓
JWT stored in HTTP-only cookie (automatic)
    ↓
Frontend needs to call backend API
    ↓
Server action calls getAccessToken()
    ↓
Extracts JWT from session
    ↓
Makes fetch with Authorization: Bearer {token}
    ↓
API Gateway validates token
    ↓
Lambda receives x-amzn-request-context header with userId
    ↓
Backend extracts userId and processes request
```

**Key Pattern**: Frontend server actions use `getAccessToken()` from `frontend/app/actions/auth.ts:57-74`

### Session Storage Pattern (New)

```
Component (Client)
    ↓
sessionStorage.setItem('pendingEnrollmentCourseId', 'TEST-COURSE-001')
    ↓
[User completes auth flow]
    ↓
Dashboard mounts (useEffect)
    ↓
const courseId = sessionStorage.getItem('pendingEnrollmentCourseId')
    ↓
if (courseId) {
  await enrollInCourse(courseId)  // Server action
  sessionStorage.removeItem('pendingEnrollmentCourseId')
}
```

---

## Code References

### Frontend - Landing Page
- `frontend/app/page.tsx:1` - Root landing page
- `frontend/components/landing/HeroSection.tsx:40` - Dynamic enrollment link
- `frontend/components/landing/CtaSection.tsx:29` - Hardcoded enrollment link
- `frontend/components/layout/Header.tsx:24` - Header enrollment button
- `frontend/lib/mock-data/course.ts:37` - Mock course data with id

### Frontend - Authentication
- `frontend/lib/auth.ts:1` - NextAuth configuration
- `frontend/auth.config.ts:31-114` - JWT callbacks
- `frontend/app/actions/auth.ts:57-74` - getAccessToken() function
- `frontend/components/enrollment/EnrollmentForm.tsx:17` - Signup form
- `frontend/components/enrollment/VerifyEmailForm.tsx:14` - Verification form
- `frontend/components/enrollment/GoogleSignInButton.tsx:1` - Google OAuth

### Frontend - Dashboard
- `frontend/app/dashboard/page.tsx:13-18` - Dashboard route
- `frontend/components/dashboard/DashboardContent.tsx:82` - Placeholder courses section
- `frontend/app/actions/courses.ts:1-98` - Course fetching server actions

### Backend - Enrollment API
- `backend/src/features/enrollment/enrollment.routes.ts:12` - POST /api/enrollments
- `backend/src/features/enrollment/enrollment.routes.ts:35` - GET /api/enrollments
- `backend/src/features/enrollment/enrollment.routes.ts:52` - GET /api/enrollments/check/:courseId
- `backend/src/features/enrollment/enrollment.service.ts:10-33` - Enrollment business logic
- `backend/src/features/enrollment/strategies/free-enrollment.strategy.ts:9-29` - Free enrollment implementation
- `backend/src/features/enrollment/enrollment.repository.ts:8-60` - DynamoDB operations
- `backend/src/lib/auth-utils.ts:61-86` - getUserIdFromContext() authentication

---

## Implementation Requirements

### Required Changes

1. **Landing Page Enrollment Buttons** (3 locations)
   - Remove URL parameter approach
   - Add onClick handler to store courseId in sessionStorage
   - Navigate to `/enroll` without query params

2. **Enrollment Flow** (New pattern)
   - Store `TEST-COURSE-001` in `sessionStorage` with key `pendingEnrollmentCourseId`
   - Persist through signup/verification/signin flow
   - Retrieve on dashboard mount

3. **Dashboard Enrollment Logic** (New feature)
   - Add useEffect to check sessionStorage on mount
   - Create server action to call POST `/api/enrollments`
   - Fetch user enrollments after enrollment
   - Display enrolled courses as cards
   - Clear sessionStorage after successful enrollment

4. **Course Card Component** (New component)
   - Display course title and basic info
   - Make clickable linking to `/course/[courseId]`
   - Show in dashboard's "Your Courses" section

5. **Course Page Placeholder** (New route)
   - Create `/course/[courseId]` route
   - Minimal page with course title
   - Placeholder for video player
   - Placeholder for curriculum
   - No full implementation needed (per spec)

### Files to Create

- `frontend/components/dashboard/CourseCard.tsx` - Enrolled course display card
- `frontend/app/course/[courseId]/page.tsx` - Placeholder course page
- `frontend/app/actions/enrollments.ts` - Server action for enrollment API

### Files to Modify

- `frontend/components/landing/HeroSection.tsx` - Add sessionStorage logic
- `frontend/components/landing/CtaSection.tsx` - Add sessionStorage logic
- `frontend/components/layout/Header.tsx` - Add sessionStorage logic
- `frontend/components/dashboard/DashboardContent.tsx` - Add enrollment checking and display
- `frontend/lib/mock-data/course.ts` - Change id to `TEST-COURSE-001` (or keep mapping)

---

## Open Questions

1. **CourseId Value**: Spec says store `TEST-COURSE-001`, but current mock data uses `course-001`. Should we:
   - Change mock data id to `TEST-COURSE-001`?
   - Keep `course-001` and update spec?
   - Add mapping logic?

 Change mock data id to `TEST-COURSE-001.

2. **Existing User Flow**: Spec says "if you have a student account with us even they should probably follow the same pattern". Should existing users:
   - Be redirected to signin page?
   - Have enrollment happen immediately on landing page?
   - Follow same sessionStorage pattern?

Follow same sessionStorage pattern.


3. **Error Handling**: If enrollment API fails on dashboard, should we:
   - Keep courseId in sessionStorage and retry?
   - Show error message to user?
   - Clear sessionStorage and require re-enrollment?

Good question.  Should just be logged for now.  This auto enroll after reaching dashboard is a nice convenice mechnasim. However we should also see the courses availble on the dashboard.  Thus, the user himself would have to click on the course card to enroll.


4. **Multiple Enrollments**: If user clicks enroll multiple times before logging in:
   - Should we overwrite courseId in sessionStorage?
   - Keep only the most recent?
   - Support multiple pending enrollments (array)?

Should we overwrite courseId in sessionStorage.

5. **Course Card Click**: When user clicks course card to go to course page:
   - Should we fetch full course data?
   - Use enrollment record to resume at last position?
   - Just display placeholder as spec says?

Should take student to protected course page. On that page it should call the course api.  We are not impl this right now, should just display placeholder stuff for now.


6. **Google OAuth Redirect**: After Google signin, NextAuth redirects to dashboard:
   - Will sessionStorage persist through OAuth redirect?
   - Need to test OAuth flow with sessionStorage
   - May need special handling for external redirect

If it doesnt persist then we have a problem.  Will have to test this.  Call this out as a major manual test that must be verified.


---

## Testing Considerations

### E2E Test Scenarios

1. **Email Signup Flow**
   - Click enroll on landing page
   - Verify sessionStorage contains courseId
   - Complete signup form
   - Verify email
   - Land on dashboard
   - Verify enrollment API called
   - Verify course card displayed
   - Verify sessionStorage cleared

2. **Google OAuth Flow**
   - Click enroll on landing page
   - Verify sessionStorage contains courseId
   - Click Google button
   - Complete OAuth (may need mock)
   - Land on dashboard
   - Verify enrollment API called
   - Verify course card displayed

3. **Existing User Flow**
   - Click enroll while logged out
   - Go to signin instead of signup
   - Complete signin
   - Verify enrollment happens
   - Verify course appears on dashboard

4. **Idempotency Test**
   - Enroll in course
   - Manually trigger enrollment again
   - Verify no duplicate enrollment
   - Verify API returns existing enrollment

5. **Course Page Navigation**
   - Enroll in course
   - Click course card on dashboard
   - Verify navigation to `/course/TEST-COURSE-001`
   - Verify placeholder content displays

---

## Summary of Gaps

### Critical Gaps (Must Implement)
1. ✅ Backend enrollment API exists - no changes needed
2. ❌ Session storage pattern - new implementation required
3. ❌ Dashboard enrollment logic - new feature required
4. ❌ Course card component - new component required
5. ❌ Course page placeholder - new route required

### Minor Gaps (Cleanup)
1. ❌ URL parameter pattern - remove from all enrollment buttons
2. ❌ Hardcoded courseId - update to `TEST-COURSE-001` per spec

### Existing Assets (Ready to Use)
1. ✅ Complete authentication flow (email + Google)
2. ✅ Landing page with enrollment buttons
3. ✅ Dashboard with session management
4. ✅ Backend enrollment API (fully functional)
5. ✅ Course fetching server actions
6. ✅ Mock course data structure
