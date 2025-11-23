import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { AuthenticatedHeader } from '@/components/layout/AuthenticatedHeader';
import { Footer } from '@/components/layout/Footer';
import { DashboardContent } from '@/components/dashboard/DashboardContent';

export const metadata: Metadata = {
  title: 'Dashboard - LearnWithRico',
  description: 'Your learning dashboard',
};

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/signin?callbackUrl=/dashboard');
  }

  return (
    <>
      <AuthenticatedHeader variant="dashboard" user={session.user} />
      <main className="min-h-screen pt-20 pb-12 px-4 md:px-6 lg:px-8 bg-muted/30">
        <div className="container mx-auto">
          <DashboardContent session={session} />
        </div>
      </main>
      <Footer />
    </>
  );
}
