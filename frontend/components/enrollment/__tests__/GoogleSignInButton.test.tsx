import { render, screen, fireEvent } from '@testing-library/react';
import { GoogleSignInButton } from '../GoogleSignInButton';
import { signInWithGoogle } from '@/app/actions/auth';

// Mock the auth action
jest.mock('@/app/actions/auth');

describe('GoogleSignInButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders Google sign in button', () => {
    render(<GoogleSignInButton />);
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
  });

  it('handles click event', async () => {
    render(<GoogleSignInButton />);
    const button = screen.getByRole('button', { name: /continue with google/i });
    fireEvent.click(button);
    expect(signInWithGoogle).toHaveBeenCalled();
  });
});
