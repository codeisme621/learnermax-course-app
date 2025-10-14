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
jest.mock('motion/react', () => ({
  motion: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('CtaSection', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('renders section heading', () => {
    render(<CtaSection />);
    expect(screen.getByText(/are you ready to start our course now/i)).toBeInTheDocument();
  });

  it('renders CTA buttons', () => {
    render(<CtaSection />);
    expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /contact us/i })).toBeInTheDocument();
  });
});
