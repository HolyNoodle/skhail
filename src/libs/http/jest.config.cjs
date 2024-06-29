/** @type {import('ts-jest').InitialOptionsTsJest} */

const defaultConfiguration = require("@skhail/config-jest");

module.exports = {
  ...defaultConfiguration,
  verbose: true,
  collectCoverageFrom: [
    "./src/**/*",
    "!./src/client.ts",
    "!./src/server.ts",
    "!./src/classes/client/IHTTPService.ts",
    "!./src/classes/client/IWebSocketService.ts",
    "!./src/classes/client/IAPIService.ts",
    "!./src/types.ts",
  ],
};
