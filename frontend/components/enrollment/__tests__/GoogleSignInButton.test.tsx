import { render, screen, fireEvent } from '@testing-library/react';
import { GoogleSignInButton } from '../GoogleSignInButton';

const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

describe('GoogleSignInButton', () => {
  afterEach(() => {
    consoleLogSpy.mockClear();
  });

  it('renders Google sign in button', () => {
    render(<GoogleSignInButton />);
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
  });

  it('handles click event', () => {
    render(<GoogleSignInButton />);
    const button = screen.getByRole('button', { name: /continue with google/i });
    fireEvent.click(button);
    expect(consoleLogSpy).toHaveBeenCalledWith('Google sign in clicked');
  });
});
