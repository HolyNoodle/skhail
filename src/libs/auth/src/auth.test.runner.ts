import {
  ConsoleLogger,
  InMemoryEventEmitter,
  InMemoryQueue,
  LogLevel,
  SkhailError,
  SkhailService,
  SkhailServer,
  ISkhailServer,
} from "@skhail/core";

import {
  AuthenticationService,
  ClientRepository,
  ProtectorClaims,
  AuthMiddleware,
} from "./server";
import {
  AuthClient,
  AuthInfo,
  ProtectorContext,
  IAuthenticationService,
  KeyUtils,
  IExternalCredentials,
  AuthenticationProvider,
} from "./client";
import { createNewKeyStore, createNewPrivateKey } from "./Shared/utils";
import { v4 } from "uuid";

jest.mock("uuid");
enum AppClaims {
  CREATE = "create",
  LIST = "list",
}

const loginEvent = jest.fn();
const createdEvent = jest.fn();

interface AppContext extends ProtectorContext {}

abstract class ITestService extends SkhailService<AppContext> {
  static identifier = "TestService";

  abstract create(name: string): Promise<{ name: string }>;
  abstract list(name: string): Promise<{ name: string; userId: string }>;
  abstract method(name: string): Promise<{ name: string }>;
  abstract boolean(name: string): Promise<{ name: string }>;
}

abstract class ISecondayTestService extends SkhailService<AppContext> {
  static identifier = "SecondaryService";

  abstract list(name: string): Promise<{ name: string; userId: string }>;
}

class TestService extends ITestService {
  static middlewares = [
    new AuthMiddleware<ITestService>({
      create: [AppClaims.CREATE],
      list: [AppClaims.LIST],
      boolean: true,
      method: async (infos: AuthInfo, _args: any[]) => {
        if (infos.claims?.includes(AppClaims.CREATE)) {
          throw new Error("test error");
        }

        return Promise.resolve();
      },
    }),
  ];

  spy: any;

  async prepare(): Promise<void> {
    this.network.on(IAuthenticationService, "login", loginEvent);
    this.network.on(IAuthenticationService, "created", createdEvent);
  }

  async cleanup(): Promise<void> {
    this.network.off(IAuthenticationService, "login", loginEvent);
    this.network.off(IAuthenticationService, "created", createdEvent);
  }

  async create(name: string) {
    this.spy?.();

    return { name };
  }

  async list(name: string) {
    return this.network.get(ISecondayTestService).list(name);
  }

  async method(name: string) {
    return this.create(name);
  }

  async boolean(name: string) {
    return { name };
  }
}

class SecondayTestService extends ISecondayTestService {
  static middlewares = [
    new AuthMiddleware<ISecondayTestService>({
      list: [AppClaims.LIST],
    }),
  ];

  async list(name: string) {
    const userId = this.context!.data!.authInfo!.id;

    return { name, userId };
  }
}

SkhailError.stack = true;

