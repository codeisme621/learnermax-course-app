import { render, screen } from '@testing-library/react';
import { StorySection } from '../StorySection';

describe('StorySection', () => {
  it('names the pressure engineers feel', () => {
    render(<StorySection />);
    expect(screen.getByRole('heading', { name: /new language every week/i })).toBeInTheDocument();
    expect(screen.getByText('Ralph loops')).toBeInTheDocument();
  });

  it('positions the course around durable principles', () => {
    render(<StorySection />);
    expect(screen.getByText(/more than 1,000 hours later/i)).toBeInTheDocument();
    expect(screen.getByText(/tools will keep changing/i)).toBeInTheDocument();
  });
});
