export default {
  projects: [
    {
      displayName: 'unit',
      preset: 'ts-jest/presets/default-esm',
      testEnvironment: 'node',
      setupFiles: ['<rootDir>/jest.setup.js'],
      extensionsToTreatAsEsm: ['.ts'],
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
      },
      transform: {
        '^.+\\.tsx?$': [
          'ts-jest',
          {
            useESM: true,
          },
        ],
      },
      injectGlobals: true,
      testMatch: ['**/__tests__/**/*.test.ts'],
      testPathIgnorePatterns: ['/node_modules/', '/.aws-sam/', '/dist/', '/__integration__/'],
      collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.types.ts',
        '!src/**/*.repository.ts',
        '!src/**/*.interface.ts',
        '!src/**/__tests__/**',
        '!src/**/__integration__/**',
      ],
      coverageThreshold: {
        global: {
          statements: 80,
          branches: 80,
          functions: 80,
          lines: 80,
        },
      },
    },
    {
      displayName: 'integration',
      preset: 'ts-jest/presets/default-esm',
      testEnvironment: 'node',
      setupFiles: ['<rootDir>/jest.setup.js'],
      setupFilesAfterEnv: ['<rootDir>/src/__integration__/setup.ts'],
      extensionsToTreatAsEsm: ['.ts'],
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
      },
      transform: {
        '^.+\\.tsx?$': [
          'ts-jest',
          {
            useESM: true,
          },
        ],
      },
      injectGlobals: true,
      testMatch: ['**/__integration__/**/*.integration.test.ts'],
      testPathIgnorePatterns: ['/node_modules/', '/.aws-sam/', '/dist/'],
      testTimeout: 30000,
      maxWorkers: 1,
    },
  ],
};
