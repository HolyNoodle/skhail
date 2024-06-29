/**
 * @group unit
 */
import { HTTPService } from "./HTTPService";
import { RouteHandler } from "./Handlers/RouteHandler";
import { createServer } from "http";
import { createServer as createSecuredServer } from "https";
import { HTTPProtocols } from "../client/types";
import { SkhailService } from "@skhail/core";

jest.mock("http");
jest.mock("https");
jest.mock("./Handlers/RouteHandler");

class TestService extends SkhailService<any> {
  static identifier = "test id";
  test(): Promise<void> {
    return Promise.resolve();
  }
}

describe("HTTPService", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("Should instantiate HTTPService", () => {
    const service = new HTTPService();

    expect(service).toBeInstanceOf(HTTPService);
  });

  describe("prepare", () => {
    it("Should start http service", async () => {
      const logger = { debug: jest.fn(), info: jest.fn() };
      const service = new HTTPService({ port: 12 });

      service.setLogger(logger as any);

      const httpServer = {
        on: jest.fn(),
        listen: jest.fn().mockImplementation((_1, _2, cb) => cb()),
      };
      (createServer as any as jest.SpyInstance).mockReturnValue(httpServer);

      const handler = jest.fn();
      service["requestHandler"] = jest.fn().mockReturnValue(handler);

      await service.prepare();

      expect(service["requestHandler"]).toHaveBeenCalledTimes(1);

      expect(createServer).toHaveBeenCalledTimes(1);
      expect(createServer).toHaveBeenCalledWith(handler);

      expect(httpServer.on).toHaveBeenCalledTimes(1);
      expect(httpServer.on.mock.calls[0][0]).toBe("upgrade");

      expect(httpServer.listen).toHaveBeenCalledTimes(1);
      expect(httpServer.listen.mock.calls[0][0]).toBe(12);
    });

    it("Should start https service", async () => {
      const logger = { debug: jest.fn(), info: jest.fn() };
      const tls = { cert: "test" };
      const service = new HTTPService({
        port: 12,
        protocol: HTTPProtocols.HTTPS,
        tls,
      });

      service.setLogger(logger as any);

      const httpServer = {
        on: jest.fn(),
        listen: jest.fn().mockImplementation((_1, _2, cb) => cb()),
      };
      (createSecuredServer as any as jest.SpyInstance).mockReturnValue(
        httpServer
      );

      const handler = jest.fn();
      service["requestHandler"] = jest.fn().mockReturnValue(handler);

      await service.prepare();

      expect(service["requestHandler"]).toHaveBeenCalledTimes(1);

      expect(createSecuredServer).toHaveBeenCalledTimes(1);
      expect(createSecuredServer).toHaveBeenCalledWith(tls, handler);

      expect(httpServer.on).toHaveBeenCalledTimes(1);
      expect(httpServer.on.mock.calls[0][0]).toBe("upgrade");

      expect(httpServer.listen).toHaveBeenCalledTimes(1);
      expect(httpServer.listen.mock.calls[0][0]).toBe(12);
    });

    it("Should handle server upgrade", async () => {
      const logger = { debug: jest.fn(), info: jest.fn() };
      const service = new HTTPService({ port: 12 });

      service.setLogger(logger as any);

      const httpServer = {
        on: jest.fn(),
        listen: jest.fn().mockImplementation((_1, _2, cb) => cb()),
      };
      (createServer as any as jest.SpyInstance).mockReturnValue(httpServer);

      const handler = jest.fn();
      service["requestHandler"] = jest.fn().mockReturnValue(handler);

      await service.prepare();

      expect(service["requestHandler"]).toHaveBeenCalledTimes(1);

      expect(createServer).toHaveBeenCalledTimes(1);
      expect(createServer).toHaveBeenCalledWith(handler);

      expect(httpServer.on).toHaveBeenCalledTimes(1);
      expect(httpServer.on.mock.calls[0][0]).toBe("upgrade");

      const request = { url: "test url", headers: { upgrade: "websocket" } };
      const socket = { socket: "test" };
      const head = { head: "test" };

      service["network"] = {} as any;
      service["handlers"] = [
        {
          match: jest.fn().mockReturnValue(true),
          upgrade: jest.fn(),
        },
      ] as any;
      httpServer.on.mock.calls[0][1](request, socket, head);

      expect(service["handlers"][0].match).toHaveBeenCalledTimes(1);
      expect(service["handlers"][0].match).toHaveBeenCalledWith("test url");

      expect(service["handlers"][0].upgrade).toHaveBeenCalledTimes(1);
      expect(service["handlers"][0].upgrade).toHaveBeenCalledWith(
        service["network"],
        request,
        socket,
        head
      );
    });

    it("Should not handle server upgrade when no handler match", async () => {
      const logger = { debug: jest.fn(), info: jest.fn() };
      const service = new HTTPService({ port: 12 });

      service.setLogger(logger as any);

      const httpServer = {
        on: jest.fn(),
        listen: jest.fn().mockImplementation((_1, _2, cb) => cb()),
      };
      (createServer as any as jest.SpyInstance).mockReturnValue(httpServer);

      const handler = jest.fn();
      service["requestHandler"] = jest.fn().mockReturnValue(handler);

      await service.prepare();

      expect(service["requestHandler"]).toHaveBeenCalledTimes(1);

      expect(createServer).toHaveBeenCalledTimes(1);
      expect(createServer).toHaveBeenCalledWith(handler);

      expect(httpServer.on).toHaveBeenCalledTimes(1);
      expect(httpServer.on.mock.calls[0][0]).toBe("upgrade");

      const request = { url: "test url", headers: { upgrade: "websocket" } };
      const socket = { socket: "test", destroy: jest.fn() };
      const head = { head: "test" };

      service["network"] = {} as any;
      service["handlers"] = [
        {
          match: jest.fn().mockReturnValue(false),
          upgrade: jest.fn(),
        },
      ] as any;
      httpServer.on.mock.calls[0][1](request, socket, head);

      expect(service["handlers"][0].match).toHaveBeenCalledTimes(1);
      expect(service["handlers"][0].match).toHaveBeenCalledWith("test url");

      expect(service["handlers"][0].upgrade).toHaveBeenCalledTimes(0);

      expect(socket.destroy).toHaveBeenCalledTimes(1);
      expect(socket.destroy).toHaveBeenCalledWith(
        new Error("No upgrade handler found for test url")
      );
    });

    it("Should not handle server upgrade type is not websocket", async () => {
      const logger = { debug: jest.fn(), info: jest.fn() };
      const service = new HTTPService({ port: 12 });

      service.setLogger(logger as any);

      const httpServer = {
        on: jest.fn(),
        listen: jest.fn().mockImplementation((_, _2, cb) => cb()),
      };
      (createServer as any as jest.SpyInstance).mockReturnValue(httpServer);

      const handler = jest.fn();
      service["requestHandler"] = jest.fn().mockReturnValue(handler);

      await service.prepare();

      expect(service["requestHandler"]).toHaveBeenCalledTimes(1);

      expect(createServer).toHaveBeenCalledTimes(1);
      expect(createServer).toHaveBeenCalledWith(handler);

      expect(httpServer.on).toHaveBeenCalledTimes(1);
      expect(httpServer.on.mock.calls[0][0]).toBe("upgrade");

      const request = { url: "test url", headers: { upgrade: "html" } };
      const socket = { socket: "test", end: jest.fn() };
      const head = { head: "test" };

      service["network"] = {} as any;
      service["handlers"] = [
        {
          match: jest.fn().mockReturnValue(false),
          upgrade: jest.fn(),
        },
      ] as any;
      httpServer.on.mock.calls[0][1](request, socket, head);

      expect(service["handlers"][0].match).toHaveBeenCalledTimes(0);
      expect(service["handlers"][0].upgrade).toHaveBeenCalledTimes(0);

      expect(socket.end).toHaveBeenCalledTimes(1);
      expect(socket.end).toHaveBeenCalledWith("HTTP/1.1 400 Bad Request");
    });

    it("Should prepare handlers", async () => {
      const logger = { debug: jest.fn(), info: jest.fn() };
      const service = new HTTPService({ port: 12 });

      service.setLogger(logger as any);

      const httpServer = {
        on: jest.fn(),
        listen: jest.fn().mockImplementation((_, _2, cb) => cb()),
      };
      (createServer as any as jest.SpyInstance).mockReturnValue(httpServer);

      const handler = jest.fn();
      service["requestHandler"] = jest.fn().mockReturnValue(handler);

      service["handlers"] = [
        {
          setLogger: jest.fn(),
          prepare: jest.fn().mockResolvedValue(undefined),
        },
        {
          setLogger: jest.fn(),
        },
      ] as any;

      await service.prepare();

      expect(service["handlers"][0].setLogger).toHaveBeenCalledTimes(1);
      expect(service["handlers"][0].setLogger).toHaveBeenCalledWith(logger);

      expect(service["handlers"][0].prepare).toHaveBeenCalledTimes(1);
      expect(service["handlers"][0].prepare).toHaveBeenCalledWith();
    });
  });

  describe("cleanup", () => {
    it("Should stop http server", async () => {
      const logger = { debug: jest.fn(), info: jest.fn() };
      const service = new HTTPService({ port: 12 });

      service.setLogger(logger as any);

      service["httpServer"] = {
        close: jest.fn().mockImplementation((cb) => cb()),
      } as any;

      await service.cleanup();

      expect(service["httpServer"]!.close).toHaveBeenCalledTimes(1);
    });

    it("Should log error when closing http server", async () => {
      const logger = { debug: jest.fn(), info: jest.fn(), error: jest.fn() };
      const service = new HTTPService({ port: 12 });

      service.setLogger(logger as any);

      service["httpServer"] = {
        close: jest.fn().mockImplementation((cb) => cb("test error")),
      } as any;

      await service.cleanup();

      expect(service["httpServer"]!.close).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        "An error occured while stopping the server",
        {
          error: {
            name: "unexpected",
            details: {},
            message: "test error",
          },
        }
      );
    });

    it("Should cleanup handlers", async () => {
      const logger = { debug: jest.fn(), info: jest.fn() };
      const service = new HTTPService({ port: 12 });

      service.setLogger(logger as any);

      const httpServer = {
        on: jest.fn(),
        close: jest.fn().mockImplementation((cb) => cb()),
      };
      (createServer as any as jest.SpyInstance).mockReturnValue(httpServer);

      service["httpServer"] = httpServer as any;

      service["handlers"] = [
        {
          setLogger: jest.fn(),
          cleanup: jest.fn().mockResolvedValue(undefined),
        },
        {
          setLogger: jest.fn(),
        },
      ] as any;

      await service.cleanup();

      expect(service["handlers"][0].cleanup).toHaveBeenCalledTimes(1);
      expect(service["handlers"][0].cleanup).toHaveBeenCalledWith();
    });
  });

  describe("requestHandler", () => {
    it("Should handle request", async () => {
      const logger = { debug: jest.fn(), info: jest.fn() };
      const service = new HTTPService({ port: 12 });

      service.setLogger(logger as any);
      service["network"] = {} as any;
      service["handlers"] = [
        {
          match: jest.fn().mockReturnValue(true),
          handle: jest.fn(),
        },
      ] as any;

      service["httpServer"] = {
        close: jest.fn().mockImplementation((cb) => cb()),
      } as any;

      const handler = service["requestHandler"](service);

      const request = { url: "test url", headers: { upgrade: "html" } };
      const response = {
        socket: "test",
        setHeader: jest.fn(),
      };

      handler(request as any, response as any);

      expect(service["handlers"][0].match).toHaveBeenCalledTimes(1);
      expect(service["handlers"][0].match).toHaveBeenCalledWith("test url");

      expect(service["handlers"][0].handle).toHaveBeenCalledTimes(1);
      expect(service["handlers"][0].handle).toHaveBeenCalledWith(
        service["network"],
        request,
        response
      );
    });

    it("Should return 404", async () => {
      const logger = { debug: jest.fn(), info: jest.fn() };
      const service = new HTTPService({ port: 12 });

      service.setLogger(logger as any);
      service["network"] = {} as any;
      service["handlers"] = [
        {
          match: jest.fn().mockReturnValue(false),
          handle: jest.fn(),
        },
      ] as any;

      service["httpServer"] = {
        close: jest.fn().mockImplementation((cb) => cb()),
      } as any;

      const handler = service["requestHandler"](service);

      const request = { url: "test url", headers: { upgrade: "html" } };
      const response = {
        socket: "test",
        setHeader: jest.fn(),
        writeHead: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      };

      handler(request as any, response as any);

      expect(service["handlers"][0].match).toHaveBeenCalledTimes(1);
      expect(service["handlers"][0].match).toHaveBeenCalledWith("test url");

      expect(service["handlers"][0].handle).toHaveBeenCalledTimes(0);

      expect(response.writeHead).toHaveBeenCalledTimes(1);
      expect(response.writeHead).toHaveBeenCalledWith(
        404,
        "No request handler registered for this route: test url",
        { "Content-Type": "application/json" }
      );

      expect(response.write).toHaveBeenCalledTimes(1);
      expect(response.write).toHaveBeenCalledWith(
        JSON.stringify({
          success: false,
          error: {
            message: "No request handler registered for this route",
            name: "not_found",
            details: { url: "test url" },
          },
        })
      );

      expect(response.end).toHaveBeenCalledTimes(1);
    });

    it("Should return options response", async () => {
      const logger = { debug: jest.fn(), info: jest.fn() };
      const service = new HTTPService({ port: 12 });

      service.setLogger(logger as any);
      service["network"] = {} as any;
      service["handlers"] = [
        {
          match: jest.fn().mockReturnValue(false),
          handle: jest.fn(),
        },
      ] as any;

      service["httpServer"] = {
        close: jest.fn().mockImplementation((cb) => cb()),
      } as any;

      const handler = service["requestHandler"](service);

      const request = {
        url: "test url",
        method: "OPTIONS",
        headers: { upgrade: "html" },
      };
      const response = {
        socket: "test",
        setHeader: jest.fn(),
        end: jest.fn(),
      };

      handler(request as any, response as any);

      expect(service["handlers"][0].match).toHaveBeenCalledTimes(0);
      expect(service["handlers"][0].handle).toHaveBeenCalledTimes(0);

      expect(response.setHeader).toHaveBeenCalledTimes(3);
      expect(response.setHeader).toHaveBeenNthCalledWith(
        1,
        "Access-Control-Allow-Origin",
        "*"
      );
      expect(response.setHeader).toHaveBeenNthCalledWith(
        2,
        "Access-Control-Allow-Headers",
        "Content-Type, Accept, Origin, Context"
      );
      expect(response.setHeader).toHaveBeenNthCalledWith(
        3,
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, PATCH, OPTIONS"
      );

      expect(response.end).toHaveBeenCalledTimes(1);
    });

    it("Should return allowed origins for cors", async () => {
      const logger = { debug: jest.fn(), info: jest.fn() };
      const service = new HTTPService({
        port: 12,
        allowedOrigins: ["test origin"],
      });

      service.setLogger(logger as any);
      service["network"] = {} as any;
      service["handlers"] = [
        {
          match: jest.fn().mockReturnValue(false),
          handle: jest.fn(),
        },
      ] as any;

      service["httpServer"] = {
        close: jest.fn().mockImplementation((cb) => cb()),
      } as any;

      const handler = service["requestHandler"](service);

      const request = {
        url: "test url",
        method: "OPTIONS",
        headers: { origin: "test origin" },
      };
      const response = {
        socket: "test",
        setHeader: jest.fn(),
        end: jest.fn(),
      };

      handler(request as any, response as any);

      expect(service["handlers"][0].match).toHaveBeenCalledTimes(0);
      expect(service["handlers"][0].handle).toHaveBeenCalledTimes(0);

      expect(response.setHeader).toHaveBeenCalledTimes(3);
      expect(response.setHeader).toHaveBeenNthCalledWith(
        1,
        "Access-Control-Allow-Origin",
        "test origin"
      );
    });

    it("Should reject allowed origins for cors when origin is not present", async () => {
      const logger = { debug: jest.fn(), info: jest.fn() };
      const service = new HTTPService({
        port: 12,
        allowedOrigins: ["test origin"],
      });

      service.setLogger(logger as any);
      service["network"] = {} as any;
      service["handlers"] = [
        {
          match: jest.fn().mockReturnValue(false),
          handle: jest.fn(),
        },
      ] as any;

      service["httpServer"] = {
        close: jest.fn().mockImplementation((cb) => cb()),
      } as any;

      const handler = service["requestHandler"](service);

      const request = {
        url: "test url",
        method: "OPTIONS",
        headers: { origin: "test other origin" },
      };
      const response = {
        socket: "test",
        setHeader: jest.fn(),
        end: jest.fn(),
      };

      handler(request as any, response as any);

      expect(service["handlers"][0].match).toHaveBeenCalledTimes(0);
      expect(service["handlers"][0].handle).toHaveBeenCalledTimes(0);

      expect(response.setHeader).toHaveBeenCalledTimes(3);
      expect(response.setHeader).toHaveBeenNthCalledWith(
        1,
        "Access-Control-Allow-Origin",
        "null"
      );
    });
  });

  describe("registerRoute", () => {
    it("Should register route handler", () => {
      const service = new HTTPService({ port: 12 });

      service.registerRoute("test-route", TestService, "test" as any);

      expect(RouteHandler).toHaveBeenCalledTimes(1);
      expect(RouteHandler).toHaveBeenCalledWith({
        method: "test",
        route: "test-route",
        service: "test id",
        raw: false,
      });
      expect(service["handlers"]).toHaveLength(1);
      expect(service["handlers"][0]).toBeInstanceOf(RouteHandler);
    });

    it("Should register raw route handler", () => {
      const service = new HTTPService({ port: 12 });

      service.registerRoute("test-route", TestService, "test" as any, true);

      expect(RouteHandler).toHaveBeenCalledTimes(1);
      expect(RouteHandler).toHaveBeenCalledWith({
        method: "test",
        route: "test-route",
        service: "test id",
        raw: true,
      });
      expect(service["handlers"]).toHaveLength(1);
      expect(service["handlers"][0]).toBeInstanceOf(RouteHandler);
    });
  });
});
