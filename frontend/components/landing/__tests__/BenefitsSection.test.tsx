import { render, screen } from '@testing-library/react';
import { BenefitsSection } from '../BenefitsSection';

// Mock framer motion to avoid async rendering issues in tests
jest.mock('motion/react', () => {
  // Filter out motion-specific props that React doesn't recognize
  const filterMotionProps = (props: Record<string, unknown>) => {
    const motionProps = ['initial', 'animate', 'exit', 'whileInView', 'whileHover', 'whileTap', 'whileFocus', 'whileDrag', 'viewport', 'transition', 'variants', 'layoutId', 'layout'];
    const filtered: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(props)) {
      if (!motionProps.includes(key)) {
        filtered[key] = value;
      }
    }
    return filtered;
  };

  const MockDiv = ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <div {...filterMotionProps(props)}>{children}</div>;
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
    expect(screen.getByText(/the transformation/i)).toBeInTheDocument();
  });

  it('renders all benefit cards', () => {
    render(<BenefitsSection />);
    expect(screen.getByText(/you know what context matters/i)).toBeInTheDocument();
    expect(screen.getByText(/you know when “done” is real/i)).toBeInTheDocument();
    expect(screen.getByText(/you can repeat the workflow/i)).toBeInTheDocument();
    expect(screen.getByText(/you can improve the system/i)).toBeInTheDocument();
  });
});
