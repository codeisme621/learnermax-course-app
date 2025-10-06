import { render, screen } from '@testing-library/react';
import { EnrollmentForm } from '../EnrollmentForm';

// Mock framer motion to avoid async rendering issues in tests
// eslint-disable-next-line @typescript-eslint/no-explicit-any
jest.mock('motion/react', () => ({
  motion: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('EnrollmentForm', () => {
  it('renders form fields', () => {
    render(<EnrollmentForm />);
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('renders Google sign in button', () => {
    render(<EnrollmentForm />);
    expect(screen.getByText(/continue with google/i)).toBeInTheDocument();
  });

  it('renders create account button', () => {
    render(<EnrollmentForm />);
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });
});
