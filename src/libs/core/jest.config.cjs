/** @type {import('ts-jest').InitialOptionsTsJest} */

const defaultConfiguration = require("@skhail/config-jest");

module.exports = {
  ...defaultConfiguration,
  verbose: true,
  collectCoverageFrom: [
    "./src/**/*",
    "!./src/**/*.snap",
    "!./src/index.ts",
    "!./src/utils.ts",
    "!./src/types.ts",
    "!./src/classes/Service/index.ts",
  ],
};
