import { render } from '@testing-library/react';
import { CourseHeaderSkeleton } from '../CourseHeaderSkeleton';
import { VideoPlayerSkeleton } from '../VideoPlayerSkeleton';
import { LessonListSkeleton } from '../LessonListSkeleton';

describe('Skeleton Components', () => {
  describe('CourseHeaderSkeleton', () => {
    it('should render without errors', () => {
      const { container } = render(<CourseHeaderSkeleton />);
      expect(container).toBeInTheDocument();
    });

    it('should render a header element', () => {
      const { container } = render(<CourseHeaderSkeleton />);
      const header = container.querySelector('header');
      expect(header).toBeInTheDocument();
    });

    it('should have sticky positioning', () => {
      const { container } = render(<CourseHeaderSkeleton />);
      const header = container.querySelector('header');
      expect(header).toHaveClass('sticky');
    });

    it('should hide progress on mobile (md:flex class)', () => {
      const { container } = render(<CourseHeaderSkeleton />);
      const progressContainer = container.querySelector('.md\\:flex');
      expect(progressContainer).toBeInTheDocument();
      expect(progressContainer).toHaveClass('hidden');
    });

    it('should show hamburger menu only on mobile (lg:hidden)', () => {
      const { container } = render(<CourseHeaderSkeleton />);
      // Find the skeleton element that's lg:hidden (hamburger menu)
      const skeletons = container.querySelectorAll('[class*="lg:hidden"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('VideoPlayerSkeleton', () => {
    it('should render without errors', () => {
      const { container } = render(<VideoPlayerSkeleton />);
      expect(container).toBeInTheDocument();
    });

    it('should render video player with aspect-video class', () => {
      const { container } = render(<VideoPlayerSkeleton />);
      const aspectVideo = container.querySelector('.aspect-video');
      expect(aspectVideo).toBeInTheDocument();
    });

    it('should render multiple skeleton elements for lesson title, video, and description', () => {
      const { container } = render(<VideoPlayerSkeleton />);
      // We expect multiple skeleton elements (title, video, next button, description lines)
      const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
      expect(skeletons.length).toBeGreaterThan(3);
    });
  });

  describe('LessonListSkeleton', () => {
    it('should render without errors', () => {
      const { container } = render(<LessonListSkeleton />);
      expect(container).toBeInTheDocument();
    });

    it('should render 5 lesson item skeletons', () => {
      const { container } = render(<LessonListSkeleton />);
      // Each lesson has a parent div, so we look for the space-y-3 container's children
      const lessonContainer = container.querySelector('.space-y-3');
      expect(lessonContainer?.children.length).toBe(5);
    });

    it('should be wrapped in a Card component', () => {
      const { container } = render(<LessonListSkeleton />);
      // Card component typically has specific classes, we check for the container structure
      const card = container.querySelector('[class*="border"]');
      expect(card).toBeInTheDocument();
    });

    it('should render progress summary skeleton at bottom', () => {
      const { container } = render(<LessonListSkeleton />);
      // Look for the border-t class which indicates the bottom section
      const progressSection = container.querySelector('.border-t');
      expect(progressSection).toBeInTheDocument();
    });
  });
});
