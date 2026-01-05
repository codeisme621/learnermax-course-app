# Slice 5: Backend - Add signedUpMeetups to Student

## Objective

Move user-specific meetup signup data to the Student endpoint, allowing meetups to be fully cached.

## Background

Currently, `getMeetups()` returns `isSignedUp` per meetup, which is user-specific. This prevents caching the meetups list.

**Solution:** Add `signedUpMeetups: string[]` to the Student response. Client derives `isSignedUp` by checking if `meetupId` is in this array.

## Files to Modify

### Backend

| File | Change |
|------|--------|
| `backend/src/features/students/student.types.ts` | Add `signedUpMeetups: string[]` |
| `backend/src/features/students/student.service.ts` | Query meetup signups when fetching student |
| `backend/src/features/meetups/meetups.service.ts` | Remove `isSignedUp` from response |
| `backend/src/features/meetups/meetups.types.ts` | Remove `isSignedUp` from `MeetupResponse` |

## Implementation

### student.types.ts

```typescript
// backend/src/features/students/student.types.ts

// BEFORE
export interface StudentResponse {
  studentId: string;
  userId: string;
  email: string;
  name?: string;
  interestedInPremium?: boolean;
  premiumInterestDate?: string;
  createdAt: string;
  updatedAt: string;
}

// AFTER
export interface StudentResponse {
  studentId: string;
  userId: string;
  email: string;
  name?: string;
  interestedInPremium?: boolean;
  premiumInterestDate?: string;
  signedUpMeetups: string[];  // NEW: Array of meetupIds
  createdAt: string;
  updatedAt: string;
}
```

### student.service.ts

```typescript
// backend/src/features/students/student.service.ts

import { meetupsRepository } from '../meetups/meetups.repository';

export class StudentService {
  async getStudent(userId: string): Promise<StudentResponse | null> {
    const student = await studentRepository.get(userId);
    if (!student) return null;

    // NEW: Query meetup signups for this user
    const signedUpMeetups = await meetupsRepository.getSignedUpMeetupIds(userId);

    return {
      ...student,
      signedUpMeetups,  // NEW
    };
  }
}
```

### meetups.repository.ts (new method)

```typescript
// backend/src/features/meetups/meetups.repository.ts

export class MeetupsRepository {
  // ... existing methods ...

  // NEW: Get all meetup IDs that a user has signed up for
  async getSignedUpMeetupIds(userId: string): Promise<string[]> {
    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': { S: `USER#${userId}` },
        ':sk': { S: 'MEETUP_SIGNUP#' },
      },
      ProjectionExpression: 'meetupId',
    });

    const result = await this.client.send(command);
    return (result.Items || []).map((item) => item.meetupId.S!);
  }
}
```

### meetups.service.ts

```typescript
// backend/src/features/meetups/meetups.service.ts

// BEFORE: isSignedUp included in response
async getMeetups(userId: string): Promise<MeetupResponse[]> {
  const meetups = await this.repository.getAll();
  const signups = await this.repository.getSignupsForUser(userId);

  return meetups.map((meetup) => ({
    ...meetup,
    isSignedUp: signups.includes(meetup.meetupId),  // REMOVE THIS
  }));
}

// AFTER: isSignedUp NOT included (client derives from student.signedUpMeetups)
async getMeetups(): Promise<MeetupResponse[]> {
  const meetups = await this.repository.getAll();

  return meetups.map((meetup) => ({
    meetupId: meetup.meetupId,
    title: meetup.title,
    description: meetup.description,
    nextOccurrence: meetup.nextOccurrence,
    isRunning: this.calculateIsRunning(meetup.nextOccurrence),
    zoomLink: this.getZoomLink(meetup),
    duration: meetup.duration,
    hostName: meetup.hostName,
    // isSignedUp: REMOVED - client derives from student.signedUpMeetups
  }));
}
```

### meetups.types.ts

```typescript
// backend/src/features/meetups/meetups.types.ts

// BEFORE
export interface MeetupResponse {
  meetupId: string;
  title: string;
  description: string;
  nextOccurrence: string;
  isRunning: boolean;
  isSignedUp: boolean;  // REMOVE
  zoomLink?: string;
  duration: number;
  hostName: string;
}

// AFTER
export interface MeetupResponse {
  meetupId: string;
  title: string;
  description: string;
  nextOccurrence: string;
  isRunning: boolean;
  zoomLink?: string;
  duration: number;
  hostName: string;
  // isSignedUp: REMOVED
}
```

## Frontend Integration

After this slice, frontend components derive `isSignedUp`:

```typescript
// frontend/components/dashboard/MeetupCard.tsx
import { useStudent } from '@/hooks/useStudent';

function MeetupCard({ meetup }: { meetup: MeetupResponse }) {
  const { signedUpMeetups } = useStudent();
  const isSignedUp = signedUpMeetups.includes(meetup.meetupId);

  return (
    <Card>
      {/* ... */}
      {isSignedUp ? <Badge>Signed Up</Badge> : <Button>Sign Up</Button>}
    </Card>
  );
}
```

## Data Flow After Change

```
Dashboard Page (Server Component)
├── getMeetups() [CACHED - no user-specific data]
│   └── Returns: meetups without isSignedUp
├── <MeetupCard meetup={meetup}>
│   └── useStudent() [SWR - has signedUpMeetups]
│       └── Derives: isSignedUp = signedUpMeetups.includes(meetupId)
```

## Acceptance Criteria

- [ ] `signedUpMeetups: string[]` added to `StudentResponse`
- [ ] `getSignedUpMeetupIds()` method added to `MeetupsRepository`
- [ ] `StudentService.getStudent()` includes `signedUpMeetups`
- [ ] `isSignedUp` removed from `MeetupResponse`
- [ ] `getMeetups()` no longer requires `userId` parameter
- [ ] Backend tests updated/passing
- [ ] Frontend `MeetupCard` updated to derive `isSignedUp` from `useStudent()`

## Notes

- This is a **breaking change** for the meetups API
- Frontend must be updated simultaneously (or feature flagged)
- After this, `getMeetups()` can be fully cached with `cacheLife('minutes')`
