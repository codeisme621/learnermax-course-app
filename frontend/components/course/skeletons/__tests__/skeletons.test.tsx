import { render } from '@testing-library/react';
import { VideoPlayerSkeleton } from '../VideoPlayerSkeleton';
import { LessonListSkeleton } from '../LessonListSkeleton';

describe('Skeleton Components', () => {
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
