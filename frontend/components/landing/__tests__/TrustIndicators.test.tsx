import { render, screen, waitFor } from '@testing-library/react';
import { TrustIndicators } from '../TrustIndicators';

// Mock framer motion to avoid async rendering issues in tests
jest.mock('motion/react', () => ({
  motion: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('TrustIndicators', () => {
  it('renders company names', async () => {
    render(<TrustIndicators />);
    await waitFor(() => {
      expect(screen.getByText('Duolingo')).toBeInTheDocument();
      expect(screen.getByText('Google')).toBeInTheDocument();
    });
  });

  it('renders trust message', async () => {
    render(<TrustIndicators />);
    await waitFor(() => {
      expect(screen.getByText(/trusted by 3000\+ company/i)).toBeInTheDocument();
    });
  });
});
