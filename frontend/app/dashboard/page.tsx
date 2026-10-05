import type { Metadata } from 'next';
import { Suspense } from 'react';
import { listCourses } from '@/features/courses';
import { pageRequireAnyEnrollment } from '@/lib/page-guards';
import { AuthenticatedHeader } from '@/components/layout/AuthenticatedHeader';
import { Footer } from '@/components/layout/Footer';
import { DashboardContent } from '@/components/dashboard/DashboardContent';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';

export const metadata: Metadata = {
  title: 'Dashboard - LearnWithRico',
  description: 'Your learning dashboard',
};

async function DashboardLoader() {
  // Signed in AND paid — checked against Postgres on every request.
  const session = await pageRequireAnyEnrollment('/dashboard');
  const courses = await listCourses();

  return (
    <>
      <AuthenticatedHeader variant="dashboard" user={session.user} />
      <main className="min-h-screen pt-20 pb-12 px-4 md:px-6 lg:px-8 bg-muted/30">
        <div className="container mx-auto">
          <DashboardContent userName={session.user.name} courses={courses} />
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
