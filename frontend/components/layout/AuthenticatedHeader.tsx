'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { FeedbackModal } from '@/components/modals/FeedbackModal';
import { motion } from 'motion/react';
import Link from 'next/link';
import { MessageCircle, LogOut } from 'lucide-react';
import { signOutAction } from '@/app/actions/auth';
import { useProgress } from '@/hooks/useProgress';

export interface AuthenticatedHeaderProps {
  variant: 'dashboard' | 'course';
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  courseId?: string; // Required for course variant to fetch progress via SWR
}

function getUserInitials(name?: string | null): string {
  if (!name) return 'U';

  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function AuthenticatedHeader({
  variant,
  user,
  courseId,
}: AuthenticatedHeaderProps) {
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);

  // Use SWR hook for progress when in course variant
  const { percentage, completedCount, totalLessons, isLoading: isLoadingProgress } = useProgress(
    variant === 'course' && courseId ? courseId : ''
  );

  const handleSignOut = async () => {
    console.log('User signed out from header', {
      userId: user.id,
      timestamp: new Date().toISOString(),
    });
    await signOutAction();
  };

  const handleFeedbackClick = () => {
    console.log('User opened feedback modal', {
      userId: user.id,
      timestamp: new Date().toISOString(),
    });
    setFeedbackModalOpen(true);
  };

  // Log component rendering in development
  if (process.env.NODE_ENV === 'development') {
    console.log('AuthenticatedHeader rendered', {
      variant,
      hasProgress: variant === 'course' && !isLoadingProgress,
    });
  }

  return (
    <>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border"
      >
        <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between gap-2">
          {/* Logo - Responsive */}
          <Link href="/dashboard" className="flex items-center gap-2 flex-shrink-0">
            <div className="text-xl md:text-2xl font-bold text-primary">
              <span className="hidden md:inline">LearnWithRico</span>
              <span className="md:hidden">LWR</span>
            </div>
          </Link>

          {/* Course Progress - Only in course variant */}
          {variant === 'course' && courseId && (
            <div className="flex items-center gap-2 flex-1 max-w-xs md:max-w-md mx-2">
              {isLoadingProgress ? (
                <>
                  <Skeleton className="hidden md:block h-4 w-32" />
                  <Skeleton className="md:hidden h-3 w-8" />
                  <Skeleton className="flex-1 h-2" />
                </>
              ) : (
                <>
                  {/* Hide full text on mobile, show on tablet+ */}
                  <div className="hidden md:block text-sm font-medium whitespace-nowrap">
                    {completedCount} of {totalLessons} lessons • {percentage}%
                  </div>
                  {/* Show only percentage on mobile */}
                  <div className="md:hidden text-xs font-medium">
                    {percentage}%
                  </div>
                  {/* Progress bar - always visible */}
                  <div className="flex-1 bg-secondary rounded-full h-2">
                    <div
                      className="bg-primary rounded-full h-2 transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Actions - Icons only on mobile */}
          <nav className="flex items-center gap-2 flex-shrink-0">
            {/* Feedback Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleFeedbackClick}
              aria-label="Feedback"
              className="h-9 w-9"
            >
              <MessageCircle className="h-5 w-5" />
            </Button>

            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full" aria-label="User menu">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback>{getUserInitials(user.name)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name || 'User'}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>
      </motion.header>

      {/* Feedback Modal */}
      <FeedbackModal
        open={feedbackModalOpen}
        onOpenChange={setFeedbackModalOpen}
        userId={user.id}
      />
    </>
  );
}
