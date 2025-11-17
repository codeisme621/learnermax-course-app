'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { LessonList } from './LessonList';
import type { LessonResponse } from '@/app/actions/lessons';
import type { ProgressResponse } from '@/app/actions/progress';

interface MobileLessonMenuProps {
  courseId: string;
  lessons: LessonResponse[];
  progress: ProgressResponse;
}

/**
 * MobileLessonMenu - Slide-in drawer for mobile lesson navigation
 * Only visible on mobile (lg:hidden)
 * Client component that manages drawer state
 */
export function MobileLessonMenu({ courseId, lessons, progress }: MobileLessonMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      {/* Trigger button (visible only on mobile) */}
      <SheetTrigger asChild>
        <button
          className="lg:hidden fixed top-4 right-4 z-40 p-2 rounded-md hover:bg-muted transition-colors"
          aria-label="Open lesson menu"
        >
          <Menu className="w-6 h-6" />
        </button>
      </SheetTrigger>

      {/* Drawer content */}
      <SheetContent side="right" className="w-80 sm:max-w-sm overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Course Lessons</SheetTitle>
        </SheetHeader>

        <div className="mt-4">
          <LessonList
            courseId={courseId}
            lessons={lessons}
            progress={progress}
            isMobile
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
