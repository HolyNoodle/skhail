/**
 * @group unit
 */
import { Middleware, SkhailService } from "@skhail/core";
import { IAuthenticationService, ProtectorContext } from "../Shared";
import { AuthMiddleware } from "./AuthMiddleware";
import * as utils from "../Shared/utils";

abstract class TestService extends SkhailService<ProtectorContext> {
  static identifier: string = "Test";
  abstract testMethod(): Promise<any>;
  abstract false(): Promise<any>;
  abstract true(): Promise<any>;
  abstract unprotected(): Promise<any>;
  abstract method(): Promise<any>;
}

describe("authMiddleware", () => {
  const methodProtection = jest.fn();
  const logger = {
    error: jest.fn(),
  };
  const readyKeySpy = jest
    .spyOn(utils, "readKey")
    .mockResolvedValue("public key" as any);

  let verifySpy: any;

  let middleware: Middleware<any>;

  const authService = {
    getKey: jest.fn().mockResolvedValue("public key test"),
  };
  const server = {
    get: jest.fn().mockReturnValue(authService),
    getLogger: jest.fn().mockReturnValue(logger),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    verifySpy = jest.spyOn(utils, "verify").mockResolvedValue({
      claims: [],
      id: "guest",
    });

    middleware = new AuthMiddleware<TestService>({
      testMethod: ["test"],
      false: false,
      true: true,
      method: methodProtection,
    });

    authService.getKey.mockResolvedValue("public key test");
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  describe("cleanup", () => {
    it("Should reset public key, but I can't test it...", async () => {
      await expect(middleware.cleanup!(server as any)).resolves.toBeUndefined();
    });
  });
  describe("Prepare", () => {
    it("Should pull public key from auth service", async () => {
      authService.getKey.mockClear().mockResolvedValue("public key test");

      await expect(middleware.prepare!(server as any)).resolves.toBeUndefined();

      expect(readyKeySpy).toHaveBeenCalledTimes(1);
      expect(readyKeySpy).toHaveBeenCalledWith("public key test");
      expect(server.get).toHaveBeenCalledTimes(1);
      expect(server.get).toHaveBeenCalledWith(IAuthenticationService);
      expect(authService.getKey).toHaveBeenCalledTimes(1);
      expect(authService.getKey).toHaveBeenCalledWith();
    });

    it("Should retry get key when it failed", async () => {
      authService.getKey
        .mockClear()
        .mockRejectedValueOnce(new Error("failed"))
        .mockResolvedValue("public key test");

      await expect(middleware.prepare!(server as any)).resolves.toBeUndefined();

      await new Promise(process.nextTick);

      expect(readyKeySpy).toHaveBeenCalledTimes(1);
      expect(readyKeySpy).toHaveBeenCalledWith("public key test");
      expect(server.get).toHaveBeenCalledTimes(2);
      expect(server.get).toHaveBeenCalledWith(IAuthenticationService);
      expect(authService.getKey).toHaveBeenCalledTimes(2);
      expect(authService.getKey).toHaveBeenCalledWith();
    });

    it("Should throw if can get key when it failed", async () => {
      authService.getKey.mockClear().mockRejectedValue(new Error("failed"));

      const promise = middleware.prepare!(server as any);

      await new Promise(process.nextTick);

      await expect(promise).rejects.toThrow("Can't get key after 5 attempts");
    });
  });

  describe("Process", () => {
    it("Should reject when access to public key not set on protected entrypoint", async () => {
      await expect(
        middleware.process(
          {
            method: "testMethod",
            service: "TestService",
            args: [],
            context: {
              tid: "test id",
              data: {
                token: "test token",
              },
            },
          },
          {} as any
        )
      ).rejects.toThrow("Middleware not initialized, public key missing");
    });

    it("Should resolve when access to public method", async () => {
      await middleware.prepare!(server as any);

      await expect(
        middleware.process(
          {
            method: "true",
            service: "TestService",
            args: [],
            context: {
              tid: "test id",
              data: "context data" as any,
            },
          },
          {} as any
        )
      ).resolves.toStrictEqual({
        token: undefined,
        authInfo: {
          id: "guest",
          claims: [],
        },
      });
    });

    it("Should reject when access to private method", async () => {
      await middleware.prepare!(server as any);

      await expect(
        middleware.process(
          {
            method: "false",
            service: "TestService",
            args: [],
            context: {
              tid: "test id",
              data: "context data" as any,
            },
          },
          {} as any
        )
      ).rejects.toThrow("Insufficient user privileges");
    });

    it("Should reject when no context", async () => {
      await middleware.prepare!(server as any);

      await expect(
        middleware.process(
          {
            method: "false",
            service: "TestService",
            args: [],
          } as any,
          {} as any
        )
      ).rejects.toThrow("Insufficient user privileges");
    });

    it("Should reject when no context data", async () => {
      await middleware.prepare!(server as any);

      await expect(
        middleware.process(
          {
            method: "false",
            service: "TestService",
            args: [],
            context: {
              tid: "test",
            },
          } as any,
          {} as any
        )
      ).rejects.toThrow("Insufficient user privileges");
    });

    it("Should reject when no context data token", async () => {
      await middleware.prepare!(server as any);

      await expect(
        middleware.process(
          {
            method: "false",
            service: "TestService",
            args: [],
            context: {
              tid: "test",
              data: {},
            },
          } as any,
          {} as any
        )
      ).rejects.toThrow("Insufficient user privileges");
    });

    it("Should reject when verify fails", async () => {
      verifySpy.mockRejectedValue(new Error("test error"));

      await middleware.prepare!(server as any);

      await expect(
        middleware.process(
          {
            method: "false",
            service: "TestService",
            args: [],
            context: {
              tid: "test",
              data: {
                token: "test token",
              },
            },
          } as any,
          {} as any
        )
      ).rejects.toThrow("Invalid authentication token");

      expect(verifySpy).toHaveBeenCalledTimes(1);
      expect(verifySpy).toHaveBeenCalledWith("test token", "public key");
    });

    it("Should reject when option function rejects", async () => {
      methodProtection.mockImplementation(() => {
        throw new Error("test error");
      });

      await middleware.prepare!(server as any);

      await expect(
        middleware.process(
          {
            method: "method",
            service: "TestService",
            args: ["arg1", "arg2"],
            context: {
              tid: "test",
              data: {
                i: "am data",
              },
            },
          } as any,
          { service: "test" } as any
        )
      ).rejects.toThrow("test error");

      expect(methodProtection).toHaveBeenCalledTimes(1);
      expect(methodProtection).toHaveBeenCalledWith(
        { claims: [], id: "guest" },
        ["arg1", "arg2"],
        { service: "test" }
      );
    });

    it("Should resolve when option function resolves", async () => {
      await middleware.prepare!(server as any);

      methodProtection.mockResolvedValue(undefined);

      await expect(
        middleware.process(
          {
            method: "method",
            service: "TestService",
            args: [],
            context: {
              tid: "test",
              data: {
                i: "am data",
              },
            },
          } as any,
          {} as any
        )
      ).resolves.toStrictEqual({
        token: undefined,
        authInfo: {
          claims: [],
          id: "guest",
        },
      });
    });

    it("Should reject when no claims", async () => {
      await middleware.prepare!(server as any);

      await expect(
        middleware.process(
          {
            method: "testMethod",
            service: "TestService",
            args: [],
            context: {
              tid: "test",
              data: {
                i: "am data",
              },
            },
          } as any,
          {} as any
        )
      ).rejects.toThrow("Insufficient user privileges");
    });

    it("Should reject when wrong claims", async () => {
      await middleware.prepare!(server as any);

      verifySpy.mockResolvedValue({
        claims: ["test1", "test2"],
        id: "guest",
      });

      await expect(
        middleware.process(
          {
            method: "testMethod",
            service: "TestService",
            args: [],
            context: {
              tid: "test",
              data: {
                i: "am data",
              },
            },
          } as any,
          {} as any
        )
      ).rejects.toThrow("Insufficient user privileges");
    });

    it("Should resolve when option function resolves", async () => {
      await middleware.prepare!(server as any);

      verifySpy.mockResolvedValue({
        claims: ["test1", "test"],
        id: "guest",
      });
      await expect(
        middleware.process(
          {
            method: "testMethod",
            service: "TestService",
            args: [],
            context: {
              tid: "test",
              data: {
                token: "I am a token",
              },
            },
          } as any,
          {} as any
        )
      ).resolves.toStrictEqual({
        token: "I am a token",
        authInfo: {
          claims: ["test1", "test"],
          id: "guest",
        },
      });
    });

    it("Should reject when method is unprotected", async () => {
      await middleware.prepare!(server as any);

      await expect(
        middleware.process(
          {
            method: "unprotected",
            service: "TestService",
            args: [],
            context: {
              tid: "test",
              data: {
                i: "am data",
              },
            },
          } as any,
          {} as any
        )
      ).rejects.toThrow("Insufficient user privileges");
    });
  });
});
