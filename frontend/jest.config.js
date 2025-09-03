export default {
  displayName: "frontend",
  testEnvironment: "jsdom",
  roots: ["<rootDir>/tests"],
  setupFilesAfterEnv: ["<rootDir>/tests/setupTests.js"],
  transform: { "^.+\\.[jt]sx?$": "babel-jest" },
  moduleFileExtensions: ["js", "jsx", "json"],
  moduleNameMapper: {
    // CSS & assets
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    "\\.(png|jpg|jpeg|gif|svg|webp|ico|bmp|ttf|woff2?)$":
      "<rootDir>/tests/__mocks__/fileMock.js",

    // 👇 Map ANY import that ends with "api" to our mock.
    // Matches: "api", "./api", "../api", "src/api", "components/../api", etc.
    "^(?:.*[/\\\\])?api$": "<rootDir>/tests/__mocks__/apiMock.js",
  },
};
