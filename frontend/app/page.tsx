import type { Metadata } from 'next';
import { cacheLife } from 'next/cache';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { HeroSection } from '@/components/landing/HeroSection';
import { TrustIndicators } from '@/components/landing/TrustIndicators';
import { StorySection } from '@/components/landing/StorySection';
import { BenefitsSection } from '@/components/landing/BenefitsSection';
import { ProofLoopSection } from '@/components/landing/ProofLoopSection';
import { TwoCampsSection } from '@/components/landing/TwoCampsSection';
import { CourseMetadataSection } from '@/components/landing/CourseMetadataSection';
import { CtaSection } from '@/components/landing/CtaSection';
import { FaqSection } from '@/components/landing/FaqSection';
import { ScrollToTop } from '@/components/ui/ScrollToTop';
import { getCourseForLanding } from '@/lib/api/courses';
import { AGENTIC_CODING_COURSE_ID } from '@/features/courses';

const pageDescription = 'Become the engineer your team follows into agentic development. Learn the durable patterns (context, verification, and harnesses) that make coding agents produce work you can trust, from intent to verified PR.';

const baseMetadata: Metadata = {
  title: 'Agentic Engineering — Lead Your Team Into Agentic Development | LearnWithRico',
  description: pageDescription,
};

export const metadata: Metadata = {
  ...baseMetadata,
  openGraph: {
    title: 'Agentic Engineering — Lead Your Team Into Agentic Development',
    description: pageDescription,
    type: 'website',
    locale: 'en_US',
    siteName: 'LearnWithRico',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Agentic Engineering — Lead Your Team Into Agentic Development',
    description: pageDescription,
  },
};

// Main page component - cached for maximum duration (equivalent to SSG)
export default async function HomePage() {
  'use cache';
  cacheLife('max'); // Cache indefinitely until redeployment

  console.log('[HomePage] Fetching course data (cached)...');

  try {
    // This fetch happens once during prerendering, then cached
    const course = await getCourseForLanding(AGENTIC_CODING_COURSE_ID);

    console.log('[HomePage] Successfully fetched course data:', {
      courseId: course.id,
      title: course.title,
      topicCount: course.curriculum[0]?.topics.length || 0,
    });

    return (
      <>
        <Header />
        <main className="min-h-screen pt-16">
          <HeroSection course={course} />
          <TrustIndicators />
          <StorySection />
          <ProofLoopSection />
          <BenefitsSection />
          <TwoCampsSection />
          <CourseMetadataSection course={course} />
          <CtaSection />
          <FaqSection />
        </main>
        <Footer />
        <ScrollToTop />
      </>
    );
  } catch (error) {
    console.error('[HomePage] Failed to fetch course data:', error);

    // Show error page during development
    if (process.env.NODE_ENV === 'development') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-red-600 mb-4">
              Failed to Load Course Data
            </h1>
            <p className="text-gray-700 mb-4">
              Could not load course data from the database. Did you run pnpm db:migrate and pnpm db:seed?
            </p>
            <pre className="text-left bg-gray-100 p-4 rounded text-sm overflow-auto">
              {error instanceof Error ? error.message : String(error)}
            </pre>
          </div>
        </div>
      );
    }

    // In production, build should fail if data cannot be fetched
    throw error;
  }
}
