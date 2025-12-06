import { render, screen } from '@testing-library/react';
import { BenefitsSection } from '../BenefitsSection';

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

describe('BenefitsSection', () => {
  it('renders section heading', () => {
    render(<BenefitsSection />);
    expect(screen.getByText(/why choose us/i)).toBeInTheDocument();
  });

  it('renders all benefit cards', () => {
    render(<BenefitsSection />);
    expect(screen.getByText('Lifetime Access')).toBeInTheDocument();
    expect(screen.getByText(/master spec-driven development/i)).toBeInTheDocument();
    expect(screen.getByText(/ship 10× faster/i)).toBeInTheDocument();
    expect(screen.getByText('Weekly Developer Meetups')).toBeInTheDocument();
    expect(screen.getByText(/build skills your peers/i)).toBeInTheDocument();
  });
});
