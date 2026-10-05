import { Suspense } from 'react';
import { Card } from '@/components/ui/card';
import { AuthenticatedHeader } from '@/components/layout/AuthenticatedHeader';
import { getCourse } from '@/features/courses';
import { pageRequireCourseAccess } from '@/lib/page-guards';
import CoursePageLoading from './loading';
import { CheckCircle, Clock, Award, PlayCircle } from 'lucide-react';
import type { Metadata } from 'next';

interface CoursePageProps {
  params: Promise<{ courseId: string }>;
}

// Static metadata - protected page doesn't need SEO
export const metadata: Metadata = {
  title: 'Course - LearnWithRico',
  description: 'Access your course content',
};

// Video playback is paused until the Mux integration ships; paid students see the course
// overview and a "lessons coming soon" state. Access is still enforced here.
async function CoursePageLoader({ courseId }: { courseId: string }) {
  const session = await pageRequireCourseAccess(courseId);
  const course = await getCourse(courseId);

  return (
    <div className="min-h-screen bg-background">
      <AuthenticatedHeader variant="course" user={session.user} courseId={courseId} />

      <main className="flex pt-16">
        <div className="flex-1 p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
          <Card className="p-6 md:p-10 text-center">
            <PlayCircle className="w-12 h-12 mx-auto text-primary mb-4" />
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Lessons are on the way</h1>
            <p className="text-muted-foreground">
              You&apos;re enrolled. New lessons will appear here as soon as they&apos;re published.
            </p>
          </Card>

          <div className="mt-6 md:mt-8 space-y-4 md:space-y-6">
            <Card className="p-4 md:p-6">
              <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">{course.name}</h2>
              <p className="text-sm md:text-base text-muted-foreground mb-4 md:mb-6">{course.description}</p>

              <div className="flex flex-wrap gap-3 md:gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Award className="w-4 h-4 text-primary" />
                  <span>All Levels</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>Self-paced</span>
                </div>
                {course.instructor && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Instructor:</span>
                    <span className="font-medium">{course.instructor}</span>
                  </div>
                )}
              </div>
            </Card>

            {course.learningObjectives && course.learningObjectives.length > 0 && (
              <Card className="p-4 md:p-6">
                <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-primary" />
                  What You&apos;ll Learn
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {course.learningObjectives.map((objective, index) => (
                    <li key={index}>• {objective}</li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { courseId } = await params;

  return (
    <Suspense fallback={<CoursePageLoading />}>
      <CoursePageLoader courseId={courseId} />
    </Suspense>
  );
}
