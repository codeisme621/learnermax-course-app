import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getCourse } from '@/app/actions/courses';
import { getProgress } from '@/app/actions/progress';
import { Progress } from '@/components/ui/progress';

interface CourseHeaderProps {
  courseId: string;
}

/**
 * CourseHeader - Sticky header for course page
 * Displays course name, back link, and progress (desktop only)
 * Server component that fetches course and progress data
 */
export async function CourseHeader({ courseId }: CourseHeaderProps) {
  // Fetch course data and progress in parallel
  const [courseResult, progressResult] = await Promise.all([
    getCourse(courseId),
    getProgress(courseId),
  ]);

  // Handle errors gracefully
  if ('error' in courseResult) {
    console.error('[CourseHeader] Failed to fetch course:', courseResult.error);
    return null;
  }

  if ('error' in progressResult) {
    console.error('[CourseHeader] Failed to fetch progress:', progressResult.error);
    // Continue rendering with default progress
  }

  const { course } = courseResult;
  const progress = 'error' in progressResult
    ? { completedLessons: [], percentage: 0, totalLessons: 0 }
    : progressResult;

  return (
    <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Back button */}
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Dashboard</span>
          </Link>

          {/* Course name (center on mobile) */}
          <h1 className="text-lg font-bold truncate flex-1 text-center sm:text-left sm:ml-4">
            {course.name}
          </h1>

          {/* Progress (desktop only) */}
          <div className="hidden md:flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {progress.completedLessons.length} of {progress.totalLessons}
            </span>
            <Progress value={progress.percentage} className="w-32" />
            <span className="text-sm font-semibold">{progress.percentage}%</span>
          </div>
        </div>
      </div>
    </header>
  );
}
