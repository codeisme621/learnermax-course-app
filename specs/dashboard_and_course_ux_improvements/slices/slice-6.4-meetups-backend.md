# Slice 6.4: Meetups Backend API

## Objectives

Build backend infrastructure for the Meetups feature: data model, API endpoints, calendar invite generation, and time-based meeting status logic. Meetups are hardcoded for MVP (no admin UI), global (not course-specific), and use time-based status checks (not Zoom API integration).

## User Stories

1. **As a student**, I want to sign up for weekly meetups so I can connect with other learners and get my questions answered.
2. **As a student**, I want to receive a calendar invite when I sign up so the meetup is automatically added to my calendar.
3. **As a student**, I want to join the Zoom meeting directly from the dashboard when the meetup is live.

## Dependencies

**Requires:**
- ✅ DynamoDB table (already exists: `EDUCATION_TABLE`)
- ✅ Email service (already exists from `post_enrollment_email` spec)

## Current State (BEFORE)

**No meetups functionality exists.**

**Email Service** (from Slice 4 - Post Enrollment Email):
- Email Lambda function: `backend/email/handler.ts`
- React Email templates: `backend/email/emails/`
- SES configuration: Already set up

## Target State (AFTER)

### API Endpoints

**GET /api/meetups**
- Returns all meetups with signup status for authenticated user
- Response includes: meetup details, next occurrence, whether user is signed up, whether meeting is currently running

**POST /api/meetups/:meetupId/signup**
- Signs up authenticated user for a specific meetup
- Sends calendar invite via email
- Tracks signup in DynamoDB
- Idempotent (signing up twice doesn't create duplicate records)

### Data Model

**Hardcoded Meetups** (in code):
```typescript
export const MEETUPS: Meetup[] = [
  {
    meetupId: 'spec-driven-dev-weekly',
    title: 'Spec Driven Development',
    description: 'Weekly discussion on spec-driven workflows, best practices, and Q&A. Join us to learn how to write effective specs that guide implementation.',
    schedule: {
      dayOfWeek: 6, // Saturday (0 = Sunday, 6 = Saturday)
      hour: 10,     // 10 AM
      minute: 0,
      timezone: 'America/Chicago' // CST/CDT
    },
    duration: 60,   // minutes
    zoomLink: 'https://zoom.us/j/XXXXXXXXXX',
    hostName: 'Rico Martinez',
    hostEmail: 'rico@learnermax.com'
  },
  {
    meetupId: 'context-engineering-weekly',
    title: 'Context Engineering',
    description: 'Deep dive into context engineering patterns, prompt design, and AI workflows. Learn how to craft effective prompts and manage context for better AI interactions.',
    schedule: {
      dayOfWeek: 6,
      hour: 10,
      minute: 0,
      timezone: 'America/Chicago'
    },
    duration: 60,
    zoomLink: 'https://zoom.us/j/YYYYYYYYYY',
    hostName: 'Rico Martinez',
    hostEmail: 'rico@learnermax.com'
  }
];
```

**DynamoDB Signup Records:**
```typescript
interface MeetupSignupEntity {
  PK: string;              // "STUDENT#<userId>"
  SK: string;              // "MEETUP_SIGNUP#<meetupId>"
  meetupId: string;
  signedUpAt: string;      // ISO timestamp
  entityType: 'MEETUP_SIGNUP';
  // Optional: Track which occurrence they signed up for
  // (future enhancement for per-occurrence tracking)
}
```

### Type Contracts

**File:** `backend/src/features/meetups/meetups.types.ts`

```typescript
export interface Meetup {
  meetupId: string;
  title: string;
  description: string;
  schedule: MeetupSchedule;
  duration: number;        // minutes
  zoomLink: string;
  hostName: string;
  hostEmail: string;
}

export interface MeetupSchedule {
  dayOfWeek: number;       // 0 = Sunday, 6 = Saturday
  hour: number;            // 0-23 (24-hour format)
  minute: number;          // 0-59
  timezone: string;        // IANA timezone (e.g., "America/Chicago")
}

export interface MeetupSignupEntity {
  PK: string;
  SK: string;
  meetupId: string;
  signedUpAt: string;
  entityType: 'MEETUP_SIGNUP';
}

export interface MeetupResponse {
  meetupId: string;
  title: string;
  description: string;
  nextOccurrence: string;  // ISO timestamp of next meeting
  isRunning: boolean;      // Is the meeting happening right now?
  isSignedUp: boolean;     // Has the user signed up?
  zoomLink?: string;       // Only included if isRunning = true
  duration: number;
  hostName: string;
}
```

## Implementation Details

### Meetups Repository

**File:** `backend/src/features/meetups/meetups.repository.ts`

```typescript
export class MeetupsRepository {
  constructor(private dynamoClient: DynamoDBClient, private tableName: string) {}

  /**
   * Check if a student is signed up for a meetup
   */
  async getSignup(userId: string, meetupId: string): Promise<MeetupSignupEntity | null> {
    const result = await this.dynamoClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: {
          PK: `STUDENT#${userId}`,
          SK: `MEETUP_SIGNUP#${meetupId}`
        }
      })
    );

    return result.Item ? (result.Item as MeetupSignupEntity) : null;
  }

  /**
   * Sign up a student for a meetup (idempotent)
   */
  async createSignup(userId: string, meetupId: string): Promise<MeetupSignupEntity> {
    const now = new Date().toISOString();
    const signup: MeetupSignupEntity = {
      PK: `STUDENT#${userId}`,
      SK: `MEETUP_SIGNUP#${meetupId}`,
      meetupId,
      signedUpAt: now,
      entityType: 'MEETUP_SIGNUP'
    };

    await this.dynamoClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: signup,
        // Idempotent: Don't overwrite if already exists
        ConditionExpression: 'attribute_not_exists(PK)'
      })
    );

    return signup;
  }

  /**
   * Get all meetup signups for a student
   */
  async getStudentSignups(userId: string): Promise<MeetupSignupEntity[]> {
    const result = await this.dynamoClient.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `STUDENT#${userId}`,
          ':sk': 'MEETUP_SIGNUP#'
        }
      })
    );

    return (result.Items || []) as MeetupSignupEntity[];
  }
}
```

### Meetups Service

**File:** `backend/src/features/meetups/meetups.service.ts`

```typescript
import { DateTime } from 'luxon';
import { MEETUPS } from './meetups.constants';

