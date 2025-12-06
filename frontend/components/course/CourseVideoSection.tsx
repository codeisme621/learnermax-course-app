'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ArrowRight } from 'lucide-react';
import { VideoPlayer } from './VideoPlayer';
import { Button } from '@/components/ui/button';
import { getProgress, markLessonComplete } from '@/app/actions/progress';
import { getNextLesson } from '@/lib/course-utils';
import type { LessonResponse } from '@/app/actions/lessons';
import type { ProgressResponse } from '@/app/actions/progress';
import type { Student } from '@/app/actions/students';

// Dynamically import components
const Confetti = dynamic(() => import('react-confetti'), { ssr: false });
const PremiumUpsellModal = dynamic(() => import('@/components/PremiumUpsellModal').then(mod => ({ default: mod.PremiumUpsellModal })), { ssr: false });

interface CourseVideoSectionProps {
  courseId: string;
  initialLesson: LessonResponse;
  lessons: LessonResponse[];
  initialProgress: ProgressResponse;
  student: Student | null;
  pricingModel: 'free' | 'paid';
}

/**
 * CourseVideoSection - Video player section with Next Lesson button
 * Client component that manages video playback and progress updates
 */
export function CourseVideoSection({
  courseId,
  initialLesson,
  lessons,
  initialProgress: _initialProgress,
  student,
  pricingModel,
}: CourseVideoSectionProps) {
  const [currentLesson, setCurrentLesson] = useState<LessonResponse>(initialLesson);
  const [isRefreshingProgress, setIsRefreshingProgress] = useState(false);

  // Modal and confetti state
  const [showUpsellModal, setShowUpsellModal] = useState(false);
  const [showFullScreenConfetti, setShowFullScreenConfetti] = useState(false);
  const [isReadyToComplete, setIsReadyToComplete] = useState(false);
  const [isCompletingCourse, setIsCompletingCourse] = useState(false);

  // Update currentLesson when initialLesson changes (from URL navigation)
  useEffect(() => {
    setCurrentLesson(initialLesson);
  }, [initialLesson]);

  // Handle lesson completion
  const handleLessonComplete = async () => {
    console.log('[CourseVideoSection] Lesson completed, refetching progress');
    setIsRefreshingProgress(true);

    try {
      const updatedProgress = await getProgress(courseId);
      if ('error' in updatedProgress) {
        console.error('[CourseVideoSection] Failed to refetch progress:', updatedProgress.error);
      } else {
        // Progress successfully refetched (logged for debugging)
        // Note: Progress is managed by parent page component via server-side refetch
        console.log('[CourseVideoSection] Progress updated:', updatedProgress);
      }
    } catch (error) {
      console.error('[CourseVideoSection] Error refetching progress:', error);
    } finally {
      setIsRefreshingProgress(false);
    }
  };

  // Handle course completion (100%)
  const handleCourseComplete = () => {
    console.log('[CourseVideoSection] Course 100% complete!');
    // This callback is no longer used - completion is triggered manually via "Complete Course" button
  };

  // Handle "Complete Course" button click
  const handleCompleteCourse = async () => {
    if (isCompletingCourse) return; // Prevent double-click

    console.log('[CourseVideoSection] Complete Course button clicked');
    setIsCompletingCourse(true);

    try {
      // Mark the final lesson as complete
      const result = await markLessonComplete(courseId, currentLesson.lessonId);
      console.log('[CourseVideoSection] markLessonComplete result:', result);

      if ('error' in result) {
        console.error('[CourseVideoSection] Failed to mark lesson complete:', result.error);
        // TODO: Show error toast
        return;
      }

      // Show confetti + modal simultaneously
      console.log('[CourseVideoSection] Showing full-screen confetti + modal');
      setShowFullScreenConfetti(true);

      // Only show modal for free courses
      if (pricingModel === 'free') {
        setShowUpsellModal(true);
      }

      // Stop confetti after 5 seconds
      setTimeout(() => {
        setShowFullScreenConfetti(false);
      }, 5000);

      // Refetch progress to update UI
      handleLessonComplete();
    } catch (error) {
      console.error('[CourseVideoSection] Error completing course:', error);
    } finally {
      setIsCompletingCourse(false);
    }
  };

  // Get next lesson
  const nextLesson = getNextLesson(lessons, currentLesson.lessonId);

  return (
    <>
      {/* Full-screen confetti */}
      {showFullScreenConfetti && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <Confetti
            width={typeof window !== 'undefined' ? window.innerWidth : 300}
            height={typeof window !== 'undefined' ? window.innerHeight : 200}
            recycle={false}
            numberOfPieces={500}
          />
        </div>
      )}

      {/* Premium Upsell Modal */}
      {showUpsellModal && (
        <PremiumUpsellModal
          isOpen={showUpsellModal}
          onClose={() => setShowUpsellModal(false)}
          isInterestedInPremium={student?.interestedInPremium || false}
        />
      )}

      <div className="space-y-4 md:space-y-6">
        {/* Video player - no title here, it's in the sidebar */}
        <VideoPlayer
          lessonId={currentLesson.lessonId}
          courseId={courseId}
          onLessonComplete={handleLessonComplete}
          onCourseComplete={handleCourseComplete}
          isLastLesson={!nextLesson}
          onReadyToComplete={() => {
            console.log('[CourseVideoSection] Last lesson ready to complete');
            setIsReadyToComplete(true);
          }}
        />

        {/* Next Lesson button OR Complete Course button */}
        {nextLesson ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-muted rounded-lg">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Up Next</p>
              <p className="font-medium">{nextLesson.title}</p>
              {nextLesson.lengthInMins && (
                <p className="text-xs text-muted-foreground">{nextLesson.lengthInMins} min</p>
              )}
            </div>
            <Link href={`/course/${courseId}?lesson=${nextLesson.lessonId}`} className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto">
                Next Lesson <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        ) : isReadyToComplete ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-lg">
            <div className="flex-1">
              <p className="text-sm font-semibold text-green-700">🎉 You&apos;ve reached the end!</p>
              <p className="font-medium text-gray-900">Ready to complete the course?</p>
            </div>
            <Button
              onClick={handleCompleteCourse}
              disabled={isCompletingCourse}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
            >
              {isCompletingCourse ? 'Completing...' : 'Complete Course'} 🎓
            </Button>
          </div>
        ) : null}

      {/* Lesson description */}
      {currentLesson.description && (
        <div className="p-4 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2">About this lesson</h3>
          <p className="text-sm text-muted-foreground">{currentLesson.description}</p>
        </div>
      )}

        {/* Debug info (optional, can be removed) */}
        {isRefreshingProgress && (
          <p className="text-xs text-muted-foreground">Updating progress...</p>
        )}
      </div>
    </>
  );
}
