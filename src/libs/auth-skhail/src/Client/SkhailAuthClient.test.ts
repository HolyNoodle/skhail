/**
 * @group unit
 */
import { KeyUtils } from "@skhail/auth";
import { ISkhailAuthenticationService } from "../Shared";
import { SkhailAuthClient } from "./SkhailAuthClient";

describe("AuthClient", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("Should instantiate AuthClient", () => {
    const skhailClient = { skhail: "client" };
    const client = new SkhailAuthClient(skhailClient as any, {
      id: "test id",
      privateKey: "private key" as any,
    });

    expect(client).toBeInstanceOf(SkhailAuthClient);
  });

  describe("register", () => {
    it("Should call skhail client authentication register with id and public key", async () => {
      const service = { register: jest.fn() };
      const skhailClient = {
        skhail: "client",
        get: jest.fn().mockReturnValue(service),
      };
      const exportKey = jest
        .spyOn(KeyUtils, "exportKey")
        .mockReturnValue("public key" as any);
      const client = new SkhailAuthClient(skhailClient as any, {
        id: "test id",
        privateKey: "private key" as any,
      });

      await client.register();

      expect(exportKey).toHaveBeenCalledTimes(1);
      expect(exportKey).toHaveBeenCalledWith("private key");

      expect(skhailClient.get).toHaveBeenCalledTimes(1);
      expect(skhailClient.get).toHaveBeenCalledWith(
        ISkhailAuthenticationService,
        undefined,
        undefined
      );

      expect(service.register).toHaveBeenCalledTimes(1);
      expect(service.register).toHaveBeenCalledWith({
        id: "test id",
        publicKey: "public key",
      });
    });

    it("Should throw error when trying to register without private key", async () => {
      const service = { register: jest.fn() };
      const skhailClient = {
        skhail: "client",
        get: jest.fn().mockReturnValue(service),
      };
      const client = new SkhailAuthClient(skhailClient as any, {
        id: "test id",
        token: "test token",
      });

      let error;
      try {
        await client.register();
      } catch (e: any) {
        error = e;
      }

      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe("No private key provided can't register");
    });

    it("Should set private key on client when using passphrase", async () => {
      const store = { prop: "store" };
      const createStore = jest
        .spyOn(KeyUtils, "createNewKeyStore")
        .mockReturnValue(store as any);
      const createKey = jest
        .spyOn(KeyUtils, "createNewPrivateKey")
        .mockResolvedValue("private key" as any);

      jest.spyOn(KeyUtils, "exportKey").mockReturnValue("public key" as any);

      const service = { register: jest.fn() };
      const skhailClient = {
        skhail: "client",
        get: jest.fn().mockReturnValue(service),
      };
      const client = new SkhailAuthClient(skhailClient as any, {
        id: "test",
        passphrase: "this is a password",
      });

      await client.register();

      expect(createStore).toHaveBeenCalledTimes(1);
      expect(createStore).toHaveBeenCalledWith();
      expect(createKey).toHaveBeenCalledTimes(1);
      expect(createKey).toHaveBeenCalledWith(store, "this is a password");
    });

    it("Should not regenerate private key on client when using passphrase and calling register twice", async () => {
      const store = { prop: "store" };
      const createStore = jest
        .spyOn(KeyUtils, "createNewKeyStore")
        .mockReturnValue(store as any);
      const createKey = jest
        .spyOn(KeyUtils, "createNewPrivateKey")
        .mockResolvedValue("private key" as any);

      jest.spyOn(KeyUtils, "exportKey").mockReturnValue("public key" as any);

      const service = { register: jest.fn() };
      const skhailClient = {
        skhail: "client",
        get: jest.fn().mockReturnValue(service),
      };
      const client = new SkhailAuthClient(skhailClient as any, {
        id: "test",
        passphrase: "this is a password",
      });

      await client.register();
      await client.register();

      expect(createStore).toHaveBeenCalledTimes(1);
      expect(createStore).toHaveBeenCalledWith();
      expect(createKey).toHaveBeenCalledTimes(1);
      expect(createKey).toHaveBeenCalledWith(store, "this is a password");
    });
  });

  describe("login", () => {
    it("Should call skhail client authentication login with sign token", async () => {
      const skhailService = { login: jest.fn() };
      const authService = { login: jest.fn() };

      const rng = jest.spyOn(global.Math, "random").mockReturnValueOnce(123);
      const skhailClient = {
        skhail: "client",
        get: jest
          .fn()
          .mockReturnValueOnce(skhailService)
          .mockReturnValueOnce(authService),
      };
      const sign = jest
        .spyOn(KeyUtils, "sign")
        .mockReturnValue("signed token" as any);

      const client = new SkhailAuthClient(skhailClient as any, {
        id: "test id",
        privateKey: "private key" as any,
      });

      await client.login();

      expect(sign).toHaveBeenCalledTimes(1);
      expect(sign).toHaveBeenCalledWith({ rng: 123 }, "private key", 5);

      expect(skhailClient.get).toHaveBeenCalledTimes(2);
      expect(skhailClient.get).toHaveBeenNthCalledWith(
        1,
        ISkhailAuthenticationService,
        undefined,
        undefined
      );

      expect(rng).toHaveBeenCalledTimes(1);
      expect(rng).toHaveBeenCalledWith();

      expect(skhailService.login).toHaveBeenCalledTimes(1);
      expect(skhailService.login).toHaveBeenCalledWith({
        id: "test id",
        signedToken: "signed token",
      });

      expect(authService.login).toHaveBeenCalledTimes(1);
      expect(authService.login).toHaveBeenCalledWith({
        provider: "skhail",
        token: undefined,
      });

      rng.mockRestore();
    });

    it("Should intanciate client from token and be able to access without login", async () => {
      const service = { register: jest.fn() };
      const skhailClient = {
        skhail: "client",
        get: jest.fn().mockReturnValue(service),
      };
      const client = new SkhailAuthClient(skhailClient as any, {
        id: "test id",
        token: "test token",
      });

      await client.get(ISkhailAuthenticationService);

      expect(skhailClient.get).toHaveBeenCalledTimes(1);
      expect(skhailClient.get).toHaveBeenCalledWith(
        ISkhailAuthenticationService,
        { token: "test token" },
        undefined
      );
    });

    it("Should throw error when trying to login without private key", async () => {
      const service = { register: jest.fn() };
      const skhailClient = {
        skhail: "client",
        get: jest.fn().mockReturnValue(service),
      };
      const client = new SkhailAuthClient(
        skhailClient as any,
        {
          id: "test id",
        } as any
      );

      let error;
      try {
        await client.login();
      } catch (e: any) {
        error = e;
      }

      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe(
        "No token or private key provided can't login"
      );
    });

    it("Should set private key on client when using passphrase", async () => {
      const store = { prop: "store" };
      const createStore = jest
        .spyOn(KeyUtils, "createNewKeyStore")
        .mockReturnValue(store as any);
      const createKey = jest
        .spyOn(KeyUtils, "createNewPrivateKey")
        .mockResolvedValue("private key" as any);

      jest.spyOn(KeyUtils, "sign").mockReturnValue("signed token" as any);

      const service = { login: jest.fn().mockResolvedValue("test token") };

      const skhailClient = {
        skhail: "client",
        get: jest.fn().mockReturnValue(service),
      };
      const client = new SkhailAuthClient(skhailClient as any, {
        id: "test",
        passphrase: "this is a password",
      });

      await client.login();

      expect(createStore).toHaveBeenCalledTimes(1);
      expect(createStore).toHaveBeenCalledWith();
      expect(createKey).toHaveBeenCalledTimes(1);
      expect(createKey).toHaveBeenCalledWith(store, "this is a password");
    });
  });

  describe("get", () => {
    it("Should call skhail client get with context", async () => {
      const service = { register: jest.fn() };
      const skhailClient = {
        skhail: "client",
        get: jest.fn().mockReturnValue(service),
      };
      const client = new SkhailAuthClient(skhailClient as any, {
        id: "test id",
        privateKey: "private key" as any,
      });

      client["token"] = "test token";
      client.get(ISkhailAuthenticationService);

      expect(skhailClient.get).toHaveBeenCalledTimes(1);
      expect(skhailClient.get).toHaveBeenCalledWith(
        ISkhailAuthenticationService,
        { token: "test token" },
        undefined
      );
    });

    it("Should call skhail client get with custom context", async () => {
      const service = { register: jest.fn() };
      const skhailClient = {
        skhail: "client",
        get: jest.fn().mockReturnValue(service),
      };
      const client = new SkhailAuthClient(skhailClient as any, {
        id: "test id",
        privateKey: "private key" as any,
      });

      await client.get(ISkhailAuthenticationService, {
        other: "context",
      } as any);

      expect(skhailClient.get).toHaveBeenCalledTimes(1);
      expect(skhailClient.get).toHaveBeenCalledWith(
        ISkhailAuthenticationService,
        { other: "context" },
        undefined
      );
    });
  });

  describe("logout", () => {
    it("Should reset token", async () => {
      const skhailClient = {
        skhail: "client",
      };
      const client = new SkhailAuthClient(skhailClient as any, {
        id: "test id",
        privateKey: "private key" as any,
      });

      client["token"] = "test token";

      await client.logout();

      expect(client["token"]).toBeUndefined();
    });

    it("Should emit event", async () => {
      const skhailClient = {
        skhail: "client",
      };
      const client = new SkhailAuthClient(skhailClient as any, {
        id: "test id",
        privateKey: "private key" as any,
      });

      client["token"] = "test token";

      const spy = jest.fn();
      client.on("logout", spy);

      await client.logout();

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe("getClientInfo", () => {
    it("Should return id and public key", async () => {
      const skhailClient = {
        skhail: "client",
      };
      const client = new SkhailAuthClient(skhailClient as any, {
        id: "test id",
        privateKey: "private key" as any,
      });

      const exportKey = jest
        .spyOn(KeyUtils, "exportKey")
        .mockReturnValue("public key" as any);

      const result = await client.getClientInfo();

      expect(exportKey).toHaveBeenCalledTimes(1);
      expect(exportKey).toHaveBeenCalledWith("private key");

      expect(result).toStrictEqual(["test id", "public key"]);
    });

    it("Should return undefined when no private key provided", async () => {
      const decodeSpy = jest.spyOn(KeyUtils, "decode").mockReturnValue({
        id: "auth info",
      });
      const skhailClient = {
        skhail: "client",
      };
      const client = new SkhailAuthClient(skhailClient as any, {
        id: "test id",
        token: "test token",
      });

      const info = await client.getClientInfo();

      expect(info).toStrictEqual(["test id", undefined]);
      expect(decodeSpy).toHaveBeenCalledTimes(0);
    });

    it("Should return public key on client when using passphrase", async () => {
      const store = { prop: "store" };
      const createStore = jest
        .spyOn(KeyUtils, "createNewKeyStore")
        .mockReturnValue(store as any);
      const createKey = jest
        .spyOn(KeyUtils, "createNewPrivateKey")
        .mockResolvedValue("private key" as any);

      jest.spyOn(KeyUtils, "exportKey").mockReturnValue("public key" as any);

      const skhailClient = { skhail: "client" };
      const client = new SkhailAuthClient(skhailClient as any, {
        id: "test",
        passphrase: "this is a password",
      });

      const info = await client.getClientInfo();

      expect(info).toStrictEqual(["test", "public key"]);

      expect(createStore).toHaveBeenCalledTimes(1);
      expect(createStore).toHaveBeenCalledWith();
      expect(createKey).toHaveBeenCalledTimes(1);
      expect(createKey).toHaveBeenCalledWith(store, "this is a password");
    });
  });

  describe("start", () => {
    it("Should call client start", async () => {
      const skhailClient = {
        skhail: "client",
        start: jest.fn(),
      };
      const client = new SkhailAuthClient(skhailClient as any, {
        id: "test id",
        privateKey: "private key" as any,
      });

      await client.start();

      expect(skhailClient.start).toHaveBeenCalledTimes(1);
      expect(skhailClient.start).toHaveBeenCalledWith();
    });
  });

  describe("stop", () => {
    it("Should call client stop", async () => {
      const skhailClient = {
        skhail: "client",
        stop: jest.fn(),
      };
      const client = new SkhailAuthClient(skhailClient as any, {
        id: "test id",
        privateKey: "private key" as any,
      });

      await client.stop();

      expect(skhailClient.stop).toHaveBeenCalledTimes(1);
      expect(skhailClient.stop).toHaveBeenCalledWith();
    });
  });

  describe("getAuthInfo", () => {
    it("Should get auth info", async () => {
      const decodeSpy = jest.spyOn(KeyUtils, "decode").mockReturnValue({
        id: "auth info",
      });
      const skhailClient = {
        skhail: "client",
        stop: jest.fn(),
      };
      const client = new SkhailAuthClient(skhailClient as any, {
        id: "test id",
        privateKey: "private key" as any,
      });
      client["token"] = "test token";

      const info = await client.getAuthInfo();

      expect(info).toStrictEqual({
        id: "auth info",
      });
      expect(decodeSpy).toHaveBeenCalledTimes(1);
      expect(decodeSpy).toHaveBeenCalledWith("test token");
    });
    it("Should return undefined when token is undefined", async () => {
      const decodeSpy = jest.spyOn(KeyUtils, "decode").mockReturnValue({
        id: "auth info",
      });
      const skhailClient = {
        skhail: "client",
      };
      const client = new SkhailAuthClient(skhailClient as any, {
        id: "test id",
        privateKey: "private key" as any,
      });

      const info = await client.getAuthInfo();

      expect(info).toBeUndefined();
      expect(decodeSpy).toHaveBeenCalledTimes(0);
    });
  });

  describe("on", () => {
    it("Should set listener", () => {
      const skhailClient = {
        skhail: "client",
      };
      const client = new SkhailAuthClient(skhailClient as any, {
        id: "test id",
        privateKey: "private key" as any,
      });

      const spy = jest.fn();
      client.on("login", spy);

      expect(client["listeners"].get("login")).toBeDefined();
      expect(client["listeners"].get("login")).toStrictEqual([spy]);
    });

    it("Should not reset event listener", () => {
      const skhailClient = {
        skhail: "client",
      };
      const client = new SkhailAuthClient(skhailClient as any, {
        id: "test id",
        privateKey: "private key" as any,
      });

      const spy = jest.fn();
      const spy2 = jest.fn();
      client.on("login", spy);
      client.on("login", spy2);

      expect(client["listeners"].get("login")).toBeDefined();
      expect(client["listeners"].get("login")).toStrictEqual([spy, spy2]);
    });
  });

  describe("getIdentity", () => {
    it("Should return identity", async () => {
      const skhailClient = {
        skhail: "client",
      };
      const client = new SkhailAuthClient(skhailClient as any, {
        id: "test id",
        privateKey: "private key" as any,
      });

      const exportKey = jest
        .spyOn(KeyUtils, "exportKey")
        .mockReturnValue("public key" as any);

      const identity = await client.getIdentity();

      expect(identity).toBeDefined();
      expect(identity).toBeInstanceOf(Object);
      expect(identity.getId()).toBe("test id");
      expect(identity.getPublicKey()).toBe("public key");

      expect(exportKey).toHaveBeenCalledTimes(1);
      expect(exportKey).toHaveBeenCalledWith("private key", false);
    });

    it("Should return identity with passphrase", async () => {
      const store = { prop: "store" };
      const createStore = jest
        .spyOn(KeyUtils, "createNewKeyStore")
        .mockReturnValue(store as any);
      const createKey = jest
        .spyOn(KeyUtils, "createNewPrivateKey")
        .mockResolvedValue("private key" as any);

      jest.spyOn(KeyUtils, "exportKey").mockReturnValue("public key" as any);

      const skhailClient = { skhail: "client" };
      const client = new SkhailAuthClient(skhailClient as any, {
        id: "test",
        passphrase: "this is a password",
      });

      const identity = await client.getIdentity();

      expect(identity).toBeDefined();
      expect(identity).toBeInstanceOf(Object);
      expect(identity.getId()).toBe("test");
      expect(identity.getPublicKey()).toBe("public key");

      expect(createStore).toHaveBeenCalledTimes(1);
      expect(createStore).toHaveBeenCalledWith();
      expect(createKey).toHaveBeenCalledTimes(1);
      expect(createKey).toHaveBeenCalledWith(store, "this is a password");
    });

    it("Should throw error when no private key provided", async () => {
      const skhailClient = { skhail: "client" };
      const client = new SkhailAuthClient(
        skhailClient as any,
        {
          id: "test",
        } as any
      );

      let error;
      try {
        await client.getIdentity();
      } catch (e: any) {
        error = e;
      }

      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe("No private key provided can't get identity");
    });
  });
});