export class MeetupsService {
  constructor(private repository: MeetupsRepository) {}

  /**
   * Get all meetups with user signup status
   */
  async getMeetups(userId: string): Promise<MeetupResponse[]> {
    // Get all user signups
    const signups = await this.repository.getStudentSignups(userId);
    const signupMap = new Map(signups.map(s => [s.meetupId, s]));

    // Map hardcoded meetups to responses
    return MEETUPS.map(meetup => {
      const nextOccurrence = this.getNextOccurrence(meetup.schedule);
      const isRunning = this.isCurrentlyRunning(meetup.schedule, meetup.duration);
      const isSignedUp = signupMap.has(meetup.meetupId);

      return {
        meetupId: meetup.meetupId,
        title: meetup.title,
        description: meetup.description,
        nextOccurrence: nextOccurrence.toISO(),
        isRunning,
        isSignedUp,
        zoomLink: isRunning ? meetup.zoomLink : undefined, // Only expose if running
        duration: meetup.duration,
        hostName: meetup.hostName
      };
    });
  }

  /**
   * Sign up for a meetup and send calendar invite
   */
  async signupForMeetup(userId: string, meetupId: string, userEmail: string, userName: string): Promise<void> {
    const meetup = MEETUPS.find(m => m.meetupId === meetupId);
    if (!meetup) {
      throw new Error('Meetup not found');
    }

    // Create signup record (idempotent)
    try {
      await this.repository.createSignup(userId, meetupId);
    } catch (error) {
      // If already exists, that's fine (idempotent)
      if (error.name !== 'ConditionalCheckFailedException') {
        throw error;
      }
    }

    // Send calendar invite
    await this.sendCalendarInvite(meetup, userEmail, userName);
  }

  /**
   * Calculate next occurrence of a recurring meetup
   */
  private getNextOccurrence(schedule: MeetupSchedule): DateTime {
    const now = DateTime.now().setZone(schedule.timezone);
    let next = now.set({ hour: schedule.hour, minute: schedule.minute, second: 0, millisecond: 0 });

    // Find next occurrence of the target day of week
    while (next.weekday !== schedule.dayOfWeek || next <= now) {
      next = next.plus({ days: 1 });
    }

    return next;
  }

