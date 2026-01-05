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
import type { LessonResponse } from '@/types/lessons';

interface MobileLessonMenuProps {
  courseId: string;
  lessons: LessonResponse[];
  currentLessonId?: string;
}

/**
 * MobileLessonMenu - Slide-in drawer for mobile lesson navigation
 * Only visible on mobile (lg:hidden)
 * Client component that manages drawer state
 * Note: Progress is fetched via SWR hook in LessonList
 */
export function MobileLessonMenu({ courseId, lessons, currentLessonId }: MobileLessonMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      {/* Trigger button (visible only on mobile) */}
      <SheetTrigger asChild>
        <button
          className="lg:hidden fixed top-20 right-4 z-50 h-12 w-12 rounded-full bg-background border border-border shadow-lg hover:bg-muted active:bg-muted transition-colors flex items-center justify-center"
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
            currentLessonId={currentLessonId}
            isMobile
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
