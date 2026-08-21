const commonConfig = require('./jest.config.js');

module.exports = {
  ...commonConfig,
  collectCoverage: false,
  testMatch: ['**/*.integration.test.{js,ts}']
};
