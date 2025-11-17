import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { auth } from '@/lib/auth';
import { getCourse } from '@/app/actions/courses';
import { checkEnrollment } from '@/app/actions/enrollments';
import { getProgress } from '@/app/actions/progress';
import { getLessons } from '@/app/actions/lessons';
import { Card } from '@/components/ui/card';
import { CourseHeader } from '@/components/course/CourseHeader';
import { CourseVideoSection } from '@/components/course/CourseVideoSection';
import { LessonListSidebar } from '@/components/course/LessonListSidebar';
import { MobileLessonMenu } from '@/components/course/MobileLessonMenu';
import {
  CourseHeaderSkeleton,
  LessonListSkeleton,
} from '@/components/course/skeletons';
import { determineCurrentLesson } from '@/lib/course-utils';
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

export async function generateMetadata({ params }: CoursePageProps): Promise<Metadata> {
  const { courseId } = await params;
  const courseResult = await getCourse(courseId);

  if ('course' in courseResult) {
    return {
      title: `${courseResult.course.name} - LearnerMax`,
      description: courseResult.course.description,
    };
  }

  return {
    title: 'Course - LearnerMax',
    description: 'Access your course content',
  };
}

export default async function CoursePage({ params, searchParams }: CoursePageProps) {
  const { courseId } = await params;
  const search = searchParams ? await searchParams : undefined;

  // Check authentication
  const session = await auth();
  if (!session) {
    redirect(`/signin?callbackUrl=/course/${courseId}`);
  }

  // Check enrollment
  const isEnrolled = await checkEnrollment(courseId);
  if (!isEnrolled) {
    redirect('/dashboard?error=not-enrolled');
  }

  // Fetch course data
  const courseResult = await getCourse(courseId);
  if ('error' in courseResult) {
    redirect('/dashboard?error=course-not-found');
  }

  const course = courseResult.course;

  // Fetch lessons and progress
  const [lessonsResult, progressResult] = await Promise.all([
    getLessons(courseId),
    getProgress(courseId),
  ]);

  // Handle errors
  if ('error' in lessonsResult) {
    redirect('/dashboard?error=lessons-not-found');
  }

  const lessons = lessonsResult.lessons;
  const progress = 'error' in progressResult
    ? {
        courseId,
        completedLessons: [],
        percentage: 0,
        totalLessons: lessons.length,
        updatedAt: new Date().toISOString(),
      }
    : progressResult;

  // Determine which lesson to display
  const currentLesson = determineCurrentLesson(lessons, progress, search);

  if (!currentLesson) {
    redirect('/dashboard?error=no-lessons');
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Progress */}
      <Suspense fallback={<CourseHeaderSkeleton />}>
        <CourseHeader courseId={courseId} />
      </Suspense>

      <div className="container mx-auto px-4 py-8">
        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Video Player Section */}
          <div className="lg:col-span-2">
            <CourseVideoSection
              courseId={courseId}
              initialLesson={currentLesson}
              lessons={lessons}
              initialProgress={progress}
            />
          </div>

          {/* Lesson List Sidebar (Desktop Only) */}
          <div className="hidden lg:block lg:col-span-1">
            <Suspense fallback={<LessonListSkeleton />}>
              <LessonListSidebar courseId={courseId} />
            </Suspense>
          </div>
        </div>

        {/* Course Info Section (below video player) */}
        <div className="mt-8 grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-4">{course.name}</h2>
              <p className="text-muted-foreground mb-6">{course.description}</p>

              <div className="flex flex-wrap gap-4">
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
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
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
      </div>

      {/* Mobile Lesson Menu (Hamburger) */}
      <MobileLessonMenu
        courseId={courseId}
        lessons={lessons}
        progress={progress}
      />
    </div>
  );
}
