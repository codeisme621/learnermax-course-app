import { render, screen, waitFor } from '@testing-library/react';
import { TrustIndicators } from '../TrustIndicators';

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

describe('TrustIndicators', () => {
  it('renders the guided cohort', async () => {
    render(<TrustIndicators />);
    await waitFor(() => {
      expect(screen.getByText(/8-week cohort/i)).toBeInTheDocument();
    });
  });

  it('renders office hours support', async () => {
    render(<TrustIndicators />);
    await waitFor(() => {
      expect(screen.getByText(/expert help when you get stuck/i)).toBeInTheDocument();
    });
  });
});
