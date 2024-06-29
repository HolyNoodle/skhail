/**
 * @group integration
 */

import {
  SkhailService,
  ISkhailServer,
  SkhailError,
  Constructor,
} from "@skhail/core";

import { ProtectorContext, KeyUtils } from "@skhail/auth";

import { authProviderTestRunner } from "@skhail/auth/dist/auth.test.runner";

import {
  SkhailAuthenticationService,
  SkhailClientRepository,
} from "./Server/Service";
import { SkhailAuthClient } from "./Client/SkhailAuthClient";
import { IInternalCredentials, SkhailAuthProvider } from "./server";

let skhailState: { [id: string]: IInternalCredentials } = {};
const skhailRepository: SkhailClientRepository = {
  get: async (id) => {
    return skhailState[id];
  },
  create: async (client) => {
    skhailState[client.id] = client;
  },
  delete: async (id) => {
    delete skhailState[id];
  },
};

let privateKey: KeyUtils.Key;

const getPrivateKey = async () => {
  if (!privateKey) {
    privateKey = await KeyUtils.createNewPrivateKey(
      KeyUtils.createNewKeyStore(),
      "re test test"
    );
  }

  return privateKey;
};

describe("Auth integration", () => {
  let adminClient: SkhailAuthClient<ProtectorContext>;
  let userClient: SkhailAuthClient<ProtectorContext>;
  let server: ISkhailServer<ProtectorContext>;

  const testRunner = authProviderTestRunner(
    async () => {
      const privateKey = await getPrivateKey();

      return new SkhailAuthProvider({
        privateKey,
      });
    },
    async (
      id: string,
      server: ISkhailServer<ProtectorContext>,
      token?: string
    ) => {
      const privateKey = await getPrivateKey();

      const client = new SkhailAuthClient(
        server.getClient(),
        token
          ? { id, token }
          : {
              id,
              privateKey,
            }
      );

      return client;
    },
    async () => {
      const privateKey = await getPrivateKey();

      return [
        new SkhailAuthenticationService({
          privateKey,
          repository: skhailRepository,
          internalClients: [
            {
              id: "client1",
              publicKey: KeyUtils.exportKey(privateKey),
            },
          ],
        }),
      ] as SkhailService<ProtectorContext>[];
    }
  );

  beforeEach(async () => {
    skhailState = {};
    const {
      adminClient: admin,
      userClient: user,
      otherClient,
      server: skhailServer,
    } = await testRunner.prepare();

    adminClient = admin as SkhailAuthClient<ProtectorContext>;
    userClient = user as SkhailAuthClient<ProtectorContext>;
    server = skhailServer;

    await userClient.register();
    await (otherClient as SkhailAuthClient<ProtectorContext>).register();
  });
  afterEach(async () => {
    await testRunner.cleanup();
    skhailState = {};
  });

  testRunner.run();

  it("Should fail registering twice", async () => {
    let error;
    try {
      await adminClient.register();
    } catch (e: any) {
      error = e;
    }

    expect(error).toBeDefined();
    expect(error).toBeInstanceOf(SkhailError);
    expect(error.toObject()).toStrictEqual({
      name: "denied",
      details: {
        method: "register",
        service: "InternalAuthenticationService",
      },
      message: "Id already exists",
      stack: undefined,
    });
  });

  it("Should not be able to unregister own client", async () => {
    await adminClient.login();

    const [id] = await adminClient.getClientInfo();

    let error;
    try {
      await adminClient.get(SkhailAuthenticationService).unregister({ id });
    } catch (e: any) {
      error = e;
    }

    expect(error).toBeDefined();
    expect(error).toBeInstanceOf(SkhailError);
    expect(error.toObject()).toStrictEqual({
      name: "denied",
      details: {
        method: "unregister",
        service: "InternalAuthenticationService",
      },
      message: "Can't unregister your own credentials",
      stack: undefined,
    });
  });

  it("Should be able to unregister client", async () => {
    await adminClient.login();

    const [id] = await userClient.getClientInfo();

    await adminClient.get(SkhailAuthenticationService).unregister({ id });
  });

  it("Should get client from passphrase and access method", async () => {
    const passClient = new SkhailAuthClient(server.getClient(), {
      id: "client_pass",
      passphrase: "test",
    });

    await passClient.register();

    const newClient = new SkhailAuthClient(server.getClient(), {
      id: "client_pass",
      passphrase: "test",
    });

    await newClient.login();

    const result = await newClient
      .get(testRunner.ITestService)
      .list("test name");

    expect(result).toStrictEqual({
      name: "test name",
      userId: "obfuscatedId",
    });
  });
});
