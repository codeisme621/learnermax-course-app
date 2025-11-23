'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, Video } from 'lucide-react';
import { signupForMeetup, type MeetupResponse } from '@/app/actions/meetups';

export interface MeetupCardProps {
  meetup: MeetupResponse;
}

export function MeetupCard({ meetup }: MeetupCardProps) {
  const [isSignedUp, setIsSignedUp] = useState(meetup.isSignedUp);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async () => {
    console.log('Signup initiated for meetup', { meetupId: meetup.meetupId });

    setError(null);
    setIsLoading(true);

    try {
      const result = await signupForMeetup(meetup.meetupId);

      // Check if result is an error object
      if (result && 'error' in result) {
        setError(result.error);
        console.error('Signup error:', result.error);
      } else {
        // Success - update UI optimistically
        setIsSignedUp(true);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign up. Please try again.';
      setError(errorMessage);
      console.error('Signup error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinZoom = () => {
    if (meetup.zoomLink) {
      console.log('Student joining Zoom meeting', {
        meetupId: meetup.meetupId,
        zoomLink: meetup.zoomLink,
      });
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
      timeZoneName: 'short',
    }).format(date);
  };

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-2 flex-1">
            {meetup.isRunning && (
              <Badge variant="destructive" className="animate-pulse">
                🔴 LIVE NOW
              </Badge>
            )}
            <h3 className="text-xl font-semibold">{meetup.title}</h3>
          </div>
          {isSignedUp && !meetup.isRunning && (
            <Badge variant="secondary" className="ml-2">✅ Registered</Badge>
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
            <span>
              {meetup.isRunning ? (
                <>Happening now! Ends at {formatDate(new Date(new Date(meetup.nextOccurrence).getTime() + meetup.duration * 60000).toISOString())}</>
              ) : (
                <>Next: {formatDate(meetup.nextOccurrence)}</>
              )}
            </span>
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
            You&apos;re registered! Calendar invite sent to your email.
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
