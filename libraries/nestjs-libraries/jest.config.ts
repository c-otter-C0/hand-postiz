// Minimal runner for this library (the repo has no jest project for it):
//   pnpm exec jest -c libraries/nestjs-libraries/jest.config.ts
export default {
  rootDir: '../..',
  testEnvironment: 'node',
  roots: ['<rootDir>/libraries/nestjs-libraries/src'],
  testMatch: ['**/*.spec.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/libraries/nestjs-libraries/tsconfig.lib.json',
        diagnostics: false,
      },
    ],
  },
  moduleNameMapper: {
    '^@gitroom/nestjs-libraries/(.*)$':
      '<rootDir>/libraries/nestjs-libraries/src/$1',
    '^@gitroom/helpers/(.*)$': '<rootDir>/libraries/helpers/src/$1',
  },
};
