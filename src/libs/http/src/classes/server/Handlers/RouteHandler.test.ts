/**
 * @group unit
 */
import { SkhailError } from "@skhail/core";
import { WebSocketServer } from "ws";
import { RouteHandler } from "./RouteHandler";
import { v4 } from "uuid";
import "urlpattern-polyfill";

jest.mock("ws");
jest.mock("uuid");

describe("RouteHandler", () => {
  it("Should instantiate RouteHandler", () => {
    const handler = new RouteHandler({
      service: "testService",
      method: "testMethod",
      route: "/test-route",
    });

    expect(handler).toBeInstanceOf(RouteHandler);
  });

  describe("handle", () => {
    it("Should handle message", async () => {
      const logger = { info: jest.fn(), debug: jest.fn() } as any;
      const websocketServer = {
        on: jest.fn(),
      };
      (WebSocketServer as any as jest.SpyInstance).mockReturnValue(
        websocketServer
      );

      const handler = new RouteHandler({
        service: "testService",
        method: "testMethod",
        route: "/test-route",
      });

      handler.setLogger(logger);

      const result = { success: true, response: { test: "result" } } as any;
      const queue = { enqueue: jest.fn().mockResolvedValue(result) };
      const server = { queue } as any;
      const request = {
        on: jest.fn(),
        headers: {
          "skhail-route-context": JSON.stringify({ test: "context" }),
        },
      } as any;
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

      const message = { test: "message" };

      request.on.mock.calls[0][1](Buffer.from(JSON.stringify(message)));

      request.on.mock.calls[2][1]();

      await promise;

      expect(queue.enqueue).toHaveBeenCalledTimes(1);
      expect(queue.enqueue).toHaveBeenCalledWith({
        context: { test: "context" },
        args: [
          {
            test: "message",
          },
        ],
        method: "testMethod",
        service: "testService",
      });

      expect(response.writeHead).toHaveBeenCalledTimes(1);
      expect(response.writeHead).toHaveBeenCalledWith(200, {
        "Content-Type": "application/json",
      });
      expect(response.write).toHaveBeenCalledTimes(1);
      expect(response.write).toHaveBeenCalledWith(JSON.stringify(result));
      expect(response.end).toHaveBeenCalledTimes(1);
    });

    it("Should handle message with default when no context", async () => {
      const logger = { info: jest.fn(), debug: jest.fn() } as any;
      (v4 as any as jest.SpyInstance).mockReturnValue("test id");
      const websocketServer = {
        on: jest.fn(),
      };
      (WebSocketServer as any as jest.SpyInstance).mockReturnValue(
        websocketServer
      );

      const handler = new RouteHandler({
        service: "testService",
        method: "testMethod",
        route: "/test-route",
      });

      handler.setLogger(logger);

      const result = { success: true, response: { test: "result" } } as any;
      const queue = { enqueue: jest.fn().mockResolvedValue(result) };
      const server = { queue } as any;
      const request = {
        on: jest.fn(),
        headers: {},
      } as any;
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

      const message = { test: "message" };

      request.on.mock.calls[0][1](Buffer.from(JSON.stringify(message)));

      request.on.mock.calls[2][1]();

      await promise;

      expect(v4).toHaveBeenCalledTimes(1);
      expect(v4).toHaveBeenCalledWith();
      expect(queue.enqueue).toHaveBeenCalledTimes(1);
      expect(queue.enqueue).toHaveBeenCalledWith({
        context: {
          data: {},
          origin: "RouteService.handle",
          tid: "test id",
        },
        args: [
          {
            test: "message",
          },
        ],
        method: "testMethod",
        service: "testService",
      });

      expect(response.writeHead).toHaveBeenCalledTimes(1);
      expect(response.writeHead).toHaveBeenCalledWith(200, {
        "Content-Type": "application/json",
      });
      expect(response.write).toHaveBeenCalledTimes(1);
      expect(response.write).toHaveBeenCalledWith(JSON.stringify(result));
      expect(response.end).toHaveBeenCalledTimes(1);
    });

    it("Should handle message and return raw result", async () => {
      const logger = { info: jest.fn(), debug: jest.fn() } as any;
      const websocketServer = {
        on: jest.fn(),
      };
      (WebSocketServer as any as jest.SpyInstance).mockReturnValue(
        websocketServer
      );

      const handler = new RouteHandler({
        service: "testService",
        method: "testMethod",
        route: "/test-route",
        raw: true,
      });

      handler.setLogger(logger);

      const result = { success: true, response: { test: "result" } } as any;
      const queue = { enqueue: jest.fn().mockResolvedValue(result) };
      const server = { queue } as any;
      const request = {
        on: jest.fn(),
        headers: {
          "skhail-route-context": JSON.stringify({ test: "context" }),
        },
      } as any;
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

      const message = { test: "message" };

      request.on.mock.calls[0][1](Buffer.from(JSON.stringify(message)));

      request.on.mock.calls[2][1]();

      await promise;

      expect(queue.enqueue).toHaveBeenCalledTimes(1);
      expect(queue.enqueue).toHaveBeenCalledWith({
        context: { test: "context" },
        args: [
          {
            test: "message",
          },
        ],
        method: "testMethod",
        service: "testService",
      });

      expect(response.writeHead).toHaveBeenCalledTimes(1);
      expect(response.writeHead).toHaveBeenCalledWith(200, {
        "Content-Type": "application/octet-stream",
      });
      expect(response.write).toHaveBeenCalledTimes(1);
      expect(response.write).toHaveBeenCalledWith({ test: "result" });
      expect(response.end).toHaveBeenCalledTimes(1);
    });

    it("Should transmit error 401", async () => {
      const logger = { info: jest.fn(), debug: jest.fn() } as any;
      const websocketServer = {
        on: jest.fn(),
      };
      (WebSocketServer as any as jest.SpyInstance).mockReturnValue(
        websocketServer
      );

      const handler = new RouteHandler({
        service: "testService",
        method: "testMethod",
        route: "/test-route",
      });

      handler.setLogger(logger);

      const result = {
        success: false,
        error: new SkhailError({ message: "test", name: "denied" }),
      } as any;
      const queue = { enqueue: jest.fn().mockResolvedValue(result) };
      const server = { queue } as any;
      const request = {
        on: jest.fn(),
        headers: {
          "skhail-route-context": JSON.stringify({ test: "context" }),
        },
      } as any;
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

      const message = { test: "message" };

      request.on.mock.calls[0][1](Buffer.from(JSON.stringify(message)));

      request.on.mock.calls[2][1]();

      await promise;

      expect(queue.enqueue).toHaveBeenCalledTimes(1);
      expect(queue.enqueue).toHaveBeenCalledWith({
        context: { test: "context" },
        args: [
          {
            test: "message",
          },
        ],
        method: "testMethod",
        service: "testService",
      });

      expect(response.writeHead).toHaveBeenCalledTimes(1);
      expect(response.writeHead).toHaveBeenCalledWith(401, "test", {
        "Content-Type": "application/json",
      });
      expect(response.write).toHaveBeenCalledTimes(1);
      expect(response.write).toHaveBeenCalledWith(JSON.stringify(result));
      expect(response.end).toHaveBeenCalledTimes(1);
    });

    it("Should transmit error 404", async () => {
      const logger = { info: jest.fn(), debug: jest.fn() } as any;
      const websocketServer = {
        on: jest.fn(),
      };
      (WebSocketServer as any as jest.SpyInstance).mockReturnValue(
        websocketServer
      );

      const handler = new RouteHandler({
        service: "testService",
        method: "testMethod",
        route: "/test-route",
      });

      handler.setLogger(logger);

      const result = {
        success: false,
        error: new SkhailError({ message: "test", name: "not_found" }),
      } as any;
      const queue = { enqueue: jest.fn().mockResolvedValue(result) };
      const server = { queue } as any;
      const request = {
        on: jest.fn(),
        headers: {
          "skhail-route-context": JSON.stringify({ test: "context" }),
        },
      } as any;
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

      const message = { test: "message" };

      request.on.mock.calls[0][1](Buffer.from(JSON.stringify(message)));

      request.on.mock.calls[2][1]();

      await promise;

      expect(queue.enqueue).toHaveBeenCalledTimes(1);
      expect(queue.enqueue).toHaveBeenCalledWith({
        context: { test: "context" },
        args: [
          {
            test: "message",
          },
        ],
        method: "testMethod",
        service: "testService",
      });

      expect(response.writeHead).toHaveBeenCalledTimes(1);
      expect(response.writeHead).toHaveBeenCalledWith(404, "test", {
        "Content-Type": "application/json",
      });
      expect(response.write).toHaveBeenCalledTimes(1);
      expect(response.write).toHaveBeenCalledWith(JSON.stringify(result));
      expect(response.end).toHaveBeenCalledTimes(1);
    });

    it("Should transmit error 500", async () => {
      const logger = { info: jest.fn(), debug: jest.fn() } as any;
      const websocketServer = {
        on: jest.fn(),
      };
      (WebSocketServer as any as jest.SpyInstance).mockReturnValue(
        websocketServer
      );

      const handler = new RouteHandler({
        service: "testService",
        method: "testMethod",
        route: "/test-route",
      });

      handler.setLogger(logger);

      const result = {
        success: false,
        error: new SkhailError({ message: "test", name: "unexpected" }),
      } as any;
      const queue = { enqueue: jest.fn().mockResolvedValue(result) };
      const server = { queue } as any;
      const request = {
        on: jest.fn(),
        headers: {
          "skhail-route-context": JSON.stringify({ test: "context" }),
        },
      } as any;
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

      const message = { test: "message" };

      request.on.mock.calls[0][1](Buffer.from(JSON.stringify(message)));

      request.on.mock.calls[2][1]();

      await promise;

      expect(queue.enqueue).toHaveBeenCalledTimes(1);
      expect(queue.enqueue).toHaveBeenCalledWith({
        context: { test: "context" },
        args: [
          {
            test: "message",
          },
        ],
        method: "testMethod",
        service: "testService",
      });

      expect(response.writeHead).toHaveBeenCalledTimes(1);
      expect(response.writeHead).toHaveBeenCalledWith(500, "test", {
        "Content-Type": "application/json",
      });
      expect(response.write).toHaveBeenCalledTimes(1);
      expect(response.write).toHaveBeenCalledWith(JSON.stringify(result));
      expect(response.end).toHaveBeenCalledTimes(1);
    });

    it("Should respond with 500 status and error details", async () => {
      const logger = { info: jest.fn(), debug: jest.fn() } as any;
      const websocketServer = {
        on: jest.fn(),
      };
      (WebSocketServer as any as jest.SpyInstance).mockReturnValue(
        websocketServer
      );

      const handler = new RouteHandler({
        service: "testService",
        method: "testMethod",
        route: "/test-route",
      });

      handler.setLogger(logger);

      const queue = {
        enqueue: jest.fn().mockRejectedValue("test error"),
      };
      const server = { queue } as any;
      const request = {
        on: jest.fn(),
        headers: {
          "skhail-route-context": JSON.stringify({ test: "context" }),
        },
      } as any;
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

      const message = { test: "message" };

      request.on.mock.calls[0][1](Buffer.from(JSON.stringify(message)));

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
            message: "test error",
            name: "unexpected",
            details: {},
          },
        })
      );
      expect(response.end).toHaveBeenCalledTimes(1);
    });
  });

  describe("match", () => {
    it("Should return false when url does not start with /test-route", () => {
      const handler = new RouteHandler({
        service: "testService",
        method: "testMethod",
        route: "/test-route",
      });

      expect(handler.match("url test")).toBeFalsy();
    });

    it("Should return true when url starts with /test-route", () => {
      const handler = new RouteHandler({
        service: "testService",
        method: "testMethod",
        route: "/test-route",
      });

      expect(handler.match("/test-route")).toBeTruthy();
    });

    it("Should return true when url is /test-route/", () => {
      const handler = new RouteHandler({
        service: "testService",
        method: "testMethod",
        route: "/test-route",
      });

      expect(handler.match("/test-route/")).toBeFalsy();
    });

    it("Should return false when url starts with /test-route", () => {
      const handler = new RouteHandler({
        service: "testService",
        method: "testMethod",
        route: "/test-route",
      });

      expect(handler.match("/test-routeurl test")).toBeFalsy();
    });

    it("Should return false when url starts with test-route/", () => {
      const handler = new RouteHandler({
        service: "testService",
        method: "testMethod",
        route: "/test-route",
      });

      expect(handler.match("test-route/url test")).toBeFalsy();
    });
  });

  describe("getParameters", () => {
    it("Should return parameters", async () => {
      const groups = { prop: "TestCase" };
      const patternExec = jest.fn().mockReturnValue({ pathname: { groups } });
      jest.spyOn(globalThis, "URLPattern" as any).mockReturnValue({
        exec: patternExec,
      });

      const handler = new RouteHandler({
        service: "testService",
        method: "testMethod",
        route: "/test-route",
      });

      const request = { url: "/test url", on: jest.fn() };

      const promise = handler["getParameters"](request as any);

      expect(patternExec).toHaveBeenCalledTimes(1);
      expect(patternExec).toHaveBeenCalledWith("http://example.com/test url");

      expect(request.on).toHaveBeenCalledTimes(3);
      expect(request.on.mock.calls[0][0]).toBe("data");
      expect(request.on.mock.calls[1][0]).toBe("error");
      expect(request.on.mock.calls[2][0]).toBe("end");

      request.on.mock.calls[0][1](Buffer.from('{"test":"property"}'));

      request.on.mock.calls[2][1]();

      const parameters = await promise;

      expect(parameters).toStrictEqual({
        test: "property",
        prop: "TestCase",
      });
    });

    it("Should return only url parameters", async () => {
      const groups = { prop: "TestCase" };
      const patternExec = jest.fn().mockReturnValue({ pathname: { groups } });
      jest.spyOn(globalThis, "URLPattern" as any).mockReturnValue({
        exec: patternExec,
      });

      const handler = new RouteHandler({
        service: "testService",
        method: "testMethod",
        route: "/test-route",
      });

      const request = { method: "GET", url: "/test url", on: jest.fn() };

      const parameters = await handler["getParameters"](request as any);

      expect(patternExec).toHaveBeenCalledTimes(1);
      expect(patternExec).toHaveBeenCalledWith("http://example.com/test url");

      expect(request.on).toHaveBeenCalledTimes(0);

      expect(parameters).toStrictEqual({
        prop: "TestCase",
      });
    });

    it("Should reject when request fails", async () => {
      const groups = { prop: "TestCase" };
      const patternExec = jest.fn().mockReturnValue({ pathname: { groups } });
      jest.spyOn(globalThis, "URLPattern" as any).mockReturnValue({
        exec: patternExec,
      });

      const handler = new RouteHandler({
        service: "testService",
        method: "testMethod",
        route: "/test-route",
      });

      const request = { method: "POST", url: "/test url", on: jest.fn() };

      const promise = handler["getParameters"](request as any);

      request.on.mock.calls[0][1](Buffer.from('{"test":"property"}'));

      request.on.mock.calls[1][1]("test error");

      await expect(promise).rejects.toThrow("test error");
    });
  });
});
