/**
 * @group unit
 */
import { WebSocketService } from "./WebSocketService";
import { WebSocketHandler } from "./Handlers/WebSocketHandler";
import { createServer } from "http";
import { v4 } from "uuid";
import { HTTPProtocols } from "../client/types";

jest.mock("http");
jest.mock("https");
jest.mock("uuid");

class TestService extends WebSocketService {}

describe("WebSocketService", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers().setSystemTime(new Date(2022, 0, 1, 0, 0, 0, 0));
  });
  it("Should instantiate WebSocketService", () => {
    const service = new TestService();

    expect(service).toBeInstanceOf(WebSocketService);
  });

  describe("prepare", () => {
    it("Should set websocket handler", async () => {
      const logger = { debug: jest.fn(), info: jest.fn() };
      const service = new TestService();

      service.setLogger(logger as any);

      const httpServer = {
        on: jest.fn(),
        listen: jest.fn().mockImplementation((_1, _2, cb) => cb()),
      };
      (createServer as any as jest.SpyInstance).mockReturnValue(httpServer);

      await service.prepare();

      expect(service["handlers"]).toHaveLength(1);
      expect(service["handlers"][0]).toBeInstanceOf(WebSocketHandler);
    });

    it("Should register interval for cleaning request ids", async () => {
      const logger = { debug: jest.fn(), info: jest.fn() };
      const service = new TestService();

      const setIntervalSpy = jest
        .spyOn(globalThis, "setInterval")
        .mockReturnValue("123" as any);

      service.setLogger(logger as any);

      const httpServer = {
        on: jest.fn(),
        listen: jest.fn().mockImplementation((_1, _2, cb) => cb()),
      };
      (createServer as any as jest.SpyInstance).mockReturnValue(httpServer);

      await service.prepare();

      const expiresAt = new Date();

      expiresAt.setTime(expiresAt.getTime() + 10);
      service["requests"]?.set("testId", {
        method: "testMethod",
        args: ["value", "muche"],
        expiresAt: new Date(expiresAt),
      });

      expiresAt.setTime(expiresAt.getTime() - 10);
      service["requests"]?.set("testId2", {
        method: "testMethod",
        args: ["value", "muche"],
        expiresAt: new Date(expiresAt),
      });

      expect(service["handlers"]).toHaveLength(1);
      expect(service["handlers"][0]).toBeInstanceOf(WebSocketHandler);

      expect(setIntervalSpy).toHaveBeenCalledTimes(1);
      expect(service["interval"]).toBe("123");

      expect(setIntervalSpy.mock.calls[0][1]).toBe(5000);

      setIntervalSpy.mock.calls[0][0]();

      expect(service["requests"]?.has("testId")).toBeTruthy();
      expect(service["requests"]?.has("testId2")).toBeFalsy();
    });

    it("Should register interval for cleaning request ids and clear interval when requests is undefined", async () => {
      const logger = { debug: jest.fn(), info: jest.fn() };
      const service = new TestService();

      const setIntervalSpy = jest
        .spyOn(globalThis, "setInterval")
        .mockReturnValue("123" as any);

      const clearIntervalSpy = jest.spyOn(globalThis, "clearInterval");

      service.setLogger(logger as any);

      const httpServer = {
        on: jest.fn(),
        listen: jest.fn().mockImplementation((_1, _2, cb) => cb()),
      };
      (createServer as any as jest.SpyInstance).mockReturnValue(httpServer);

      await service.prepare();

      service["requests"] = undefined;

      expect(setIntervalSpy).toHaveBeenCalledTimes(1);
      expect(service["interval"]).toBe("123");

      expect(setIntervalSpy.mock.calls[0][1]).toBe(5000);

      setIntervalSpy.mock.calls[0][0]();

      expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
      expect(clearIntervalSpy).toHaveBeenCalledWith("123");
    });
  });

  describe("cleanup", () => {
    it("Should set websocket handler", async () => {
      const logger = { debug: jest.fn(), info: jest.fn() };
      const service = new TestService();

      const clearIntervalSpy = jest.spyOn(globalThis, "clearInterval");

      service.setLogger(logger as any);

      service["httpServer"] = {
        close: jest.fn().mockImplementation((cb) => cb()),
      } as any;

      await service.cleanup();

      expect(service["requests"]).toBeUndefined();
      expect(service["httpServer"].close).toHaveBeenCalledTimes(1);

      expect(clearIntervalSpy).toHaveBeenCalledTimes(0);
    });

    it("Should clear interval when interval id is defined", async () => {
      const logger = { debug: jest.fn(), info: jest.fn() };
      const service = new TestService();

      service["interval"] = "123" as any;

      const clearIntervalSpy = jest.spyOn(globalThis, "clearInterval");

      service.setLogger(logger as any);

      service["httpServer"] = {
        close: jest.fn().mockImplementation((cb) => cb()),
      } as any;

      await service.cleanup();

      expect(service["requests"]).toBeUndefined();
      expect(service["httpServer"].close).toHaveBeenCalledTimes(1);

      expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
      expect(clearIntervalSpy).toHaveBeenCalledWith("123");
    });
  });

  describe("handleConnectionRequest", () => {
    it("Should handle request", () => {
      const logger = { debug: jest.fn(), info: jest.fn() };
      const service = new TestService();

      service.setLogger(logger as any);

      service["testMethod"] = jest.fn();
      service["requests"] = new Map();
      service["requests"].set("testId", {
        method: "testMethod",
        args: ["value", "muche"],
        expiresAt: new Date(),
      });
      const handler = service["handleConnectionRequest"](service);

      const websocket = { socket: "test" };

      handler(websocket as any, "testId");

      expect(service["testMethod"]).toHaveBeenCalledTimes(1);
      expect(service["testMethod"]).toHaveBeenCalledWith(
        websocket,
        "value",
        "muche"
      );
      expect(service["requests"].has("testId")).toBeFalsy();
    });

    it("Should fail when id does not exists", () => {
      const logger = { debug: jest.fn(), info: jest.fn() };
      const service = new TestService();

      service.setLogger(logger as any);

      service["testMethod"] = jest.fn();
      service["requests"] = new Map();
      service["requests"].set("id", {
        method: "testMethod",
        args: ["value", "muche"],
        expiresAt: new Date(),
      });
      const handler = service["handleConnectionRequest"](service);

      const websocket = { socket: "test" };

      expect(() => handler(websocket as any, "testId")).toThrow(
        "Id does not exists or already consumed"
      );
    });

    it("Should fail when method does not exists", () => {
      const logger = { debug: jest.fn(), info: jest.fn() };
      const service = new TestService();

      service.setLogger(logger as any);

      service["testMethod"] = jest.fn();
      service["requests"] = new Map();
      service["requests"].set("testId", {
        method: "method",
        args: ["value", "muche"],
        expiresAt: new Date(),
      });
      const handler = service["handleConnectionRequest"](service);

      const websocket = { socket: "test" };

      expect(() => handler(websocket as any, "testId")).toThrow(
        "Requested method has not been found"
      );
    });

    describe("negociate", () => {
      it("Should register id and return http url", async () => {
        const id = "testId";
        (v4 as any as jest.SpyInstance).mockReturnValue(id);

        const logger = { debug: jest.fn(), info: jest.fn() };
        const service = new TestService();

        service.setLogger(logger as any);
        service["requests"] = new Map();

        const url = await (service.negociate as any)(
          "testMethod",
          "value",
          "muche"
        );

        expect(service["requests"].has(id)).toBeTruthy();
        expect(v4).toHaveBeenCalledTimes(1);
        expect(v4).toHaveBeenCalledWith();
        expect(url).toBe("/socket/testId");
      });

      it("Should register id and return https url", async () => {
        const id = "testId";
        (v4 as any as jest.SpyInstance).mockReturnValue(id);

        const logger = { debug: jest.fn(), info: jest.fn() };
        const service = new TestService({}, { protocol: HTTPProtocols.HTTPS });

        service.setLogger(logger as any);
        service["requests"] = new Map();

        const url = await (service.negociate as any)(
          "testMethod",
          "value",
          "muche"
        );

        expect(service["requests"].has(id)).toBeTruthy();
        expect(v4).toHaveBeenCalledTimes(1);
        expect(v4).toHaveBeenCalledWith();
        expect(url).toBe("/socket/testId");
      });
    });
  });
});
