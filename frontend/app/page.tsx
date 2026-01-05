import type { Metadata } from 'next';
import { cacheLife } from 'next/cache';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { HeroSection } from '@/components/landing/HeroSection';
import { TrustIndicators } from '@/components/landing/TrustIndicators';
import { BenefitsSection } from '@/components/landing/BenefitsSection';
import { CourseMetadataSection } from '@/components/landing/CourseMetadataSection';
import { CtaSection } from '@/components/landing/CtaSection';
import { ScrollToTop } from '@/components/ui/ScrollToTop';
import { getCourseForLanding } from '@/lib/api/courses';

// Fallback metadata if course data fetch fails
const fallbackMetadata: Metadata = {
  title: 'Spec-Driven Development with Context Engineering - LearnWithRico',
  description:
    'Turn AI into your superpower: master Spec-Driven Development and produce world-class code that sets you apart.',
};

// Dynamic metadata generation based on course data
export async function generateMetadata(): Promise<Metadata> {
  try {
    const course = await getCourseForLanding('spec-driven-dev-mini');

    return {
      title: `${course.title} - LearnWithRico`,
      description: course.description,
      openGraph: {
        title: course.title,
        description: course.subtitle,
        type: 'website',
        locale: 'en_US',
        siteName: 'LearnWithRico',
      },
      twitter: {
        card: 'summary_large_image',
        title: course.title,
        description: course.subtitle,
      },
    };
  } catch (error) {
    console.error('[generateMetadata] Failed to fetch course data:', error);
    // Return fallback metadata
    return fallbackMetadata;
  }
}

// Main page component - cached for maximum duration (equivalent to SSG)
export default async function HomePage() {
  'use cache';
  cacheLife('max'); // Cache indefinitely until redeployment

  console.log('[HomePage] Fetching course data (cached)...');

  try {
    // This fetch happens once during prerendering, then cached
    const course = await getCourseForLanding('spec-driven-dev-mini');

    console.log('[HomePage] Successfully fetched course data:', {
      courseId: course.id,
      title: course.title,
      lessonCount: course.curriculum[0]?.topics.length || 0,
    });

    return (
      <>
        <Header />
        <main className="min-h-screen pt-16">
          <HeroSection course={course} />
          <TrustIndicators />
          <BenefitsSection />
          <CourseMetadataSection course={course} />
          <CtaSection />
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
              Could not fetch course data from backend API.
            </p>
            <pre className="text-left bg-gray-100 p-4 rounded text-sm overflow-auto">
              {error instanceof Error ? error.message : String(error)}
            </pre>
            <p className="text-sm text-gray-600 mt-4">
              Backend API: {process.env.NEXT_PUBLIC_API_URL}
            </p>
          </div>
        </div>
      );
    }

    // In production, build should fail if data cannot be fetched
    throw error;
  }
}
