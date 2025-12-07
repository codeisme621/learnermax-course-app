'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, User, Video, CalendarDays } from 'lucide-react';
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

  const formatTime = (isoDate: string) => {
    const date = new Date(isoDate);
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    }).format(date);
  };

  const getDateParts = (isoDate: string) => {
    const date = new Date(isoDate);
    return {
      day: date.getDate(),
      month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
      weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
    };
  };

  const dateParts = getDateParts(meetup.nextOccurrence);

  return (
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/30 group cursor-pointer">
      <CardContent className="p-4 md:p-6">
        <div className="flex gap-4">
          {/* Visual Date Display */}
          <div className="flex-shrink-0">
            <div className={`w-16 h-16 md:w-20 md:h-20 rounded-xl flex flex-col items-center justify-center shadow-sm border transition-colors ${
              meetup.isRunning
                ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/50'
                : 'bg-primary/5 border-primary/20 group-hover:bg-primary/10'
            }`}>
              <span className={`text-xs font-bold ${meetup.isRunning ? 'text-red-600 dark:text-red-400' : 'text-primary'}`}>
                {meetup.isRunning ? 'LIVE' : dateParts.month}
              </span>
              <span className={`text-2xl md:text-3xl font-bold leading-none ${meetup.isRunning ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
                {meetup.isRunning ? '🔴' : dateParts.day}
              </span>
              {!meetup.isRunning && (
                <span className="text-xs text-muted-foreground">{dateParts.weekday}</span>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="text-base md:text-lg font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                {meetup.title}
              </h3>
              {isSignedUp && !meetup.isRunning && (
                <Badge variant="secondary" className="text-xs flex-shrink-0 bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/50">
                  ✓ Registered
                </Badge>
              )}
            </div>

            {/* Description */}
            <p className="text-xs md:text-sm text-muted-foreground mb-3 line-clamp-2">
              {meetup.description}
            </p>

            {/* Metadata Row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs md:text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-primary/70" />
                <span>
                  {meetup.isRunning
                    ? `Ends ${formatTime(new Date(new Date(meetup.nextOccurrence).getTime() + meetup.duration * 60000).toISOString())}`
                    : formatTime(meetup.nextOccurrence)
                  }
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-primary/70" />
                <span>{meetup.duration} min</span>
              </div>
              <div className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-primary/70" />
                <span>{meetup.hostName}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-4">
          {meetup.isRunning && isSignedUp && meetup.zoomLink ? (
            <Button
              onClick={handleJoinZoom}
              className="w-full h-11 md:h-10 bg-red-600 hover:bg-red-700 text-white font-semibold shadow-lg shadow-red-500/25 animate-pulse"
              size="lg"
            >
              <Video className="mr-2 h-5 w-5" />
              Join Live Now
            </Button>
          ) : isSignedUp ? (
            <div className="text-xs md:text-sm text-muted-foreground text-center p-3 bg-muted/50 rounded-lg border border-border/50">
              📧 You&apos;re registered! Calendar invite sent to your email.
            </div>
          ) : (
            <Button
              onClick={handleSignup}
              variant="outline"
              className="w-full h-11 md:h-10 cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
              disabled={isLoading}
            >
              {isLoading ? 'Signing up...' : 'Sign Up for Meetup'}
            </Button>
          )}
        </div>

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
