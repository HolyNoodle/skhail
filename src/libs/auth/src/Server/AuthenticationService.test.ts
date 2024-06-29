/**
 * @group unit
 */
import {
  AuthenticationService,
  ClientRepository,
  ProtectorClaims,
} from "./AuthenticationService";
import * as KeyUtils from "../Shared/utils";
import { AuthenticationProvider, IExternalCredentials } from "../Shared";

export enum AppClaims {
  TEST = "test",
  TEST2 = "test2",
}

describe("AuthenticationService", () => {
  let repository: Record<keyof ClientRepository, jest.SpyInstance>;
  let state: { [id: string]: IExternalCredentials } = {};
  let network = {
    emit: jest.fn(),
  };
  let provider: AuthenticationProvider = {
    getType: jest.fn().mockReturnValue("test"),
    verifyToken: jest.fn().mockResolvedValue("testId"),
  };

  beforeEach(() => {
    jest.resetAllMocks();

    jest.useFakeTimers();
    jest.setSystemTime(new Date(2022, 0, 1, 0, 0, 0, 0));

    state = {};
    repository = {
      get: jest.fn((id) => Promise.resolve(state[id])),
      create: jest.fn((client) => {
        state[client.id] = client;

        return Promise.resolve();
      }),
      login: jest.fn(),
    };
  });

  it("Should instantiate AuthenticationService", () => {
    const service = new AuthenticationService<AppClaims>({
      repository: repository as any,
      authProviders: [provider],
      internalClients: [
        {
          id: "admin",
          claims: [ProtectorClaims.REGISTER_CLIENTS],
        },
      ],
      claims: {
        [AppClaims.TEST]: { default: true },
        [AppClaims.TEST2]: { default: true },
      },
      privateKey: "private key" as any,
    });

    expect(service).toBeInstanceOf(AuthenticationService);
  });

  describe("prepare", () => {
    it("Should register default claims", async () => {
      const service = new AuthenticationService<AppClaims>({
        repository: repository as any,
        authProviders: [provider],
        internalClients: [
          {
            id: "admin",
            claims: [ProtectorClaims.REGISTER_CLIENTS],
          },
        ],
        claims: {
          [AppClaims.TEST]: { default: true },
          [AppClaims.TEST2]: { default: true },
        },
        privateKey: "private key" as any,
      });

      await service.prepare();

      expect(service["defaultClaims"]).toStrictEqual(["test", "test2"]);
    });
  });

  describe("getKey", () => {
    it("Should return public key", async () => {
      const service = new AuthenticationService<AppClaims>({
        repository: repository as any,
        authProviders: [provider],
        internalClients: [
          {
            id: "admin",
            claims: [ProtectorClaims.REGISTER_CLIENTS],
          },
        ],
        claims: {
          [AppClaims.TEST]: { default: true },
          [AppClaims.TEST2]: { default: true },
        },
        privateKey: "private key" as any,
      });

      const exportKey = jest
        .spyOn(KeyUtils, "exportKey")
        .mockReturnValue("public test key" as any);

      const publicKey = await service.getKey();

      expect(publicKey).toBe("public test key");

      expect(exportKey).toHaveBeenCalledTimes(1);
      expect(exportKey).toHaveBeenCalledWith("private key");
    });
  });

  describe("login", () => {
    it("Should login", async () => {
      const service = new AuthenticationService<AppClaims>({
        repository: repository as any,
        authProviders: [provider],
        internalClients: [
          {
            id: "admin",
            claims: [ProtectorClaims.REGISTER_CLIENTS],
          },
        ],
        claims: {
          [AppClaims.TEST]: { default: true },
          [AppClaims.TEST2]: { default: true },
        },
        privateKey: "private key" as any,
      });

      service.setNetwork(network as any);

      const expectedToken = "test token";

      repository.get.mockResolvedValue({
        id: "testId",
        claims: ["test claim"],
      } as any);

      (provider.verifyToken as any).mockResolvedValue("testId");

      const sign = jest
        .spyOn(KeyUtils, "sign")
        .mockResolvedValue(expectedToken as any);

      const token = await service.login({
        provider: provider.getType(),
        token: "signed token",
      });

      expect(token).toBe(expectedToken);

      expect(provider.verifyToken).toHaveBeenCalledTimes(1);
      expect(provider.verifyToken).toHaveBeenCalledWith("signed token");

      expect(sign).toHaveBeenCalledTimes(1);
      expect(sign).toHaveBeenCalledWith(
        { claims: ["test claim"], id: "testId" },
        "private key",
        3600
      );
      expect(network.emit).toHaveBeenCalledTimes(1);
      expect(network.emit).toHaveBeenCalledWith("login", ["testId"]);
    });

    it("Should not login when client id does not exists", async () => {
      (repository as any)["create"] = undefined;
      const service = new AuthenticationService<AppClaims>({
        repository: repository as any,
        authProviders: [provider],
        internalClients: [
          {
            id: "admin",
            claims: [ProtectorClaims.REGISTER_CLIENTS],
          },
        ],
        claims: {
          [AppClaims.TEST]: { default: true },
          [AppClaims.TEST2]: { default: true },
        },
        privateKey: "private key" as any,
      });

      service.setNetwork(network as any);

      const expectedToken = "test token";
      const expectedKey = { key: "test" };

      repository.get.mockResolvedValue(undefined as any);

      const readKey = jest
        .spyOn(KeyUtils, "readKey")
        .mockResolvedValue(expectedKey as any);
      const verify = jest
        .spyOn(KeyUtils, "verify")
        .mockResolvedValue(undefined as any);
      const sign = jest
        .spyOn(KeyUtils, "sign")
        .mockResolvedValue(expectedToken as any);

      await expect(
        service.login({ provider: provider.getType(), token: "signed token" })
      ).rejects.toThrow("Wrong credentials");

      expect(readKey).toHaveBeenCalledTimes(0);
      expect(verify).toHaveBeenCalledTimes(0);
      expect(sign).toHaveBeenCalledTimes(0);
      expect(network.emit).toHaveBeenCalledTimes(0);
    });

    it("Should create and login when create function is provided", async () => {
      const service = new AuthenticationService<AppClaims>({
        repository: repository as any,
        authProviders: [provider],
        internalClients: [
          {
            id: "admin",
            claims: [ProtectorClaims.REGISTER_CLIENTS],
          },
        ],
        claims: {
          [AppClaims.TEST]: { default: true },
          [AppClaims.TEST2]: { default: true },
        },
        privateKey: "private key" as any,
      });

      service.setNetwork(network as any);

      const expectedToken = "test token";

      (provider.verifyToken as any).mockResolvedValue("testId2");

      repository.create.mockResolvedValue({
        id: "testId2",
        claims: ["test claim"],
      } as any);
      repository.get.mockResolvedValue(undefined as any);

      const sign = jest
        .spyOn(KeyUtils, "sign")
        .mockResolvedValue(expectedToken as any);

      await service.login({
        provider: provider.getType(),
        token: "signed token",
      });

      expect(sign).toHaveBeenCalledTimes(1);
      expect(sign).toHaveBeenCalledWith(
        { claims: ["test claim"], id: "testId2" },
        "private key",
        3600
      );
    });

    it("Should create and throw when create function is provided and create fails to retrieve data", async () => {
      const service = new AuthenticationService<AppClaims>({
        repository: repository as any,
        authProviders: [provider],
        internalClients: [
          {
            id: "admin",
            claims: [ProtectorClaims.REGISTER_CLIENTS],
          },
        ],
        claims: {
          [AppClaims.TEST]: { default: true },
          [AppClaims.TEST2]: { default: true },
        },
        privateKey: "private key" as any,
      });

      service.setNetwork(network as any);

      (provider.verifyToken as any).mockResolvedValue("testId2");

      repository.create.mockResolvedValue(undefined);
      repository.get.mockResolvedValue(undefined as any);

      await expect(
        service.login({
          provider: provider.getType(),
          token: "signed token",
        })
      ).rejects.toThrow("Newly created credentials not found");
    });

    it("Should throw hen provider is not found", async () => {
      const service = new AuthenticationService<AppClaims>({
        repository: repository as any,
        authProviders: [provider],
        internalClients: [
          {
            id: "admin",
            claims: [ProtectorClaims.REGISTER_CLIENTS],
          },
        ],
        claims: {
          [AppClaims.TEST]: { default: true },
          [AppClaims.TEST2]: { default: true },
        },
        privateKey: "private key" as any,
      });

      service.setNetwork(network as any);

      await expect(
        service.login({
          provider: "none",
          token: "signed token",
        })
      ).rejects.toThrow("Unknown provider");
    });
  });

  describe("getSubProcessToken", () => {
    it("Should return sub process token", async () => {
      // Arrange
      const service = new AuthenticationService<AppClaims>({
        repository: repository as any,
        authProviders: [provider],
        internalClients: [
          {
            id: "admin",
            claims: [ProtectorClaims.REGISTER_CLIENTS],
          },
        ],
        claims: {
          [AppClaims.TEST]: { default: true },
          [AppClaims.TEST2]: { default: true },
        },
        privateKey: "private key" as any,
      });
      const authInfo = {
        id: "auth id",
        claims: ["added up", "other one", "thrid one"],
      } as any;
      const expectedToken = "test token";
      const sign = jest
        .spyOn(KeyUtils, "sign")
        .mockResolvedValue(expectedToken);

      service["context"] = {
        data: { authInfo },
      } as any;

      // Act
      const token = await service.getSubProcessToken(["added up", "other one"]);

      // Assert
      expect(token).toBe(expectedToken);

      expect(sign).toHaveBeenCalledTimes(1);
      expect(sign).toHaveBeenCalledWith(
        { claims: ["added up", "other one"], id: "auth id" },
        "private key",
        3600
      );
    });

    it("Should not return sub process token when claims are not valid", async () => {
      // Arrange
      const service = new AuthenticationService<AppClaims>({
        repository: repository as any,
        authProviders: [provider],
        internalClients: [
          {
            id: "admin",
            claims: [ProtectorClaims.REGISTER_CLIENTS],
          },
        ],
        claims: {
          [AppClaims.TEST]: { default: true },
          [AppClaims.TEST2]: { default: true },
        },
        privateKey: "private key" as any,
      });
      const authInfo = {
        id: "auth id",
        claims: ["added up", "other one", "thrid one"],
      } as any;
      const expectedToken = "test token";
      const sign = jest
        .spyOn(KeyUtils, "sign")
        .mockResolvedValue(expectedToken);

      service["context"] = {
        data: { authInfo },
      } as any;

      // Act
      await expect(
        service.getSubProcessToken(["added up", "other one", "fourth one"])
      ).rejects.toThrow("You don't have permission to perform this action");

      // Assert
      expect(sign).toHaveBeenCalledTimes(0);
    });

    it("Should not return sub process token when auth info is not provided", async () => {
      // Arrange
      const service = new AuthenticationService<AppClaims>({
        repository: repository as any,
        authProviders: [provider],
        internalClients: [
          {
            id: "admin",
            claims: [ProtectorClaims.REGISTER_CLIENTS],
          },
        ],
        claims: {
          [AppClaims.TEST]: { default: true },
          [AppClaims.TEST2]: { default: true },
        },
        privateKey: "private key" as any,
      });
      const expectedToken = "test token";
      const sign = jest
        .spyOn(KeyUtils, "sign")
        .mockResolvedValue(expectedToken);

      // Act
      await expect(
        service.getSubProcessToken(["added up", "other one", "fourth one"])
      ).rejects.toThrow("You must be logged in to perform this action");

      // Assert
      expect(sign).toHaveBeenCalledTimes(0);
    });
  });
});
