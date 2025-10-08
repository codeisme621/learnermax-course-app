import { render, screen, fireEvent } from '@testing-library/react';
import { ScrollToTop } from '../ScrollToTop';

// Mock framer motion
jest.mock('motion/react', () => ({
  motion: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('ScrollToTop', () => {
  beforeEach(() => {
    // Reset scroll position
    window.scrollY = 0;
  });

  it('should not show button when scroll position is less than 500px', () => {
    render(<ScrollToTop />);
    expect(screen.queryByRole('button', { name: /scroll to top/i })).not.toBeInTheDocument();
  });

  it('should show button when scroll position is greater than 500px', () => {
    render(<ScrollToTop />);

    // Simulate scroll
    Object.defineProperty(window, 'scrollY', { value: 600, writable: true });
    fireEvent.scroll(window);

    expect(screen.getByRole('button', { name: /scroll to top/i })).toBeInTheDocument();
  });

  it('should scroll to top when button is clicked', () => {
    const scrollToMock = jest.fn();
    window.scrollTo = scrollToMock;

    render(<ScrollToTop />);

    // Simulate scroll to make button visible
    Object.defineProperty(window, 'scrollY', { value: 600, writable: true });
    fireEvent.scroll(window);

    const button = screen.getByRole('button', { name: /scroll to top/i });
    fireEvent.click(button);

    expect(scrollToMock).toHaveBeenCalledWith({
      top: 0,
      behavior: 'smooth',
    });
  });
});
