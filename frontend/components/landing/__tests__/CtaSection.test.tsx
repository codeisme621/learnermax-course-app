import { render, screen } from '@testing-library/react';
import { CtaSection } from '../CtaSection';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock framer motion to avoid async rendering issues in tests
jest.mock('motion/react', () => {
  const MockDiv = ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <div {...props}>{children}</div>;
  MockDiv.displayName = 'MockMotionDiv';
  return {
    motion: {
      div: MockDiv,
    },
  };
});

describe('CtaSection', () => {
  beforeEach(() => {
    mockPush.mockClear();
    // Clear sessionStorage before each test
    sessionStorage.clear();
  });

  it('renders section heading', () => {
    render(<CtaSection />);
    expect(screen.getByText(/take control of your ai coding workflow/i)).toBeInTheDocument();
  });

  it('renders CTA button', () => {
    render(<CtaSection />);
    expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument();
  });

  it('stores courseId in sessionStorage and navigates when Get Started clicked', () => {
    render(<CtaSection />);
    const getStartedButton = screen.getByRole('button', { name: /get started/i });

    getStartedButton.click();

    expect(sessionStorage.getItem('pendingEnrollmentCourseId')).toBe('spec-driven-dev-mini');
    expect(mockPush).toHaveBeenCalledWith('/enroll');
  });
});
