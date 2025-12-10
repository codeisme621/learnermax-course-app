'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { CollapsedSidebarView } from './CollapsedSidebarView';
import { ExpandedSidebarView } from './ExpandedSidebarView';
import { MobileLessonMenu } from './MobileLessonMenu';
import type { Course } from '@/app/actions/courses';
import type { LessonResponse } from '@/app/actions/lessons';
import type { ProgressResponse } from '@/app/actions/progress';

interface CollapsibleLessonSidebarProps {
  course: Course;
  lessons: LessonResponse[];
  currentLessonId: string;
  progress: ProgressResponse;
  defaultCollapsed?: boolean;
}

/**
 * CollapsibleLessonSidebar - Main sidebar component for course lessons
 * - Desktop: Shows collapsible sidebar on left (default expanded)
 * - Mobile: Shows hamburger menu with slide-out drawer
 */
export function CollapsibleLessonSidebar({
  course,
  lessons,
  currentLessonId,
  progress,
  defaultCollapsed = false,
}: CollapsibleLessonSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:block transition-all duration-300',
          isCollapsed ? 'w-16' : 'w-80'
        )}
      >
        {isCollapsed ? (
          <CollapsedSidebarView onExpand={() => setIsCollapsed(false)} />
        ) : (
          <ExpandedSidebarView
            course={course}
            lessons={lessons}
            currentLessonId={currentLessonId}
            progress={progress}
            onCollapse={() => setIsCollapsed(true)}
          />
        )}
      </aside>

      {/* Mobile Sidebar (Sheet) */}
      <div className="lg:hidden">
        <MobileLessonMenu
          courseId={course.courseId}
          lessons={lessons}
          progress={progress}
          currentLessonId={currentLessonId}
        />
      </div>
    </>
  );
}
