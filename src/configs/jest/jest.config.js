/** @type {import('ts-jest').InitialOptionsTsJest} */
module.exports = {
  testEnvironment: "node",
  testPathIgnorePatterns: ["./node_modules/"],
  runner: "groups",
  passWithNoTests: true,
  collectCoverageFrom: [
    "./src/**/*",
    "!./src/**/*.snap",
    "!./src/index.ts",
    "!./src/types.ts",
  ],
  coverageThreshold: {
    global: {
      lines: 95,
      branches: 95,
      functions: 95,
      statements: 95,
    },
  },
};
