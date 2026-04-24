/** @type {import('jest').Config} */
const testIgnorePatterns = [
  '/node_modules/',
  '/_archive_20260128/',
  '/scripts/',
];

const moduleIgnorePatterns = [
  '/\\.next/',
  '/\\.tmp/',
  '/release/',
  '/backend_deploy_tmp/',
];

module.exports = {
  testPathIgnorePatterns: testIgnorePatterns,
  modulePathIgnorePatterns: moduleIgnorePatterns,
  watchPathIgnorePatterns: moduleIgnorePatterns,
  testEnvironment: 'node',
  testMatch: [
    '**/__tests__/**/*.(spec|test).[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  passWithNoTests: true
};
