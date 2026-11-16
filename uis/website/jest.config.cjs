module.exports = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: { module: "CommonJS", jsx: "react-jsx" } }],
  },
  collectCoverageFrom: ["src/lib/auth.ts"],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],
};
