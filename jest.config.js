/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Optional: Specify where your tests are located
  // testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],
  // Optional: Clear mocks between every test
  clearMocks: true,
  // Optional: Setup files to run before tests (e.g., for env vars, db setup/teardown)
  // setupFilesAfterEnv: ['./jest.setup.js'],
};