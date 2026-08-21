module.exports = {
  testEnvironment: 'node',
  collectCoverage: true,
  coverageDirectory: 'coverage',
  testMatch: [],
  transformIgnorePatterns: [
    '[/\\\\\\\\]node_modules[/\\\\\\\\].+\\\\.(js|ts)$'
  ],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }]
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  coveragePathIgnorePatterns: [
    "/node_modules/"
  ]
};
