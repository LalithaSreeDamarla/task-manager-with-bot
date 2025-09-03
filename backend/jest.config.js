export default {
  displayName: "backend",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  clearMocks: true,

  // Transform TS/JS with Babel
  transform: {
    "^.+\\.[tj]sx?$": "babel-jest"
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  
  // Coverage
  collectCoverage: true,
  coverageReporters: ["text", "lcov"],
  collectCoverageFrom: [
    "<rootDir>/**/*.js",
    "!<rootDir>/**/tests/**",
    "!<rootDir>/**/node_modules/**"
  ],
};
