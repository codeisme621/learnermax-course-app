/**
 * Jest configuration for LearnerMax Frontend
 * Separates unit and integration tests like backend
 */
export default {
  projects: [
    {
      displayName: 'unit',
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
      },
      testMatch: [
        '**/__tests__/**/*.[jt]s?(x)',
        '**/?(*.)+(spec|test).[jt]s?(x)',
      ],
      testPathIgnorePatterns: [
        '/node_modules/',
        '/__integration__/',
        '/mocks/',
      ],
      collectCoverageFrom: [
        'components/**/*.{js,jsx,ts,tsx}',
        'lib/**/*.{js,jsx,ts,tsx}',
        'app/actions/**/*.{js,jsx,ts,tsx}',
        '!app/**/*',
        '!components/**/*.d.ts',
        '!lib/**/*.d.ts',
        '!components/ui/form.tsx',
        '!components/ui/avatar.tsx',
        '!components/ui/badge.tsx',
        '!components/ui/card.tsx',
        '!**/__tests__/**',
        '!**/__integration__/**',
      ],
      coverageThreshold: {
        global: {
          statements: 80,
          branches: 80,
          functions: 80,
          lines: 80,
        },
      },
      transform: {
        '^.+\\.(ts|tsx|js|jsx)$': [
          '@swc/jest',
          {
            jsc: {
              parser: {
                syntax: 'typescript',
                tsx: true,
              },
              transform: {
                react: {
                  runtime: 'automatic',
                },
              },
            },
          },
        ],
      },
      transformIgnorePatterns: [
        'node_modules/(?!(next-auth|@auth)/)',
      ],
    },
    {
      displayName: 'integration',
      testEnvironment: 'jsdom',
      setupFiles: ['<rootDir>/jest.polyfills.js'],
      setupFilesAfterEnv: [
        '<rootDir>/jest.setup.js',
        '<rootDir>/app/actions/__integration__/setup.ts',
      ],
      testEnvironmentOptions: {
        customExportConditions: [''], // Important for MSW + Jest + Node 18
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
      },
      testMatch: ['**/__integration__/**/*.integration.test.[jt]s?(x)'],
      testPathIgnorePatterns: ['/node_modules/'],
      transform: {
        '^.+\\.(ts|tsx|js|jsx)$': [
          '@swc/jest',
          {
            jsc: {
              parser: {
                syntax: 'typescript',
                tsx: true,
              },
              transform: {
                react: {
                  runtime: 'automatic',
                },
              },
            },
          },
        ],
      },
      transformIgnorePatterns: [
        // Transform all ESM packages for MSW
        // This is more aggressive but needed for MSW v2
      ],
    },
  ],
};
