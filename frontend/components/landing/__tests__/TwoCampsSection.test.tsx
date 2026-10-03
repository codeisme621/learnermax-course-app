import { render, screen } from '@testing-library/react';
import { TwoCampsSection } from '../TwoCampsSection';

describe('TwoCampsSection', () => {
  it('contrasts vibe coding with agentic engineering', () => {
    render(<TwoCampsSection />);
    expect(screen.getByText(/vibe coding/i)).toBeInTheDocument();
    expect(screen.getByText(/agentic engineering/i)).toBeInTheDocument();
    expect(screen.getByText(/prove it with evidence/i)).toBeInTheDocument();
  });
});
