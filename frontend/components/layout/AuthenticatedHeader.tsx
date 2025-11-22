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
import { Progress } from '@/components/ui/progress';
import { FeedbackModal } from '@/components/modals/FeedbackModal';
import { motion } from 'motion/react';
import Link from 'next/link';
import { MessageCircle, LogOut } from 'lucide-react';
import { signOutAction } from '@/app/actions/auth';

export interface AuthenticatedHeaderProps {
  variant: 'dashboard' | 'course';
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  courseProgress?: {
    percentage: number;
    completedLessons: number;
    totalLessons: number;
  };
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
  courseProgress,
}: AuthenticatedHeaderProps) {
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);

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
      hasProgress: !!courseProgress,
    });
  }

  return (
    <>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border"
      >
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 flex-shrink-0">
            <div className="text-2xl font-bold text-primary">LearnerMax</div>
          </Link>

          {/* Course Progress (course variant only, hidden on mobile) */}
          {variant === 'course' && courseProgress && (
            <div className="hidden md:flex items-center gap-4 flex-1 max-w-md">
              <div className="text-sm font-medium whitespace-nowrap">
                {courseProgress.completedLessons} of {courseProgress.totalLessons} lessons • {courseProgress.percentage}%
              </div>
              <div className="flex-1">
                <Progress value={courseProgress.percentage} className="h-2" />
              </div>
            </div>
          )}

          {/* Right side: Feedback + Profile */}
          <nav className="flex items-center gap-2 flex-shrink-0">
            {/* Feedback Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleFeedbackClick}
              aria-label="Feedback"
            >
              <MessageCircle className="h-5 w-5" />
            </Button>

            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
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
