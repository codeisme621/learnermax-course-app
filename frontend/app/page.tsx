import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { HeroSection } from '@/components/landing/HeroSection';
import { TrustIndicators } from '@/components/landing/TrustIndicators';
import { BenefitsSection } from '@/components/landing/BenefitsSection';
import { CourseMetadataSection } from '@/components/landing/CourseMetadataSection';
import { TestimonialsSection } from '@/components/landing/TestimonialsSection';
import { CtaSection } from '@/components/landing/CtaSection';
import { ScrollToTop } from '@/components/ui/ScrollToTop';
import { mockCourse } from '@/lib/mock-data/course';

export const metadata: Metadata = {
  title: 'Master Modern Web Development - LearnerMax',
  description: 'Build production-ready applications with the latest technologies. Join thousands of students learning at LearnerMax.',
};

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-16">
        <HeroSection course={mockCourse} />
        <TrustIndicators />
        <BenefitsSection />
        <CourseMetadataSection course={mockCourse} />
        <TestimonialsSection course={mockCourse} />
        <CtaSection />
      </main>
      <Footer />
      <ScrollToTop />
    </>
  );
}
