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
  it('renders heading', async () => {
    render(<TrustIndicators />);
    await waitFor(() => {
      expect(screen.getByText(/crafted from real-world engineering battles/i)).toBeInTheDocument();
    });
  });

  it('renders description text', async () => {
    render(<TrustIndicators />);
    await waitFor(() => {
      expect(screen.getByText(/these techniques come from leading large-scale software projects/i)).toBeInTheDocument();
    });
  });
});
