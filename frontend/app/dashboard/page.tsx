import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { auth } from '@/lib/auth';
import { getAuthToken } from '@/app/actions/auth';
import { getAllCourses } from '@/lib/data/courses';
import { getMeetups } from '@/lib/data/meetups';
import { AuthenticatedHeader } from '@/components/layout/AuthenticatedHeader';
import { Footer } from '@/components/layout/Footer';
import { DashboardContent } from '@/components/dashboard/DashboardContent';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';

export const metadata: Metadata = {
  title: 'Dashboard - LearnWithRico',
  description: 'Your learning dashboard',
};

// Dynamic content component - fetches auth and data
async function DashboardLoader() {
  const session = await auth();

  if (!session?.user) {
    redirect('/signin?callbackUrl=/dashboard');
  }

  // Get auth token for cached data fetching
  const token = await getAuthToken();

  if (!token) {
    redirect('/signin?callbackUrl=/dashboard');
  }

  // Fetch cached data in parallel
  const [coursesResult, meetupsResult] = await Promise.all([
    getAllCourses(token),
    getMeetups(token),
  ]);

  // Extract courses (default to empty array on error)
  const courses = 'courses' in coursesResult ? coursesResult.courses : [];

  // Extract meetups (default to empty array on error)
  const meetups = Array.isArray(meetupsResult) ? meetupsResult : [];

  return (
    <>
      <AuthenticatedHeader variant="dashboard" user={session.user} />
      <main className="min-h-screen pt-20 pb-12 px-4 md:px-6 lg:px-8 bg-muted/30">
        <div className="container mx-auto">
          <DashboardContent
            session={session}
            courses={courses}
            meetups={meetups}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardLoader />
    </Suspense>
  );
}
