import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { auth } from '@/lib/auth';
import { getAuthToken } from '@/app/actions/auth';
import { getCourse } from '@/lib/data/courses';
import { getLessons } from '@/lib/data/lessons';
import { checkEnrollment } from '@/lib/data/enrollments';
import { getProgress } from '@/lib/data/progress';
import { Card } from '@/components/ui/card';
import { AuthenticatedHeader } from '@/components/layout/AuthenticatedHeader';
import { CourseVideoSection } from '@/components/course/CourseVideoSection';
import { CollapsibleLessonSidebar } from '@/components/course/CollapsibleLessonSidebar';
import CoursePageLoading from './loading';
import {
  CheckCircle,
  Clock,
  Award
} from 'lucide-react';
import type { Metadata } from 'next';

interface CoursePageProps {
  params: Promise<{
    courseId: string;
  }>;
  searchParams?: Promise<{
    lesson?: string;
  }>;
}

// Static metadata - protected page doesn't need SEO
export const metadata: Metadata = {
  title: 'Course - LearnWithRico',
  description: 'Access your course content',
};

// Dynamic content loader - all auth and data fetching inside Suspense
async function CoursePageLoader({ courseId, search }: { courseId: string; search?: { lesson?: string } }) {
  // Check authentication
  const session = await auth();
  if (!session) {
    redirect(`/signin?callbackUrl=/course/${courseId}`);
  }

  // Get auth token for data fetching
  const token = await getAuthToken();
  if (!token) {
    redirect(`/signin?callbackUrl=/course/${courseId}`);
  }

  // Parallel fetch: course (cached), lessons (cached), enrollment + progress (not cached)
  const [courseResult, lessonsResult, isEnrolled, progress] = await Promise.all([
    getCourse(token, courseId),
    getLessons(token, courseId),
    checkEnrollment(token, courseId),
    getProgress(token, courseId),
  ]);

  // Check enrollment
  if (!isEnrolled) {
    redirect('/dashboard?error=not-enrolled');
  }

  // Handle course fetch error
  if ('error' in courseResult) {
    redirect('/dashboard?error=course-not-found');
  }

  const course = courseResult.course;

  // Handle lessons fetch error
  if ('error' in lessonsResult) {
    redirect('/dashboard?error=lessons-not-found');
  }

  const lessons = lessonsResult.lessons;
  const sortedLessons = [...lessons].sort((a, b) => a.order - b.order);

  // Determine which lesson to display:
  // 1. URL param lesson if specified
  // 2. lastAccessedLesson from progress (resume where user left off)
  // 3. First lesson (fallback)
  const requestedLessonId = search?.lesson;
  const lastAccessedLesson = progress?.lastAccessedLesson
    ? lessons.find(l => l.lessonId === progress.lastAccessedLesson)
    : null;
  const currentLesson = requestedLessonId
    ? lessons.find(l => l.lessonId === requestedLessonId) || sortedLessons[0]
    : lastAccessedLesson || sortedLessons[0];

  if (!currentLesson) {
    redirect('/dashboard?error=no-lessons');
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Authenticated Header with Course Progress (fetched via SWR) */}
      <AuthenticatedHeader
        variant="course"
        user={session.user}
        courseId={courseId}
      />

      {/* Main Layout: Flexbox with Left Sidebar */}
      <main className="flex pt-16">
        {/* Left Sidebar: Collapsible Lesson Navigation (fetches progress via SWR) */}
        <CollapsibleLessonSidebar
          course={course}
          lessons={lessons}
          currentLessonId={currentLesson.lessonId}
        />

        {/* Main Content: Video Player and Course Info */}
        <div className="flex-1 p-4 md:p-6 lg:p-8">
          {/* Video Player Section (fetches progress via SWR) */}
          <CourseVideoSection
            courseId={courseId}
            initialLesson={currentLesson}
            lessons={lessons}
            pricingModel={course.pricingModel}
          />

          {/* Course Info Section (below video player) */}
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

export default async function CoursePage({ params, searchParams }: CoursePageProps) {
  const { courseId } = await params;
  const search = searchParams ? await searchParams : undefined;

  return (
    <Suspense fallback={<CoursePageLoading />}>
      <CoursePageLoader courseId={courseId} search={search} />
    </Suspense>
  );
}
