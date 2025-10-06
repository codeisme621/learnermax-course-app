import { render, screen } from '@testing-library/react';
import { BenefitsSection } from '../BenefitsSection';

// Mock framer motion to avoid async rendering issues in tests
// eslint-disable-next-line @typescript-eslint/no-explicit-any
jest.mock('motion/react', () => ({
  motion: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('BenefitsSection', () => {
  it('renders section heading', () => {
    render(<BenefitsSection />);
    expect(screen.getByText(/why choose us/i)).toBeInTheDocument();
  });

  it('renders all benefit cards', () => {
    render(<BenefitsSection />);
    expect(screen.getByText('Lifetime Access')).toBeInTheDocument();
    expect(screen.getByText('Get Certificates')).toBeInTheDocument();
    expect(screen.getByText('Course Accessibility')).toBeInTheDocument();
    expect(screen.getByText('Track Progress')).toBeInTheDocument();
  });
});
