import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EnrollmentForm } from '../EnrollmentForm';
import { signUp } from '@/lib/cognito';

// Mock framer motion to avoid async rendering issues in tests
jest.mock('motion/react', () => ({
  motion: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock cognito functions
jest.mock('@/lib/cognito');

describe('EnrollmentForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  it('updates form state when typing', () => {
    render(<EnrollmentForm />);

    const nameInput = screen.getByLabelText(/full name/i) as HTMLInputElement;
    const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;

    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    expect(nameInput.value).toBe('John Doe');
    expect(emailInput.value).toBe('john@example.com');
    expect(passwordInput.value).toBe('password123');
  });

  it('handles form submission', async () => {
    const mockSignUp = signUp as jest.MockedFunction<typeof signUp>;
    mockSignUp.mockResolvedValue({ success: true });

    render(<EnrollmentForm />);

    const nameInput = screen.getByLabelText(/full name/i);
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);

    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    const form = screen.getByRole('button', { name: /create account/i }).closest('form');
    if (form) {
      fireEvent.submit(form);
      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith({
          name: 'John Doe',
          email: 'john@example.com',
          password: 'password123',
        });
      });
    }
  });
});
