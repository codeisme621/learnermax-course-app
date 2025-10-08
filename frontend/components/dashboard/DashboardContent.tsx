'use client';

import { Session } from 'next-auth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion } from 'motion/react';
import { LogOut, User, Mail, BookOpen } from 'lucide-react';
import { signOutAction } from '@/app/actions/auth';

interface DashboardContentProps {
  session: Session;
}

export function DashboardContent({ session }: DashboardContentProps) {
  const userInitials = session.user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || 'U';

  return (
    <div className="max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Welcome back, {session.user?.name?.split(' ')[0] || 'Student'}!
          </h1>
          <p className="text-muted-foreground">
            Ready to continue your learning journey?
          </p>
        </div>

        {/* User Info Card */}
        <Card className="p-6 mb-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={session.user?.image || undefined} />
                <AvatarFallback className="text-lg font-semibold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-semibold mb-1">
                  {session.user?.name || 'Student'}
                </h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  {session.user?.email}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <User className="w-4 h-4" />
                  User ID: {session.user?.id}
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={signOutAction}
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </Card>

        {/* Course Placeholder */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Your Courses</h3>
                <p className="text-sm text-muted-foreground">Coming soon</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Course enrollment and management will be available here.
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Progress</h3>
                <p className="text-sm text-muted-foreground">0% complete</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Track your learning progress and achievements.
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Certificates</h3>
                <p className="text-sm text-muted-foreground">None yet</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Earn certificates upon course completion.
            </p>
          </Card>
        </div>

        {/* Session Debug Info (dev only) */}
        {process.env.NODE_ENV === 'development' && (
          <Card className="p-6 mt-8 bg-muted/50">
            <h3 className="font-semibold mb-2 text-sm">
              Session Info (Development Only)
            </h3>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(session, null, 2)}
            </pre>
          </Card>
        )}
      </motion.div>
    </div>
  );
}