export const authProviderTestRunner = (
  generateProvider: () => Promise<AuthenticationProvider>,
  generateClient: (
    id: string,
    server: ISkhailServer<ProtectorContext>,
    token?: string
  ) => Promise<AuthClient<ProtectorContext>>,
  servicesGenerator?: () => Promise<SkhailService<ProtectorContext>[]>
) => {
  let provider: AuthenticationProvider;

  let server: SkhailServer<AppContext>;
  let adminClient: AuthClient<AppContext>;
  let userClient: AuthClient<AppContext>;
  let otherClient: AuthClient<AppContext>;

  let serverKey: KeyUtils.Key;
  let authenticationService: AuthenticationService<AppClaims>;
  let testService: TestService;

  return {
    ITestService,
    prepare: async () => {
      provider = await generateProvider();

      jest.resetAllMocks();

      jest.useFakeTimers();
      jest.setSystemTime(new Date("2023-01-01T00:00:00.000Z"));

      (v4 as any as jest.SpyInstance).mockImplementation(() => `obfuscatedId`);

      const store = createNewKeyStore();

      serverKey = await createNewPrivateKey(store);

      const state: {
        [provider: string]: { [id: string]: IExternalCredentials };
      } = {};
      const repository: ClientRepository = {
        get: async (provider, providerId) => state[provider]?.[providerId],
        create: async (provider, providerId, credentials) => {
          if (!state[provider]) {
            state[provider] = {};
          }

          state[provider][providerId] = credentials;

          return credentials;
        },
      };

      authenticationService = new AuthenticationService<AppClaims>({
        privateKey: serverKey,
        repository,
        authProviders: [provider],
        internalClients: [
          {
            id: "client1",
            claims: [
              ProtectorClaims.REGISTER_CLIENTS,
              AppClaims.CREATE,
              AppClaims.LIST,
            ],
          },
        ],
        claims: {
          [AppClaims.CREATE]: {
            default: false,
          },
          [AppClaims.LIST]: {
            default: true,
          },
        },
      });

      testService = new TestService();
      server = new SkhailServer({
        services: [
          authenticationService,
          testService,
          new SecondayTestService(),
          ...(servicesGenerator ? await servicesGenerator() : ([] as any)),
        ],
        logger: new ConsoleLogger([LogLevel.ERROR]),
        queue: new InMemoryQueue(),
        event: new InMemoryEventEmitter(),
      });

      await server.start();

      adminClient = await generateClient("client1", server);
      userClient = await generateClient("client2", server);
      otherClient = await generateClient("other-client-list", server);

      return {
        adminClient,
        userClient,
        otherClient,
        server,
      };
    },
    cleanup: async () => {
      await server?.stop();
    },
    run: () => {
      it("Should fail calling list when not registered", async () => {
        let error;
        try {
          await userClient.get(ITestService).list("test name");
        } catch (e: any) {
          error = e;
        }

        expect(error).toBeDefined();
        expect(error).toBeInstanceOf(SkhailError);
        expect(error.toObject()).toStrictEqual({
          name: "denied",
          details: {
            method: "list",
            service: "TestService",
            tid: expect.any(String),
          },
          message: "Insufficient user privileges",
          stack: undefined,
        });
      });

      it("Should fail accessing list when not loged in", async () => {
        let error;
        try {
          await userClient.get(ITestService).list("test name");
        } catch (e: any) {
          error = e;
        }

        expect(error).toBeDefined();
        expect(error).toBeInstanceOf(SkhailError);
        expect(error.toObject()).toStrictEqual({
          name: "denied",
          details: {
            method: "list",
            service: "TestService",
            tid: expect.any(String),
          },
          message: "Insufficient user privileges",
          stack: undefined,
        });
      });

      it("Should access list and auth info through nested calls", async () => {
        await userClient.login(provider.getType());

        const result = await userClient.get(ITestService).list("test name");

        // External clients ids are obfuscated
        expect(result).toStrictEqual({
          name: "test name",
          userId: "obfuscatedId",
        });
        expect(result.userId).toBeDefined();
      });

      it("Should access boolean without registering or login", async () => {
        const result = await userClient.get(ITestService).boolean("test name");

        expect(result).toStrictEqual({ name: "test name" });
      });

      it("Should access method as admin", async () => {
        loginEvent.mockReset();
        await adminClient.login(provider.getType());

        const result = await adminClient.get(ITestService).create("test name");

        expect(result).toStrictEqual({ name: "test name" });
        expect(loginEvent).toHaveBeenCalledTimes(1);
      });

      it("Should access method only once", async () => {
        const spy = jest.fn();
        await adminClient.login(provider.getType());

        testService.spy = spy;

        const result = await adminClient.get(ITestService).create("test name");

        expect(result).toStrictEqual({ name: "test name" });
        expect(spy).toHaveBeenCalledTimes(1);
      });

      it("Should not access method when not have the claim", async () => {
        createdEvent.mockReset();
        await userClient.login(provider.getType());

        let error;
        try {
          await userClient.get(TestService).create("test name");
        } catch (e: any) {
          error = e;
        }

        expect(error).toBeDefined();
        expect(error).toBeInstanceOf(SkhailError);
        expect(error.toObject()).toStrictEqual({
          name: "denied",
          details: {
            method: "create",
            service: "TestService",
            tid: expect.any(String),
          },
          message: "Insufficient user privileges",
          stack: undefined,
        });
        expect(createdEvent).toHaveBeenCalledTimes(1);
      });

      it("Should get sub process token", async () => {
        await adminClient.login(provider.getType());

        const result = await adminClient
          .get(IAuthenticationService)
          .getSubProcessToken([AppClaims.LIST], 3600 * 24 * 30 * 12);

        expect(result).toBeDefined();
        // Internal clients ids are not obfuscated
        expect(KeyUtils.decode(result)).toStrictEqual({
          claims: ["list"],
          exp: 1703635200,
          iat: 1672531200,
          id: "client1",
        });
      });

      it("Should get client from token and access method", async () => {
        let token: string | undefined = undefined;

        adminClient.on("login", (t: string) => {
          token = t;
        });

        await adminClient.login(provider.getType());

        expect(token).toBeDefined();

        const newClient = await generateClient("client1", server, token!);

        const result = await newClient.get(ITestService).list("test name");

        expect(result).toStrictEqual({ name: "test name", userId: "client1" });
      });

      it("Should access method as other user", async () => {
        await otherClient.login(provider.getType());

        const result = await otherClient.get(ITestService).list("test name");

        expect(result).toStrictEqual({
          name: "test name",
          userId: "obfuscatedId",
        });
      });
    },
  };
};
