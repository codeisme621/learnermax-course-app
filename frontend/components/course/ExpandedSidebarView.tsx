'use client';

import Link from 'next/link';
import { ChevronLeft, PlayCircle, CheckCircle2, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Course } from '@/app/actions/courses';
import type { LessonResponse } from '@/app/actions/lessons';
import type { ProgressResponse } from '@/app/actions/progress';

interface ExpandedSidebarViewProps {
  course: Course;
  lessons: LessonResponse[];
  currentLessonId: string;
  progress: ProgressResponse;
  onCollapse: () => void;
}

/**
 * ExpandedSidebarView - Full sidebar view with course title, lessons, and progress
 * Shown by default on desktop, can be collapsed
 */
export function ExpandedSidebarView({
  course,
  lessons,
  currentLessonId,
  progress,
  onCollapse,
}: ExpandedSidebarViewProps) {
  // Sort lessons by order
  const sortedLessons = [...lessons].sort((a, b) => a.order - b.order);

  return (
    <div className="h-screen sticky top-16 bg-card border-r border-border overflow-y-auto">
      {/* Header with course title and collapse button */}
      <div className="p-4 border-b border-border flex justify-between items-center">
        <h2 className="font-semibold text-lg truncate">{course.name}</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onCollapse}
          aria-label="Collapse sidebar"
        >
          <ChevronLeft className="h-5 w-5" />
          <span className="sr-only">Collapse sidebar</span>
        </Button>
      </div>

      {/* Lessons List */}
      <nav className="p-2" aria-label="Course lessons">
        {sortedLessons.map((lesson) => {
          const isCompleted = progress.completedLessons.includes(lesson.lessonId);
          const isCurrent = lesson.lessonId === currentLessonId;
          const isLastAccessed = lesson.lessonId === progress.lastAccessedLesson;

          return (
            <Link
              key={lesson.lessonId}
              href={`/course/${course.courseId}?lesson=${lesson.lessonId}`}
              aria-current={isCurrent ? 'page' : undefined}
              className={cn(
                'block p-3 rounded-lg mb-1 transition-colors',
                isCurrent && [
                  'bg-primary/10',
                  'border-l-4',
                  'border-primary',
                  'font-semibold',
                ],
                !isCurrent && 'hover:bg-muted'
              )}
            >
              <div className="flex items-start gap-3">
                {/* Icon based on lesson state */}
                {isCurrent ? (
                  <PlayCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                ) : isCompleted ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                )}

                {/* Lesson Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {lesson.order}. {lesson.title}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                    {lesson.lengthInMins && <span>{lesson.lengthInMins} min</span>}
                    {isLastAccessed && !isCompleted && (
                      <Badge variant="secondary" className="text-xs">
                        Resume
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Progress Summary */}
      <div className="p-4 border-t border-border">
        <div className="text-sm font-medium mb-2">
          {progress.completedLessons.length} of {progress.totalLessons} lessons • {progress.percentage}%
        </div>
        <div className="w-full bg-secondary rounded-full h-2">
          <div
            className="bg-primary rounded-full h-2 transition-all"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}
