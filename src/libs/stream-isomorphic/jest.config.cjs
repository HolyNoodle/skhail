/** @type {import('ts-jest').InitialOptionsTsJest} */

const defaultConfiguration = require("@skhail/config-jest");

module.exports = {
  ...defaultConfiguration,
  verbose: true,
  collectCoverageFrom: ["!./src/**/*", "!./src/index.d.ts"],
};
