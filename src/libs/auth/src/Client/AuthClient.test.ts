/**
 * @group unit
 */
import { IAuthenticationService } from "../Shared";
import * as KeyUtils from "../Shared/utils";
import { AuthClient } from "./AuthClient";

describe("AuthClient", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("Should instantiate AuthClient", () => {
    const skhailClient = { skhail: "client" };
    const client = new AuthClient(skhailClient as any, {
      providers: [],
    });

    expect(client).toBeInstanceOf(AuthClient);
  });

  describe("login", () => {
    it("Should call skhail client authentication login with sign token", async () => {
      const service = { login: jest.fn() };

      const skhailClient = {
        skhail: "client",
        get: jest.fn().mockReturnValue(service),
      };
      const login = jest.fn().mockResolvedValue("test login token");
      const client = new AuthClient(skhailClient as any, {
        providers: [
          {
            getType: () => "test",
            login,
          },
        ],
      });

      await client.login("test");

      expect(login).toHaveBeenCalledTimes(1);
      expect(login).toHaveBeenCalledWith(client);

      expect(skhailClient.get).toHaveBeenCalledTimes(1);
      expect(skhailClient.get).toHaveBeenCalledWith(IAuthenticationService);

      expect(service.login).toHaveBeenCalledTimes(1);
      expect(service.login).toHaveBeenCalledWith({
        provider: "test",
        token: "test login token",
      });
    });

    it("should throw when provider is not found", async () => {
      const service = { login: jest.fn() };

      const skhailClient = {
        skhail: "client",
        get: jest.fn().mockReturnValue(service),
      };
      const login = jest.fn().mockResolvedValue("test login token");
      const client = new AuthClient(skhailClient as any, {
        providers: [],
      });

      let error;
      try {
        await client.login("test");
      } catch (e: any) {
        error = e;
      }

      expect(error).toBeDefined();
      expect(error.message).toBe("No provider found");
    });

    it("Should emit login event", async () => {
      const service = { login: jest.fn().mockResolvedValue("test token") };

      const skhailClient = {
        skhail: "client",
        get: jest.fn().mockReturnValue(service),
      };
      const login = jest.fn().mockResolvedValue("test login token");
      const client = new AuthClient(skhailClient as any, {
        providers: [
          {
            getType: () => "test",
            login,
          },
        ],
      });

      const spy = jest.fn();
      client.on("login", spy);

      await client.login("test");

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith("test token");
    });

    it("Should emit login event when initialized with token", async () => {
      const service = { login: jest.fn().mockResolvedValue("test token") };

      const skhailClient = {
        skhail: "client",
        get: jest.fn().mockReturnValue(service),
      };
      const login = jest.fn().mockResolvedValue("test login token");
      const client = new AuthClient(skhailClient as any, {
        token: "my test token",
        providers: [
          {
            getType: () => "test",
            login,
          },
        ],
      });

      const spy = jest.fn();
      client.on("login", spy);

      await client.login("test");

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith("my test token");
    });

    it("Should intanciate client from token and be able to access without login", async () => {
      const service = { register: jest.fn() };
      const skhailClient = {
        skhail: "client",
        get: jest.fn().mockReturnValue(service),
      };
      const client = new AuthClient(skhailClient as any, {
        providers: [],
        token: "test token",
      });

      await client.get(IAuthenticationService);

      expect(skhailClient.get).toHaveBeenCalledTimes(1);
      expect(skhailClient.get).toHaveBeenCalledWith(
        IAuthenticationService,
        { token: "test token" },
        undefined
      );
    });
  });

  describe("get", () => {
    it("Should call skhail client get with context", async () => {
      const service = { register: jest.fn() };
      const skhailClient = {
        skhail: "client",
        get: jest.fn().mockReturnValue(service),
      };
      const client = new AuthClient(skhailClient as any, {
        providers: [],
      });

      client["token"] = "test token";
      client.get(IAuthenticationService);

      expect(skhailClient.get).toHaveBeenCalledTimes(1);
      expect(skhailClient.get).toHaveBeenCalledWith(
        IAuthenticationService,
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
      const client = new AuthClient(skhailClient as any, {
        providers: [],
      });

      await client.get(IAuthenticationService, { other: "context" } as any);

      expect(skhailClient.get).toHaveBeenCalledTimes(1);
      expect(skhailClient.get).toHaveBeenCalledWith(
        IAuthenticationService,
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
      const client = new AuthClient(skhailClient as any, {
        providers: [],
      });

      client["token"] = "test token";

      await client.logout();

      expect(client["token"]).toBeUndefined();
    });

    it("Should emit event", async () => {
      const skhailClient = {
        skhail: "client",
      };
      const client = new AuthClient(skhailClient as any, {
        providers: [],
      });

      client["token"] = "test token";

      const spy = jest.fn();
      client.on("logout", spy);

      await client.logout();

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe("start", () => {
    it("Should call client start", async () => {
      const skhailClient = {
        skhail: "client",
        start: jest.fn(),
      };
      const client = new AuthClient(skhailClient as any, {
        providers: [],
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
      const client = new AuthClient(skhailClient as any, {
        providers: [],
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
      const client = new AuthClient(skhailClient as any, {
        providers: [],
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
      const client = new AuthClient(skhailClient as any, {
        providers: [],
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
      const client = new AuthClient(skhailClient as any, {
        providers: [],
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
      const client = new AuthClient(skhailClient as any, {
        providers: [],
      });

      const spy = jest.fn();
      const spy2 = jest.fn();
      client.on("login", spy);
      client.on("login", spy2);

      expect(client["listeners"].get("login")).toBeDefined();
      expect(client["listeners"].get("login")).toStrictEqual([spy, spy2]);
    });
  });
});
