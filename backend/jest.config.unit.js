const commonConfig = require('./jest.config.js');

module.exports = {
  ...commonConfig,
  testMatch: [
    '**/*.unit.test.{js,ts}'
  ],
  collectCoverageFrom: [
    '**/db/**/*.ts',
    '**/libs/**/*.ts',
    '**/middlewares/**/*.ts',
    '**/routes/**/*.ts',
    '**/services/**/*.ts',
    '**/utils/**/*.ts'
  ],
  coverageDirectory: 'coverage/unit'
};
