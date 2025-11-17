'use client';

import Link from 'next/link';
import { BookOpen, CheckCircle, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { LessonResponse } from '@/app/actions/lessons';
import type { ProgressResponse } from '@/app/actions/progress';

interface LessonListProps {
  courseId: string;
  lessons: LessonResponse[];
  progress: ProgressResponse;
  isMobile?: boolean;
}

/**
 * LessonList - Client component that displays lessons with progress
 * Accepts lessons and progress as props (data fetched by parent)
 */
export function LessonList({
  courseId,
  lessons,
  progress,
  isMobile = false,
}: LessonListProps) {
  // Sort lessons by order
  const sortedLessons = [...lessons].sort((a, b) => a.order - b.order);

  return (
    <Card className={cn('p-6', isMobile && 'h-full')}>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-primary" />
        Course Lessons
      </h3>

      <div className="space-y-2">
        {sortedLessons.map((lesson) => {
          const isCompleted = progress.completedLessons.includes(lesson.lessonId);
          const isResume = lesson.lessonId === progress.lastAccessedLesson && !isCompleted;

          return (
            <Link
              key={lesson.lessonId}
              href={`/course/${courseId}?lesson=${lesson.lessonId}`}
              className={cn(
                'block p-3 rounded-lg transition-colors hover:bg-muted',
                isCompleted && 'bg-muted/50'
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {isCompleted && (
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" data-testid="check-circle-icon" />
                    )}
                    {isResume && (
                      <Badge variant="secondary" className="text-xs">
                        Resume
                      </Badge>
                    )}
                    <span className="text-sm font-medium">
                      {lesson.order}. {lesson.title}
                    </span>
                  </div>
                  {lesson.lengthInMins && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground ml-6">
                      <Clock className="w-3 h-3" />
                      <span>{lesson.lengthInMins} min</span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Progress summary */}
      <div className="mt-6 pt-6 border-t">
        <div className="text-sm text-muted-foreground mb-2">
          Course Progress
        </div>
        <Progress value={progress.percentage} className="h-2 mb-2" />
        <div className="flex justify-between text-sm">
          <span>
            {progress.completedLessons.length} of {progress.totalLessons} lessons
          </span>
          <span className="font-semibold">{progress.percentage}%</span>
        </div>
      </div>
    </Card>
  );
}
