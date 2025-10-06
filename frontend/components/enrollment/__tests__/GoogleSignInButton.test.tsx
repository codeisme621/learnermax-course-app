import { render, screen } from '@testing-library/react';
import { GoogleSignInButton } from '../GoogleSignInButton';

describe('GoogleSignInButton', () => {
  it('renders Google sign in button', () => {
    render(<GoogleSignInButton />);
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
  });
});
