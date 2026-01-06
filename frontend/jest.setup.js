// Polyfills for SWR which checks document.visibilityState
// Make it enumerable and non-configurable to persist through test lifecycle
if (typeof document !== 'undefined') {
  Object.defineProperty(document, 'visibilityState', {
    configurable: false,
    enumerable: true,
    get: () => 'visible',
  });
  Object.defineProperty(document, 'hidden', {
    configurable: false,
    enumerable: true,
    get: () => false,
  });
}

// Mock IntersectionObserver for components that use visibility detection
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
require('@testing-library/jest-dom');

// React 19 uses MessageChannel for scheduling - clean up after each test
// This fixes the "Jest has detected open handles" warning
afterEach(async () => {
  // Wait for any pending React updates to flush
  await new Promise((resolve) => setTimeout(resolve, 0));
});

// Mock next-auth
jest.mock('next-auth', () => ({
  default: jest.fn(),
}));

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
  signOut: jest.fn(),
  useSession: jest.fn(() => ({ data: null, status: 'unauthenticated' })),
}));

// Mock app/actions/auth
jest.mock('./app/actions/auth', () => ({
  signInWithGoogle: jest.fn(),
  signOut: jest.fn(),
}));

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  })),
  usePathname: jest.fn(() => '/'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

// Mock @vercel/analytics
jest.mock('@vercel/analytics', () => ({
  track: jest.fn(),
}));

jest.mock('@vercel/analytics/react', () => ({
  Analytics: () => null,
  track: jest.fn(),
}));
