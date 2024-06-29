/**
 * @group unit
 */
import { WebSocketServer } from "ws";
import { RouteHandler } from "./RouteHandler";
import { WebSocketHandler } from "./WebSocketHandler";

jest.mock("ws");

describe("WebSocketHandler", () => {
  it("Should instantiate WebSocketHandler", () => {
    const callback = jest.fn();
    const handler = new WebSocketHandler("/test-route", callback);

    const logger = {} as any;

    handler.setLogger(logger);

    expect(handler).toBeInstanceOf(WebSocketHandler);
    expect(handler["pattern"]["pathname"]).toStrictEqual("/test-route/:id");
  });

  it("Should instantiate WebSocketHandler with trailing slash", () => {
    const callback = jest.fn();
    const handler = new WebSocketHandler("/test-route/", callback);

    const logger = {} as any;

    handler.setLogger(logger);

    expect(handler).toBeInstanceOf(WebSocketHandler);
    expect(handler["pattern"]["pathname"]).toStrictEqual("/test-route/:id");
  });

  describe("prepare", () => {
    it("Should start websocket server", async () => {
      const websocketServer = { on: jest.fn() };
      (WebSocketServer as any as jest.SpyInstance).mockReturnValue(
        websocketServer
      );

      const callback = jest.fn();
      const handler = new WebSocketHandler("/test-route", callback);

      const logger = {} as any;

      handler.setLogger(logger);

      await handler.prepare();

      expect(WebSocketServer).toHaveBeenCalledTimes(1);
      expect(WebSocketServer).toHaveBeenCalledWith({ noServer: true });

      expect(websocketServer.on).toHaveBeenCalledTimes(2);
      expect(websocketServer.on.mock.calls[0][0]).toBe("error");
      expect(websocketServer.on.mock.calls[1][0]).toBe("connection");
    });

    it("Should log error when server triggers error", async () => {
      const websocketServer = { on: jest.fn() };
      (WebSocketServer as any as jest.SpyInstance).mockReturnValue(
        websocketServer
      );

      const callback = jest.fn();
      const handler = new WebSocketHandler("/test-route", callback);

      const logger = { error: jest.fn() } as any;

      handler.setLogger(logger);

      await handler.prepare();

      websocketServer.on.mock.calls[0][1]("test error");

      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith("WebSocket server error", {
        error: {
          name: "unexpected",
          details: {},
          message: "test error",
          name: "unexpected",
        },
      });
    });

    it("Should not register listener on connection and close connection", async () => {
      const logger = { info: jest.fn(), debug: jest.fn() } as any;
      const websocketServer = { on: jest.fn() };
      (WebSocketServer as any as jest.SpyInstance).mockReturnValue(
        websocketServer
      );

      const callback = jest.fn();
      const handler = new WebSocketHandler("/test-route", callback);

      handler.setLogger(logger);

      await handler.prepare();

      const webSocket = { close: jest.fn() } as any;
      const request = {} as any;
      const server = {} as any;

      websocketServer.on.mock.calls[1][1](webSocket, request, server);

      expect(webSocket.close).toHaveBeenCalledTimes(1);
      expect(webSocket.close).toHaveBeenCalledWith(
        1007,
        "WebSocket connection premature closing: no id provided"
      );
    });

    it("Should register listener on connection", async () => {
      const logger = { info: jest.fn(), debug: jest.fn() } as any;
      const websocketServer = { on: jest.fn() };
      (WebSocketServer as any as jest.SpyInstance).mockReturnValue(
        websocketServer
      );

      const callback = jest.fn();
      const handler = new WebSocketHandler("/test-route", callback);

      handler.setLogger(logger);

      await handler.prepare();

      const webSocket = {
        close: jest.fn(),
        on: jest.fn(),
        send: jest.fn(),
      } as any;
      const request = { url: "/test-route/event" } as any;

      websocketServer.on.mock.calls[1][1](webSocket, request);

      expect(webSocket.close).toHaveBeenCalledTimes(0);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(webSocket, "event");
    });

    it("Should unregister listener on close", async () => {
      const logger = { info: jest.fn(), debug: jest.fn() } as any;
      const websocketServer = { on: jest.fn() };
      (WebSocketServer as any as jest.SpyInstance).mockReturnValue(
        websocketServer
      );

      const callback = jest.fn();
      const handler = new WebSocketHandler("/test-route", callback);

      handler.setLogger(logger);

      await handler.prepare();

      const webSocket = {
        close: jest.fn(),
        on: jest.fn(),
        send: jest.fn(),
      } as any;
      const request = { url: "/test-route/event" } as any;
      const emitter = {
        on: jest.fn().mockResolvedValue(void 0),
        off: jest.fn().mockResolvedValue(void 0),
      } as any;
      const server = { getEmitter: jest.fn().mockReturnValue(emitter) } as any;

      websocketServer.on.mock.calls[1][1](webSocket, request, server);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(webSocket, "event");
    });

    it("Should unregister listener on error", async () => {
      const logger = {
        info: jest.fn(),
        warning: jest.fn(),
        debug: jest.fn(),
      } as any;
      const websocketServer = { on: jest.fn() };
      (WebSocketServer as any as jest.SpyInstance).mockReturnValue(
        websocketServer
      );

      const callback = jest.fn().mockImplementation(() => {
        throw new Error("test error");
      });
      const handler = new WebSocketHandler("/test-route", callback);

      handler.setLogger(logger);

      await handler.prepare();

      const webSocket = {
        close: jest.fn(),
        on: jest.fn(),
        send: jest.fn(),
      } as any;
      const request = { url: "/test-route/event" } as any;
      const server = {
        getEmitter: jest.fn().mockReturnValue(undefined),
      } as any;

      websocketServer.on.mock.calls[1][1](webSocket, request, server);

      expect(webSocket.close).toHaveBeenCalledTimes(1);
      expect(webSocket.close).toHaveBeenCalledWith(3000, "test error");
    });
  });

  describe("cleanup", () => {
    it("Should close sockets", async () => {
      const logger = { info: jest.fn(), debug: jest.fn() } as any;
      const webSocket = { close: jest.fn() };
      const websocketServer = {
        on: jest.fn(),
        close: jest.fn().mockImplementation((cb) => cb()),
        clients: [webSocket, webSocket],
      };
      (WebSocketServer as any as jest.SpyInstance).mockReturnValue(
        websocketServer
      );

      const callback = jest.fn();
      const handler = new WebSocketHandler("/test-route", callback);

      handler.setLogger(logger);

      await handler.prepare();

      await handler.cleanup();

      expect(websocketServer.close).toHaveBeenCalledTimes(1);
      expect(webSocket.close).toHaveBeenCalledTimes(2);
    });

    it("Should reject with error", async () => {
      const logger = { info: jest.fn(), debug: jest.fn() } as any;
      const webSocket = { close: jest.fn() };
      const websocketServer = {
        on: jest.fn(),
        close: jest.fn().mockImplementation((cb) => cb("test message")),
        clients: [webSocket, webSocket],
      };
      (WebSocketServer as any as jest.SpyInstance).mockReturnValue(
        websocketServer
      );

      const callback = jest.fn();
      const handler = new WebSocketHandler("/test-route", callback);

      handler.setLogger(logger);

      await handler.prepare();

      await expect(handler.cleanup()).rejects.toThrow("test message");

      expect(websocketServer.close).toHaveBeenCalledTimes(1);
      expect(webSocket.close).toHaveBeenCalledTimes(2);
    });

    it("Should resolve when server is undefined", async () => {
      const logger = { info: jest.fn(), debug: jest.fn() } as any;
      const webSocket = { close: jest.fn() };
      const websocketServer = {
        on: jest.fn(),
        close: jest.fn().mockImplementation((cb) => cb("test message")),
        clients: [webSocket, webSocket],
      };
      (WebSocketServer as any as jest.SpyInstance).mockReturnValue(
        websocketServer
      );

      const callback = jest.fn();
      const handler = new WebSocketHandler("/test-route", callback);

      handler.setLogger(logger);

      await handler.prepare();

      handler["webSocketServer"] = undefined;

      await handler.cleanup();

      expect(websocketServer.close).toHaveBeenCalledTimes(0);
      expect(webSocket.close).toHaveBeenCalledTimes(0);
    });
  });

  describe("upgrade", () => {
    it("Should register server upgrade", async () => {
      const logger = { info: jest.fn(), debug: jest.fn() } as any;
      const webSocket = { close: jest.fn() };
      const websocketServer = {
        on: jest.fn(),
        handleUpgrade: jest.fn(),
        emit: jest.fn(),
      };
      (WebSocketServer as any as jest.SpyInstance).mockReturnValue(
        websocketServer
      );

      const callback = jest.fn();
      const handler = new WebSocketHandler("/test-route", callback);

      handler.setLogger(logger);

      await handler.prepare();

      const server = {} as any;
      const request = {} as any;
      const socket = {} as any;
      const head = {} as any;

      handler.upgrade(server, request, socket, head);

      expect(websocketServer.handleUpgrade).toHaveBeenCalledTimes(1);
      expect(websocketServer.handleUpgrade.mock.calls[0][0]).toBe(request);
      expect(websocketServer.handleUpgrade.mock.calls[0][1]).toBe(socket);
      expect(websocketServer.handleUpgrade.mock.calls[0][2]).toBe(head);

      websocketServer.handleUpgrade.mock.calls[0][3](webSocket);

      expect(websocketServer.emit).toHaveBeenCalledTimes(1);
      expect(websocketServer.emit).toHaveBeenCalledWith(
        "connection",
        webSocket,
        request
      );
    });
  });

  describe("handle", () => {
    it("Should return 404", async () => {
      const logger = { info: jest.fn(), debug: jest.fn() } as any;
      const websocketServer = {
        on: jest.fn(),
      };
      (WebSocketServer as any as jest.SpyInstance).mockReturnValue(
        websocketServer
      );

      const callback = jest.fn();
      const handler = new WebSocketHandler("/test-route", callback);

      handler.setLogger(logger);

      await handler.prepare();

      const result = { success: true, result: { test: "result" } } as any;
      const queue = { enqueue: jest.fn().mockResolvedValue(result) };
      const server = { getQueue: jest.fn().mockReturnValue(queue) } as any;
      const request = { on: jest.fn() } as any;
      const response = {
        writeHead: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      } as any;

      await handler.handle(server, request, response);

      expect(response.writeHead).toHaveBeenCalledTimes(1);
      expect(response.writeHead).toHaveBeenCalledWith(404);
      expect(response.write).toHaveBeenCalledTimes(0);
      expect(response.end).toHaveBeenCalledTimes(1);
    });
  });

  describe("match", () => {
    it("Should return false when url does not have an id", () => {
      const callback = jest.fn();
      const handler = new WebSocketHandler("/test-route", callback);

      const logger = {} as any;

      handler.setLogger(logger);

      expect(handler.match("/test-route")).toBeFalsy();
    });

    it("Should return true when url have an id", () => {
      const callback = jest.fn();
      const handler = new WebSocketHandler("/test-route", callback);

      const logger = {} as any;

      handler.setLogger(logger);

      expect(handler.match("/test-route/event")).toBeTruthy();
    });

    it("Should return false when url starts with /test-route", () => {
      const callback = jest.fn();
      const handler = new WebSocketHandler("/test-route", callback);

      const logger = {} as any;

      handler.setLogger(logger);

      expect(handler.match("/test-routeevent")).toBeFalsy();
    });

    it("Should return false when url starts with test-route/", () => {
      const callback = jest.fn();
      const handler = new WebSocketHandler("/test-route", callback);

      const logger = {} as any;

      handler.setLogger(logger);

      expect(handler.match("test-route/url")).toBeFalsy();
    });
  });
});
