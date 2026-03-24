/** @type {import('jest').Config} */
module.exports = {
  testPathIgnorePatterns: ['/node_modules/', '/_archive_20260128/', '/scripts/'],
  testMatch: [
    '**/__tests__/**/*.(spec|test).[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  passWithNoTests: true
};
