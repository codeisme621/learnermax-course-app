import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getCourse } from '@/app/actions/courses';
import { checkEnrollment } from '@/app/actions/enrollments';
import { getProgress } from '@/app/actions/progress';
import { getLessons } from '@/app/actions/lessons';
import { getStudent } from '@/app/actions/students';
import { Card } from '@/components/ui/card';
import { AuthenticatedHeader } from '@/components/layout/AuthenticatedHeader';
import { CourseVideoSection } from '@/components/course/CourseVideoSection';
import { CollapsibleLessonSidebar } from '@/components/course/CollapsibleLessonSidebar';
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

// Static metadata - protected page doesn't need SEO
export const metadata: Metadata = {
  title: 'Course - LearnWithRico',
  description: 'Access your course content',
};

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

  // Fetch lessons, progress, and student data
  const [lessonsResult, progressResult, student] = await Promise.all([
    getLessons(courseId),
    getProgress(courseId),
    getStudent(),
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

  // Auto-redirect to last accessed lesson if no query param and target is not first lesson
  const requestedLesson = search?.lesson;
  if (!requestedLesson && lessons.length > 0 && currentLesson.lessonId !== lessons[0]?.lessonId) {
    redirect(`/course/${courseId}?lesson=${currentLesson.lessonId}`);
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Authenticated Header with Course Progress */}
      <AuthenticatedHeader
        variant="course"
        user={session.user}
        courseProgress={{
          percentage: progress.percentage,
          completedLessons: progress.completedLessons.length,
          totalLessons: progress.totalLessons,
        }}
      />

      {/* Main Layout: Flexbox with Left Sidebar */}
      <main className="flex pt-16">
        {/* Left Sidebar: Collapsible Lesson Navigation */}
        <CollapsibleLessonSidebar
          course={course}
          lessons={lessons}
          currentLessonId={currentLesson.lessonId}
          progress={progress}
        />

        {/* Main Content: Video Player and Course Info */}
        <div className="flex-1 p-4 md:p-6 lg:p-8">
          {/* Video Player Section */}
          <CourseVideoSection
            courseId={courseId}
            initialLesson={currentLesson}
            lessons={lessons}
            initialProgress={progress}
            student={student}
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
