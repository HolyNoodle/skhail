/**
 * @group unit
 */
import { WebSocketServer } from "ws";
import { APIHandler } from "./APIHandler";
import * as coreUtils from "@skhail/core";
import OpenAPIBackend from "openapi-backend";
import { OpenAPIBuilder } from "./OpenAPI.utils";

jest.mock("ws");
jest.mock("openapi-backend");
jest.mock("./OpenAPI.utils");

describe("APIHandler", () => {
  const mockOpenApiBuilder = {
    buildDoc: jest.fn(),
    buildHandlers: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });
  it("Should instantiate APIHandler", () => {
    const handler = new APIHandler<any>(mockOpenApiBuilder as any);

    expect(handler).toBeInstanceOf(APIHandler);
  });

  describe("prepare", () => {
    it("Should build open api doc", async () => {
      const websocketServer = { on: jest.fn() };
      (WebSocketServer as any as jest.SpyInstance).mockReturnValue(
        websocketServer
      );

      (mockOpenApiBuilder.buildDoc as any as jest.SpyInstance).mockReturnValue({
        paths: { test: "truc" },
      });

      const handler = new APIHandler<any>(mockOpenApiBuilder as any);

      await handler.prepare();

      expect(mockOpenApiBuilder.buildDoc).toHaveBeenCalledTimes(1);
      expect(mockOpenApiBuilder.buildDoc).toHaveBeenCalledWith();

      expect(OpenAPIBackend).toHaveBeenCalledTimes(1);
      expect(OpenAPIBackend).toHaveBeenCalledWith({
        definition: {
          info: { title: "test", version: "1.0.0" },
          openapi: "3.0.1",
          paths: { test: "truc" },
        },
      });
    });
  });

  describe("handle", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("Should handle message", async () => {
      const logger = { info: jest.fn(), debug: jest.fn() } as any;
      const websocketServer = {
        on: jest.fn(),
      };
      (WebSocketServer as any as jest.SpyInstance).mockReturnValue(
        websocketServer
      );

      const handler = new APIHandler<any>(mockOpenApiBuilder as any);

      handler.setLogger(logger);

      await handler.prepare();

      const result = { success: true, result: { test: "result" } } as any;
      const queue = { enqueue: jest.fn().mockResolvedValue(result) };
      const server = { getQueue: jest.fn().mockReturnValue(queue) } as any;
      const request = {
        on: jest.fn(),
        method: "POST",
        headers: { context: JSON.stringify({ tid: "test" }) },
      } as any;
      const response = {
        writeHead: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      } as any;

      (
        OpenAPIBackend.prototype.handleRequest as any as jest.SpyInstance
      ).mockResolvedValue(result);

      const promise = handler.handle(server, request, response);

      expect(request.on).toHaveBeenCalledTimes(3);
      expect(request.on.mock.calls[0][0]).toBe("data");
      expect(request.on.mock.calls[1][0]).toBe("error");
      expect(request.on.mock.calls[2][0]).toBe("end");

      const body = {
        test: "message",
      } as any;

      request.on.mock.calls[0][1](Buffer.from(JSON.stringify(body)));

      request.on.mock.calls[2][1]();

      await promise;

      expect(OpenAPIBackend.prototype.handleRequest).toHaveBeenCalledTimes(1);
      expect(OpenAPIBackend.prototype.handleRequest).toHaveBeenCalledWith(
        {
          body: JSON.stringify({ test: "message" }),
          headers: {},
          method: "POST",
          path: "/",
          query: "",
        },
        server,
        { tid: "test" },
        logger,
        response
      );
    });

    it("Should send logs", async () => {
      const logger = {
        info: jest.fn(),
        debug: jest.fn(),
        log: jest.fn(),
        warning: jest.fn(),
      } as any;
      const websocketServer = {
        on: jest.fn(),
      };
      (WebSocketServer as any as jest.SpyInstance).mockReturnValue(
        websocketServer
      );

      (OpenAPIBuilder as any as jest.SpyInstance).mockReturnValue({
        test: "Defintion",
      });

      const handler = new APIHandler<any>(mockOpenApiBuilder as any);

      handler.setLogger(logger);

      await handler.prepare();

      (mockOpenApiBuilder.buildDoc as any as jest.SpyInstance)
        .mockReturnValue({
          test: "Defintion",
        })
        .mockClear();

      const message = { message: "test" };
      const request = {
        on: jest
          .fn()
          .mockImplementation(
            (type, cb) =>
              (type === "data" && cb(Buffer.from("fdsfze"))) ||
              (type === "end" && cb())
          ),
        url: "/logs",
        method: "POST",
      } as any;
      const response = {
        writeHead: jest.fn().mockReturnThis(),
        write: jest.fn(),
        end: jest.fn(),
      } as any;

      await handler.handle({} as any, request, response);

      expect(response.writeHead).toHaveBeenCalledTimes(1);
      expect(response.writeHead).toHaveBeenCalledWith(500);
      expect(response.write).toHaveBeenCalledTimes(0);
      expect(response.end).toHaveBeenCalledTimes(1);
    });

    it("Should return status 500 when send logs fails", async () => {
      const logger = {
        info: jest.fn(),
        debug: jest.fn(),
        log: jest.fn(),
      } as any;
      const websocketServer = {
        on: jest.fn(),
      };
      (WebSocketServer as any as jest.SpyInstance).mockReturnValue(
        websocketServer
      );

      (OpenAPIBuilder as any as jest.SpyInstance).mockReturnValue({
        test: "Defintion",
      });

      const handler = new APIHandler<any>(mockOpenApiBuilder as any);

      handler.setLogger(logger);

      await handler.prepare();

      (mockOpenApiBuilder.buildDoc as any as jest.SpyInstance)
        .mockReturnValue({
          test: "Defintion",
        })
        .mockClear();

      const message = { message: "test" };
      const request = {
        on: jest
          .fn()
          .mockImplementation(
            (type, cb) =>
              (type === "data" &&
                cb(Buffer.from(JSON.stringify([message, message])))) ||
              (type === "end" && cb())
          ),
        url: "/logs",
        method: "POST",
      } as any;
      const response = {
        writeHead: jest.fn().mockReturnThis(),
        write: jest.fn(),
        end: jest.fn(),
      } as any;

      await handler.handle({} as any, request, response);

      expect(logger.log).toHaveBeenCalledTimes(2);
      expect(logger.log).toHaveBeenNthCalledWith(1, message);
      expect(logger.log).toHaveBeenNthCalledWith(2, message);
      expect(response.writeHead).toHaveBeenCalledTimes(1);
      expect(response.writeHead).toHaveBeenCalledWith(204);
      expect(response.write).toHaveBeenCalledTimes(0);
      expect(response.end).toHaveBeenCalledTimes(1);
    });

    it("Should return api definition", async () => {
      const logger = { info: jest.fn(), debug: jest.fn() } as any;
      const websocketServer = {
        on: jest.fn(),
      };
      (WebSocketServer as any as jest.SpyInstance).mockReturnValue(
        websocketServer
      );

      (OpenAPIBuilder as any as jest.SpyInstance).mockReturnValue({
        test: "Defintion",
      });

      const handler = new APIHandler<any>(mockOpenApiBuilder as any);

      handler.setLogger(logger);

      await handler.prepare();

      (mockOpenApiBuilder.buildDoc as any as jest.SpyInstance)
        .mockReturnValue({
          test: "Defintion",
        })
        .mockClear();

      const result = { success: true, result: { test: "result" } } as any;
      const queue = { enqueue: jest.fn().mockResolvedValue(result) };
      const server = { getQueue: jest.fn().mockReturnValue(queue) } as any;
      const request = {
        on: jest.fn(),
        url: "/definition",
        method: "POST",
      } as any;
      const response = {
        writeHead: jest.fn().mockReturnThis(),
        write: jest.fn(),
        end: jest.fn(),
      } as any;

      (
        OpenAPIBackend.prototype.handleRequest as any as jest.SpyInstance
      ).mockResolvedValue(result);

      const promise = handler.handle(server, request, response);

      expect(request.on).toHaveBeenCalledTimes(0);

      await promise;

      expect(OpenAPIBackend.prototype.handleRequest).toHaveBeenCalledTimes(0);
      expect(mockOpenApiBuilder.buildDoc).toHaveBeenCalledTimes(1);
      expect(mockOpenApiBuilder.buildDoc).toHaveBeenCalledWith();

      expect(response.writeHead).toHaveBeenCalledTimes(1);
      expect(response.writeHead).toHaveBeenCalledWith(200, {
        "Content-Type": "application/json",
      });
      expect(response.write).toHaveBeenCalledTimes(1);
      expect(response.write).toHaveBeenCalledWith(
        JSON.stringify({ test: "Defintion" })
      );
    });

    it("Should throw when request emit error event", async () => {
      const logger = {
        info: jest.fn(),
        debug: jest.fn(),
        warning: jest.fn(),
      } as any;
      const websocketServer = {
        on: jest.fn(),
      };
      (WebSocketServer as any as jest.SpyInstance).mockReturnValue(
        websocketServer
      );

      const handler = new APIHandler<any>(mockOpenApiBuilder as any);

      handler.setLogger(logger);

      await handler.prepare();

      const server = {} as any;
      const request = { on: jest.fn() } as any;
      const response = {
        writeHead: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      } as any;

      const promise = handler.handle(server, request, response);

      expect(request.on).toHaveBeenCalledTimes(3);
      expect(request.on.mock.calls[0][0]).toBe("data");
      expect(request.on.mock.calls[1][0]).toBe("error");
      expect(request.on.mock.calls[2][0]).toBe("end");

      request.on.mock.calls[1][1]("error test");

      await expect(promise).rejects.toThrow("error test");
    });

    it("Should throw when request handling fails", async () => {
      const logger = {
        info: jest.fn(),
        debug: jest.fn(),
        warning: jest.fn(),
      } as any;
      const websocketServer = {
        on: jest.fn(),
      };
      (WebSocketServer as any as jest.SpyInstance).mockReturnValue(
        websocketServer
      );
      (
        OpenAPIBackend.prototype.handleRequest as any as jest.SpyInstance
      ).mockRejectedValue(new Error("test error"));

      const handler = new APIHandler<any>(mockOpenApiBuilder as any);

      handler.setLogger(logger);

      await handler.prepare();

      const server = {} as any;
      const request = { on: jest.fn(), headers: { context: "{}" } } as any;
      const response = {
        writeHead: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      } as any;

      const promise = handler.handle(server, request, response);

      expect(request.on).toHaveBeenCalledTimes(3);
      expect(request.on.mock.calls[0][0]).toBe("data");
      expect(request.on.mock.calls[1][0]).toBe("error");
      expect(request.on.mock.calls[2][0]).toBe("end");

      request.on.mock.calls[0][1](Buffer.from(JSON.stringify({})));

      request.on.mock.calls[2][1]();

      await promise;
      expect(response.writeHead).toHaveBeenCalledTimes(1);
      expect(response.writeHead).toHaveBeenCalledWith(500, {
        "Content-Type": "application/json",
      });
      expect(response.write).toHaveBeenCalledTimes(1);
      expect(response.write).toHaveBeenCalledWith(
        JSON.stringify({
          success: false,
          error: {
            message: "An unexpected error occured",
            name: "unexpected",
            details: {
              error: {
                message: "test error",
              },
            },
          },
        })
      );
    });

    it("Should throw when context is not set", async () => {
      const logger = { info: jest.fn(), debug: jest.fn() } as any;
      const websocketServer = {
        on: jest.fn(),
      };
      (WebSocketServer as any as jest.SpyInstance).mockReturnValue(
        websocketServer
      );

      const handler = new APIHandler<any>(mockOpenApiBuilder as any);

      handler.setLogger(logger);

      await handler.prepare();

      const result = { success: true, result: { test: "result" } } as any;
      const queue = { enqueue: jest.fn().mockResolvedValue(result) };
      const server = { getQueue: jest.fn().mockReturnValue(queue) } as any;
      const request = {
        on: jest.fn(),
        method: "POST",
        headers: {},
      } as any;
      const response = {
        writeHead: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      } as any;

      (
        OpenAPIBackend.prototype.handleRequest as any as jest.SpyInstance
      ).mockResolvedValue(result);

      const promise = handler.handle(server, request, response);

      const body = {
        test: "message",
      } as any;

      request.on.mock.calls[0][1](Buffer.from(JSON.stringify(body)));

      request.on.mock.calls[2][1]();

      await promise;

      expect(OpenAPIBackend.prototype.handleRequest).toHaveBeenCalledTimes(0);
      expect(response.writeHead).toHaveBeenCalledTimes(1);
      expect(response.writeHead).toHaveBeenCalledWith(400, {
        "Content-Type": "application/json",
      });
      expect(response.write).toHaveBeenCalledTimes(1);
      expect(response.write).toHaveBeenCalledWith(
        JSON.stringify({
          success: false,
          error: {
            message: "Context header is missing",
            name: "unexpected",
            details: {},
          },
        })
      );
    });
  });

  describe("getStatusFromResult", () => {
    it("Should return 200", () => {
      const handler = new APIHandler<any>(mockOpenApiBuilder as any);

      expect(
        handler.getStatusFromResult({
          tid: "test",
          success: true,
        })
      ).toBe(200);
    });
  });

  describe("match", () => {
    it("Should return true for all routes", () => {
      const handler = new APIHandler<any>(mockOpenApiBuilder as any);

      expect(handler.match()).toBeTruthy();
    });
  });
});
