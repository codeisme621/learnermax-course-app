'use client';

import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CollapsedSidebarViewProps {
  onExpand: () => void;
}

/**
 * CollapsedSidebarView - Narrow sidebar view with expand button
 * Shown when user clicks collapse button on desktop
 */
export function CollapsedSidebarView({ onExpand }: CollapsedSidebarViewProps) {
  return (
    <div className="h-screen sticky top-16 bg-card border-r border-border flex flex-col items-center py-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={onExpand}
        aria-label="Expand sidebar"
      >
        <ChevronRight className="h-5 w-5" />
        <span className="sr-only">Expand sidebar</span>
      </Button>

      {/* Vertical "Lessons" text */}
      <div
        className="mt-8 text-sm text-muted-foreground"
        style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
      >
        Lessons
      </div>
    </div>
  );
}