  /**
   * Check if meetup is currently running (time-based)
   */
  private isCurrentlyRunning(schedule: MeetupSchedule, duration: number): boolean {
    const now = DateTime.now().setZone(schedule.timezone);
    const meetingStart = now.set({ hour: schedule.hour, minute: schedule.minute, second: 0 });
    const meetingEnd = meetingStart.plus({ minutes: duration });

    // Check if today is the meeting day and we're within the time window
    return now.weekday === schedule.dayOfWeek && now >= meetingStart && now <= meetingEnd;
  }

  /**
   * Send calendar invite via email
   */
  private async sendCalendarInvite(meetup: Meetup, userEmail: string, userName: string): Promise<void> {
    const nextOccurrence = this.getNextOccurrence(meetup.schedule);

    // TODO: Integrate with email service (Lambda invocation)
    // For now, log the intent
    console.log('Sending calendar invite:', {
      to: userEmail,
      meetup: meetup.title,
      nextOccurrence: nextOccurrence.toISO()
    });

    // Future: Invoke email Lambda with calendar event
    // await emailService.sendMeetupInvite({
    //   to: userEmail,
    //   userName,
    //   meetup,
    //   nextOccurrence
    // });
  }
}
```

### API Routes

**File:** `backend/src/features/meetups/meetups.routes.ts`

```typescript
import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.middleware';
import { MeetupsService } from './meetups.service';

export function createMeetupsRouter(service: MeetupsService): Router {
  const router = Router();

  /**
   * GET /api/meetups
   * Get all meetups with signup status for authenticated user
   */
  router.get('/', authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const meetups = await service.getMeetups(userId);

      res.json(meetups);
    } catch (error) {
      console.error('Error fetching meetups:', error);
      res.status(500).json({ error: 'Failed to fetch meetups' });
    }
  });

  /**
   * POST /api/meetups/:meetupId/signup
   * Sign up for a meetup
   */
  router.post('/:meetupId/signup', authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const userEmail = req.user!.email;
      const userName = req.user!.name || 'Student';
      const { meetupId } = req.params;

      await service.signupForMeetup(userId, meetupId, userEmail, userName);

      res.json({ success: true, message: 'Successfully signed up for meetup' });
    } catch (error) {
      console.error('Error signing up for meetup:', error);

      if (error.message === 'Meetup not found') {
        res.status(404).json({ error: 'Meetup not found' });
      } else {
        res.status(500).json({ error: 'Failed to sign up for meetup' });
      }
    }
  });

  return router;
}
```

### Integration with Main App

**File:** `backend/src/app.ts`

```typescript
import { createMeetupsRouter } from './features/meetups/meetups.routes';
import { MeetupsService } from './features/meetups/meetups.service';
import { MeetupsRepository } from './features/meetups/meetups.repository';

// Initialize meetups dependencies
const meetupsRepository = new MeetupsRepository(dynamoClient, tableName);
const meetupsService = new MeetupsService(meetupsRepository);
const meetupsRouter = createMeetupsRouter(meetupsService);

// Mount router
app.use('/api/meetups', meetupsRouter);
```

## Calendar Invite Generation (Future Enhancement)

For MVP, calendar invite email integration is **deferred**. The signup is tracked in DynamoDB, but the calendar email is logged (not sent).

**Future implementation** will use React Email with `.ics` attachment:

```typescript
// backend/email/emails/meetup-invite-email.tsx
import { ical } from 'ical-generator';

