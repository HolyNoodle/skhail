/**
 * @group unit
 */
import { KeyUtils } from "@skhail/auth";
import { SkhailAuthenticationService, SkhailClientRepository } from "./Service";
import { ProtectorClaims } from "@skhail/auth/dist/server";
import { IInternalCredentials } from "../Shared";

export enum AppClaims {
  TEST = "test",
  TEST2 = "test2",
}

describe("SkhailAuthenticationService", () => {
  let repository: Record<keyof SkhailClientRepository, jest.SpyInstance>;
  let state: { [id: string]: IInternalCredentials } = {};
  let network = {
    emit: jest.fn(),
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
      delete: jest.fn((id) => {
        delete state[id];

        return Promise.resolve();
      }),
    };
  });

  it("Should instantiate SkhailAuthenticationService", () => {
    const service = new SkhailAuthenticationService({
      repository: repository as any,
      internalClients: [
        {
          id: "admin",
          publicKey: "public",
        },
      ],
      privateKey: "private key" as any,
    });

    expect(service).toBeInstanceOf(SkhailAuthenticationService);
  });

  describe("unregister", () => {
    it("Should delete client info", async () => {
      const service = new SkhailAuthenticationService({
        repository: repository as any,
        internalClients: [
          {
            id: "admin",
            publicKey: "public",
          },
        ],
        privateKey: "private key" as any,
      });
      service.setNetwork(network as any);

      repository.delete.mockResolvedValue(undefined);

      service["context"] = {
        data: {
          token: "test token",
          authInfo: { id: "test id other", claims: [] },
        },
      } as any;

      await service.unregister({ id: "test id" });

      expect(repository.delete).toHaveBeenCalledTimes(1);
      expect(repository.delete).toHaveBeenCalledWith("test id");
      expect(network.emit).toHaveBeenCalledTimes(1);
      expect(network.emit).toHaveBeenCalledWith("deleted", ["test id"]);
    });

    it("Should not delete client info when id is same as deleted", async () => {
      const service = new SkhailAuthenticationService({
        repository: repository as any,
        internalClients: [
          {
            id: "admin",
            publicKey: "public",
          },
        ],
        privateKey: "private key" as any,
      });

      service["context"] = {
        data: {
          token: "test token",
          authInfo: { id: "test id", claims: [] },
        },
      } as any;
      service.setNetwork(network as any);

      await expect(service.unregister({ id: "test id" })).rejects.toThrow(
        "Can't unregister your own credentials"
      );

      expect(repository.delete).toHaveBeenCalledTimes(0);
      expect(network.emit).toHaveBeenCalledTimes(0);
    });

    it("Should not delete client info when no token", async () => {
      const service = new SkhailAuthenticationService({
        repository: repository as any,
        internalClients: [
          {
            id: "admin",
            publicKey: "public",
          },
        ],
        privateKey: "private key" as any,
      });
      service.setNetwork(network as any);

      const verify = jest
        .spyOn(KeyUtils, "verify")
        .mockResolvedValue({ id: "test id", claims: [] });

      await expect(service.unregister({ id: "test id" })).rejects.toThrow(
        "You must be logged in to perform this action"
      );

      expect(verify).toHaveBeenCalledTimes(0);
      expect(repository.delete).toHaveBeenCalledTimes(0);
      expect(network.emit).toHaveBeenCalledTimes(0);
    });
  });

  describe("register", () => {
    it("Should register admin", async () => {
      const service = new SkhailAuthenticationService({
        repository: repository as any,
        internalClients: [
          {
            id: "admin",
            publicKey: "public",
          },
        ],
        privateKey: "private key" as any,
      });
      service.setNetwork(network as any);

      service["context"] = {
        data: {
          authInfo: { adm: false, claims: [] },
        },
      } as any;

      await service.register({ id: "test id", publicKey: "public key" });

      expect(repository.get).toHaveBeenCalledTimes(1);
      expect(repository.get).toHaveBeenCalledWith("test id");

      expect(repository.create).toHaveBeenCalledTimes(1);
      expect(repository.create).toHaveBeenCalledWith({
        id: "test id",
        publicKey: "public key",
      });

      expect(network.emit).toHaveBeenCalledTimes(1);
      expect(network.emit).toHaveBeenCalledWith("created", ["test id"]);
    });

    it("Should not register client when id already exists", async () => {
      const service = new SkhailAuthenticationService({
        repository: repository as any,
        internalClients: [
          {
            id: "admin",
            publicKey: "public",
          },
        ],
        privateKey: "private key" as any,
      });

      service.setNetwork(network as any);

      service["context"] = {
        data: {
          authInfo: { adm: false, claims: [] },
        },
      } as any;

      state["test id"] = {
        claims: [],
      } as any;

      await expect(
        service.register({ id: "test id", publicKey: "public key" })
      ).rejects.toThrow("Id already exists");

      expect(repository.get).toHaveBeenCalledTimes(1);
      expect(repository.get).toHaveBeenCalledWith("test id");
      expect(network.emit).toHaveBeenCalledTimes(0);
    });

    it("Should register client", async () => {
      const service = new SkhailAuthenticationService({
        repository: repository as any,
        internalClients: [
          {
            id: "admin",
            publicKey: "public",
          },
        ],
        privateKey: "private key" as any,
      });
      service.setNetwork(network as any);

      service["context"] = {
        data: {
          authInfo: { adm: false, claims: [] },
        },
      } as any;

      state["test2"] = {} as any;

      await service.register({ id: "test id", publicKey: "public key" });

      expect(repository.get).toHaveBeenCalledTimes(1);
      expect(repository.get).toHaveBeenCalledWith("test id");

      expect(repository.create).toHaveBeenCalledWith({
        id: "test id",
        publicKey: "public key",
      });
      expect(network.emit).toHaveBeenCalledTimes(1);
      expect(network.emit).toHaveBeenCalledWith("created", ["test id"]);
    });

    it("Should fail registering when registration is disabled", async () => {
      const service = new SkhailAuthenticationService({
        internalClients: [
          {
            id: "admin",
            publicKey: "public",
          },
        ],
        privateKey: "private key" as any,
      });

      service["context"] = {
        data: {
          authInfo: { adm: false, claims: [] },
        },
      } as any;

      service.setNetwork(network as any);

      await expect(
        service.register({ id: "test id", publicKey: "public key" })
      ).rejects.toThrow("Registration is disabled");

      expect(repository.get).toHaveBeenCalledTimes(0);
      expect(repository.create).toHaveBeenCalledTimes(0);
      expect(network.emit).toHaveBeenCalledTimes(0);
    });

    it("Should register client when admin calls", async () => {
      const service = new SkhailAuthenticationService({
        repository: repository as any,
        internalClients: [
          {
            id: "admin",
            publicKey: "public",
          },
        ],
        privateKey: "private key" as any,
      });

      service["context"] = {
        data: { authInfo: { claims: [ProtectorClaims.REGISTER_CLIENTS] } },
      } as any;

      service.setNetwork(network as any);

      await service.register({ id: "test id", publicKey: "public key" });

      expect(repository.create).toHaveBeenCalledTimes(1);
      expect(repository.create).toHaveBeenCalledWith({
        id: "test id",
        publicKey: "public key",
      });
      expect(network.emit).toHaveBeenCalledTimes(1);
      expect(network.emit).toHaveBeenCalledWith("created", ["test id"]);
    });

    it("Should not register client when id is internal", async () => {
      const service = new SkhailAuthenticationService({
        repository: repository as any,
        internalClients: [
          {
            id: "admin",
            publicKey: "public",
          },
        ],
        privateKey: "private key" as any,
      });

      service["context"] = {
        data: {
          authInfo: { adm: false, claims: [] },
        },
      } as any;

      service["context"] = {
        data: { authInfo: { claims: [ProtectorClaims.REGISTER_CLIENTS] } },
      } as any;

      await expect(
        service.register({ id: "admin", publicKey: "public key" })
      ).rejects.toThrow("Id already exists");

      expect(repository.create).toHaveBeenCalledTimes(0);
    });
  });

  describe("login", () => {
    it("Should login", async () => {
      const service = new SkhailAuthenticationService({
        repository: repository as any,
        internalClients: [
          {
            id: "admin",
            publicKey: "public",
          },
        ],
        privateKey: "private key" as any,
      });

      service.setNetwork(network as any);

      const expectedToken = "test token";
      const expectedKey = { key: "test" };

      repository.get.mockResolvedValue({
        id: "test id",
        publicKey: "public key",
      } as any);

      const readKey = jest
        .spyOn(KeyUtils, "readKey")
        .mockResolvedValue(expectedKey as any);
      const verify = jest
        .spyOn(KeyUtils, "verify")
        .mockResolvedValue(undefined as any);
      const sign = jest
        .spyOn(KeyUtils, "sign")
        .mockResolvedValue(expectedToken as any);

      const token = await service.login({
        id: "test id",
        signedToken: "signed token",
      });

      expect(token).toBe(expectedToken);

      expect(readKey).toHaveBeenCalledTimes(1);
      expect(readKey).toHaveBeenCalledWith("public key");

      expect(verify).toHaveBeenCalledTimes(1);
      expect(verify).toHaveBeenCalledWith("signed token", expectedKey);

      expect(sign).toHaveBeenCalledTimes(1);
      expect(sign).toHaveBeenCalledWith({ id: "test id" }, "private key", 5000);
    });

    it("Should not login when client id does not exists", async () => {
      const service = new SkhailAuthenticationService({
        repository: repository as any,
        internalClients: [
          {
            id: "admin",
            publicKey: "public",
          },
        ],
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
        service.login({ id: "test id", signedToken: "signed token" })
      ).rejects.toThrow("Wrong credentials");

      expect(readKey).toHaveBeenCalledTimes(0);
      expect(verify).toHaveBeenCalledTimes(0);
      expect(sign).toHaveBeenCalledTimes(0);
      expect(network.emit).toHaveBeenCalledTimes(0);
    });
  });
});
