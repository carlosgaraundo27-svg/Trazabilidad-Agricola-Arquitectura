export default {
  testEnvironment: "node",
  testMatch: ["<rootDir>/tests/jest/**/*.test.js"],
  transform: {},
  coverageProvider: "v8",
  collectCoverageFrom: ["server/**/*.js"],
  coverageDirectory: "coverage/jest",
  coverageReporters: ["text", "html", "lcovonly", "json-summary", "json"],
};
