/*
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

module.exports = {
  verbose: true,
  silent: false,
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/tests/**/*.test.mjs'
  ],
  roots: ['<rootDir>/tests'],
  testPathIgnorePatterns: [
    '/node_modules/'
  ],
  transform: {
    // '^.+\\.m?js$': 'babel-jest'
  }
}
