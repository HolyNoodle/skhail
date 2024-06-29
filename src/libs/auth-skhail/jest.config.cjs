/** @type {import('ts-jest').InitialOptionsTsJest} */

const defaultConfiguration = require("@skhail/config-jest");

module.exports = {
  ...defaultConfiguration,
  verbose: true,
  collectCoverageFrom: [
    "./src/**/*",
    "!./src/client.ts",
    "!./src/Client/AuthClientRequester.ts", // TODO: Clean or test file, not implemented
    "!./src/server.ts",
    "!./src/types.ts",
    "!./src/integration.db.config.ts",
  ],
};
