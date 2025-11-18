import { render } from '@testing-library/react';
import { Progress } from '../progress';

describe('Progress', () => {
  it('renders without crashing', () => {
    const { container } = render(<Progress value={0} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('applies correct transform for 0% progress', () => {
    const { container } = render(<Progress value={0} />);
    const indicator = container.querySelector('[style*="transform"]');
    expect(indicator).toHaveStyle({ transform: 'translateX(-100%)' });
  });

  it('applies correct transform for 50% progress', () => {
    const { container } = render(<Progress value={50} />);
    const indicator = container.querySelector('[style*="transform"]');
    expect(indicator).toHaveStyle({ transform: 'translateX(-50%)' });
  });

  it('applies correct transform for 100% progress', () => {
    const { container } = render(<Progress value={100} />);
    const indicator = container.querySelector('[style*="transform"]');
    expect(indicator).toHaveStyle({ transform: 'translateX(-0%)' });
  });

  it('handles undefined value as 0%', () => {
    const { container } = render(<Progress />);
    const indicator = container.querySelector('[style*="transform"]');
    expect(indicator).toHaveStyle({ transform: 'translateX(-100%)' });
  });

  it('accepts custom className', () => {
    const { container } = render(<Progress value={50} className="custom-class" />);
    const root = container.firstChild as HTMLElement;
    expect(root).toHaveClass('custom-class');
  });

  it('renders with correct default classes', () => {
    const { container } = render(<Progress value={50} />);
    const root = container.firstChild as HTMLElement;
    expect(root).toHaveClass('relative', 'h-2', 'w-full', 'overflow-hidden', 'rounded-full');
  });

  it('passes through other props to root element', () => {
    const { container } = render(
      <Progress value={50} data-testid="progress-bar" aria-label="Loading progress" />
    );
    const root = container.firstChild as HTMLElement;
    expect(root).toHaveAttribute('data-testid', 'progress-bar');
    expect(root).toHaveAttribute('aria-label', 'Loading progress');
  });
});
