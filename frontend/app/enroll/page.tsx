import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { EnrollmentForm } from '@/components/enrollment/EnrollmentForm';

export const metadata: Metadata = {
  title: 'Enroll in Course - LearnerMax',
  description: 'Start your learning journey today with lifetime access to all course materials.',
};

export default function EnrollPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-20 py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Enroll in the Course
            </h1>
            <p className="text-lg text-muted-foreground">
              Start your learning journey today with lifetime access
            </p>
          </div>

          <EnrollmentForm />
        </div>
      </main>
      <Footer />
    </>
  );
}
