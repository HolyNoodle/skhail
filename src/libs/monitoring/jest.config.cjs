/** @type {import('ts-jest').InitialOptionsTsJest} */

const defaultConfiguration = require("@skhail/config-jest");

module.exports = {
  ...defaultConfiguration,
  verbose: true,
  collectCoverageFrom: [
    "./src/**/*",
    "!./src/client.ts",
    "!./src/server.ts",
    "!./**/*.snap",
    "!./src/classes/Client/IMonitoringService.ts",
  ],
};