export function generateMeetupCalendarEvent(meetup: Meetup, occurrence: DateTime) {
  const calendar = ical({
    name: meetup.title,
    events: [{
      start: occurrence.toJSDate(),
      end: occurrence.plus({ minutes: meetup.duration }).toJSDate(),
      summary: meetup.title,
      description: meetup.description,
      location: meetup.zoomLink,
      organizer: { name: meetup.hostName, email: meetup.hostEmail }
    }]
  });

  return calendar.toString();
}
```

**For Slice 6.4 MVP:**
- Just track signup in DynamoDB
- Log calendar invite intent
- Calendar email integration is a **forward-looking requirement**

## Time-Based Meeting Status

**DO ✅ - Simple time window check:**
```typescript
private isCurrentlyRunning(schedule: MeetupSchedule, duration: number): boolean {
  const now = DateTime.now().setZone(schedule.timezone);
  const meetingStart = now.set({ hour: schedule.hour, minute: schedule.minute, second: 0 });
  const meetingEnd = meetingStart.plus({ minutes: duration });

  // Meeting is running if:
  // 1. Today is the meeting day (e.g., Saturday)
  // 2. Current time is between start and end (10:00 - 11:00 AM CST)
  return now.weekday === schedule.dayOfWeek && now >= meetingStart && now <= meetingEnd;
}
```

**DON'T ❌ - Don't integrate with Zoom API for MVP:**
```typescript
// Future enhancement - not for MVP
async isZoomMeetingLive(zoomMeetingId: string): Promise<boolean> {
  const response = await fetch(`https://api.zoom.us/v2/meetings/${zoomMeetingId}`, {
    headers: { Authorization: `Bearer ${ZOOM_TOKEN}` }
  });
  const data = await response.json();
  return data.status === 'started';
}
```

## Directory Structure

**BEFORE (Meetups don't exist):**
```
backend/src/
└── features/
    ├── auth/
    ├── courses/
    ├── enrollments/
    ├── lessons/
    ├── progress/
    └── students/
```

**AFTER:**
```
backend/src/
└── features/
    ├── auth/
    ├── courses/
    ├── enrollments/
    ├── lessons/
    ├── progress/
    ├── students/
    └── meetups/                        # NEW
        ├── meetups.types.ts            # Type definitions
        ├── meetups.constants.ts        # Hardcoded MEETUPS array
        ├── meetups.repository.ts       # DynamoDB operations
        ├── meetups.service.ts          # Business logic
        ├── meetups.routes.ts           # Express routes
        └── __tests__/
            ├── meetups.service.test.ts
            ├── meetups.repository.test.ts
            └── meetups.routes.test.ts
```

## Error Handling

### Signup Idempotency
```typescript
try {
  await repository.createSignup(userId, meetupId);
} catch (error) {
  // If signup already exists, treat as success (idempotent)
  if (error.name === 'ConditionalCheckFailedException') {
    console.log('Student already signed up - idempotent operation');
    return; // Continue to send calendar invite (they may have lost it)
  }
  throw error;
}
```

### Invalid Meetup ID
```typescript
const meetup = MEETUPS.find(m => m.meetupId === meetupId);
if (!meetup) {
  return res.status(404).json({ error: 'Meetup not found' });
}
```

## Forward-Looking Requirements

### For Slice 6.5 (Meetups Frontend)
- API is ready: `GET /api/meetups` and `POST /api/meetups/:meetupId/signup`
- Frontend will call these endpoints to display meetups and handle signups

### For Future Enhancements
- **Calendar email integration**: Generate and send `.ics` file via React Email
- **Zoom API integration**: Real-time meeting status instead of time-based
- **Admin UI**: Create/edit/delete meetups (currently hardcoded)
- **Course-specific meetups**: Filter meetups by course enrollment
- **Cancellation**: Allow users to unregister from meetups
- **Attendance tracking**: Mark who actually attended vs. just signed up
- **Recording links**: Share meetup recordings after the session

## Testing Checklist

- [ ] `GET /api/meetups` returns hardcoded meetups with correct `isSignedUp` flags
- [ ] `GET /api/meetups` returns `isRunning: true` only on Saturday 10-11 AM CST
- [ ] `GET /api/meetups` includes `zoomLink` only when `isRunning: true`
- [ ] `POST /api/meetups/:meetupId/signup` creates signup record in DynamoDB
- [ ] Signing up twice for same meetup is idempotent (no error, no duplicate)
- [ ] `nextOccurrence` calculation returns next Saturday 10 AM CST
- [ ] Timezone handling works correctly (CST/CDT daylight saving transitions)
- [ ] 401 error when not authenticated
- [ ] 404 error when invalid `meetupId` provided
- [ ] Repository methods handle DynamoDB errors gracefully
- [ ] Unit tests for `getNextOccurrence` logic
- [ ] Unit tests for `isCurrentlyRunning` logic
- [ ] Integration test: Sign up → Verify record → Fetch meetups → Check `isSignedUp: true`
