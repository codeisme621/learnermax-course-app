'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ArrowRight } from 'lucide-react';
import { VideoPlayer } from './VideoPlayer';
import { Button } from '@/components/ui/button';
import { getNextLesson } from '@/lib/course-utils';
import { useStudent } from '@/hooks/useStudent';
import { useProgress } from '@/hooks/useProgress';
import { markLessonComplete } from '@/app/actions/progress';
import type { LessonResponse } from '@/types/lessons';

// CloudFront domain for HLS video streaming
const VIDEO_CDN_DOMAIN = process.env.NEXT_PUBLIC_VIDEO_CDN_DOMAIN;

// Dynamically import components
const Confetti = dynamic(() => import('react-confetti'), { ssr: false });
const PremiumUpsellModal = dynamic(() => import('@/components/PremiumUpsellModal').then(mod => ({ default: mod.PremiumUpsellModal })), { ssr: false });

interface CourseVideoSectionProps {
  courseId: string;
  initialLesson: LessonResponse;
  lessons: LessonResponse[];
  pricingModel: 'free' | 'paid';
}

/**
 * CourseVideoSection - Video player section with Next Lesson button
 * Client component that manages video playback and progress updates
 * Uses SWR hook for progress data (shared cache with sidebar and header)
 */
export function CourseVideoSection({
  courseId,
  initialLesson,
  lessons,
  pricingModel,
}: CourseVideoSectionProps) {
  // Use SWR hook for student data - allows optimistic updates to propagate to dashboard
  const { interestedInPremium, setInterestedInPremium } = useStudent();
  // Use SWR hook for progress cache revalidation
  const { mutate: mutateProgress } = useProgress(courseId);
  const [currentLesson, setCurrentLesson] = useState<LessonResponse>(initialLesson);
  const [isRefreshingProgress, setIsRefreshingProgress] = useState(false);

  // Modal and confetti state
  const [showUpsellModal, setShowUpsellModal] = useState(false);
  const [showFullScreenConfetti, setShowFullScreenConfetti] = useState(false);
  const [isReadyToComplete, setIsReadyToComplete] = useState(false);
  const [isCompletingCourse, setIsCompletingCourse] = useState(false);

  // Track lesson changes to determine auto-play behavior
  // Initial load (from dashboard): don't auto-play
  // Internal navigation (sidebar/Next Lesson): auto-play
  const previousLessonIdRef = useRef<string | null>(null);
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false);

  // Update currentLesson when initialLesson changes (from URL navigation)
  useEffect(() => {
    const currentLessonId = initialLesson.lessonId;
    const previousLessonId = previousLessonIdRef.current;

    // Determine if this is initial load or internal navigation
    const isInitialLoad = previousLessonId === null;
    const isLessonChange = previousLessonId !== null && previousLessonId !== currentLessonId;

    if (isInitialLoad) {
      // First lesson load (from dashboard or direct URL) - don't auto-play
      setShouldAutoPlay(false);
      console.log('[CourseVideoSection] Initial load, not auto-playing');
    } else if (isLessonChange) {
      // Lesson changed via internal navigation - auto-play
      setShouldAutoPlay(true);
      console.log('[CourseVideoSection] Lesson changed, will auto-play');
    }
    // If same lesson (re-render), don't change autoPlay state

    // Update ref for next comparison
    previousLessonIdRef.current = currentLessonId;

    setCurrentLesson(initialLesson);
    // Reset ready-to-complete state when switching lessons
    setIsReadyToComplete(false);
  }, [initialLesson]);

  // Handle lesson completion - revalidate SWR cache
  const handleLessonComplete = async () => {
    console.log('[CourseVideoSection] Lesson completed, revalidating progress cache');
    setIsRefreshingProgress(true);

    try {
      // Revalidate SWR cache - this will refetch progress data
      await mutateProgress();
      console.log('[CourseVideoSection] Progress cache revalidated');
    } catch (error) {
      console.error('[CourseVideoSection] Error revalidating progress:', error);
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
      // Call server action directly (like the old working code)
      const result = await markLessonComplete(courseId, currentLesson.lessonId);
      console.log('[CourseVideoSection] markLessonComplete result:', result);

      if ('error' in result) {
        throw new Error(result.error);
      }

      // Refresh SWR cache so sidebar/header update
      await mutateProgress();
      console.log('[CourseVideoSection] Lesson marked complete, cache refreshed');

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
          isInterestedInPremium={interestedInPremium}
          onSignup={setInterestedInPremium}
        />
      )}

      <div className="space-y-4 md:space-y-6">
        {/* Video player - no title here, it's in the sidebar */}
        <VideoPlayer
          lessonId={currentLesson.lessonId}
          courseId={courseId}
          manifestUrl={
            currentLesson.hlsManifestKey && VIDEO_CDN_DOMAIN
              ? `https://${VIDEO_CDN_DOMAIN}/${currentLesson.hlsManifestKey}`
              : null
          }
          onLessonComplete={handleLessonComplete}
          onCourseComplete={handleCourseComplete}
          isLastLesson={!nextLesson}
          autoPlay={shouldAutoPlay}
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
