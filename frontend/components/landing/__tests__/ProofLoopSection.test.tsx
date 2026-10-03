import { render, screen } from '@testing-library/react';
import { ProofLoopSection } from '../ProofLoopSection';

describe('ProofLoopSection', () => {
  it('states the Proof Loop principle', () => {
    render(<ProofLoopSection />);
    expect(screen.getByRole('heading', { name: /agents should be creative\. verification should be deterministic\./i })).toBeInTheDocument();
  });

  it('walks through all five steps', () => {
    render(<ProofLoopSection />);
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByText(/failure becomes a prompt/i)).toBeInTheDocument();
    expect(screen.getByText(/hard cap on attempts/i)).toBeInTheDocument();
  });

  it('labels the sample run as illustrative', () => {
    render(<ProofLoopSection />);
    expect(screen.getByText(/illustrative example/i)).toBeInTheDocument();
  });
});
