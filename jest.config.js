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
  testMatch: [
    '**/__tests__/**/*.(spec|test).[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  passWithNoTests: true
};
