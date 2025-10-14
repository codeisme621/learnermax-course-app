import { render, screen } from '@testing-library/react';
import { Header } from '../Header';

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
    header: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => <header {...props}>{children}</header>,
  },
}));

describe('Header', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('renders logo', () => {
    render(<Header />);
    expect(screen.getByText('LearnerMax')).toBeInTheDocument();
  });

  it('renders navigation buttons', () => {
    render(<Header />);
    expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enroll now/i })).toBeInTheDocument();
  });
});
