/**
 * @group integration
 */
import { SkhailError, ISkhailClient, ISkhailServer } from "@skhail/core";

import {
  ProtectorContext,
  AuthenticationProvider,
  ClientAuthProvider,
  AuthClient,
} from "./client";
import { authProviderTestRunner } from "./auth.test.runner";

SkhailError.stack = true;

class MockAuthProvider implements AuthenticationProvider {
  getType() {
    return "test";
  }

  async verifyToken(token: string) {
    return token.split("_")[1];
  }
}

class MockClientAuthProvider implements ClientAuthProvider {
  getType() {
    return "test";
  }

  async login(client: ISkhailClient<ProtectorContext>): Promise<string> {
    return "token_" + (client as any)["id"];
  }
}

describe("Auth integration", () => {
  const testRunner = authProviderTestRunner(
    async () => new MockAuthProvider(),
    async (
      id: string,
      server: ISkhailServer<ProtectorContext>,
      token?: string
    ) => {
      const client = new AuthClient(server.getClient(), {
        providers: [new MockClientAuthProvider()],
        token,
      });

      (client as any)["id"] = id;

      return client;
    }
  );

  beforeEach(testRunner.prepare);
  afterEach(testRunner.cleanup);

  testRunner.run();
});
