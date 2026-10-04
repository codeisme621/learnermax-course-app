import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { auth } from '@/lib/auth';
import { getAuthToken } from '@/app/actions/auth';
import { getAllCourses } from '@/lib/data/courses';
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

  // Fetch cached data
  const coursesResult = await getAllCourses(token);

  // Extract courses (default to empty array on error)
  const courses = 'courses' in coursesResult ? coursesResult.courses : [];

  return (
    <>
      <AuthenticatedHeader variant="dashboard" user={session.user} />
      <main className="min-h-screen pt-20 pb-12 px-4 md:px-6 lg:px-8 bg-muted/30">
        <div className="container mx-auto">
          <DashboardContent
            session={session}
            courses={courses}
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
