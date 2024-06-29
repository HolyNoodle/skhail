/**
 * @group integration
 */

import { ISkhailServer } from "@skhail/core";

import { ProtectorContext } from "@skhail/auth";

import { authProviderTestRunner } from "@skhail/auth/dist/auth.test.runner";

import { GoogleAuthProvider } from "./server";
import { GoogleAuthClient } from "./client";

describe("Google Auth integration", () => {
  const testRunner = authProviderTestRunner(
    async () => {
      return new GoogleAuthProvider({
        clientId: "MY google ID",
        client: {
          verifyIdToken: async ({ idToken }: any) => ({
            getPayload: () => {
              return {
                sub: idToken.split("_")[0],
              };
            },
          }),
        } as any,
      });
    },
    async (
      id: string,
      server: ISkhailServer<ProtectorContext>,
      token?: string
    ) => {
      const client = new GoogleAuthClient(server.getClient(), {
        idToken: id + "_token",
        token,
      });

      return client;
    }
  );

  beforeEach(testRunner.prepare);
  afterEach(testRunner.cleanup);

  testRunner.run();
});
