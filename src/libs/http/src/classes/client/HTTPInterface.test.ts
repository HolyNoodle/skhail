/**
 * @group unit
 */
import { HTTPInterface } from "./HTTPInterface";
import { HTTPProtocols } from "./types";
import { ConsoleLogger, MultiLogger, SkhailClient } from "@skhail/core";
import { HTTPClientQueue } from "./Queue";
import { HTTPLogger } from "./HTTPLogger";

jest.mock("@skhail/core");
jest.mock("./Queue");
jest.mock("./HTTPLogger");

describe("HTTPInterface", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("Should instantiate the client", () => {
    const client = new HTTPInterface();

    expect(client).toBeInstanceOf(HTTPInterface);
  });

  describe("start", () => {
    it("Should configure SkhailClient with HTTP queue", async () => {
      const skhailClient = { start: jest.fn() } as any;
      (SkhailClient as any as jest.SpyInstance).mockImplementation(
        () => skhailClient
      );
      const queue = {} as any;
      (HTTPClientQueue as any as jest.SpyInstance).mockImplementation(
        () => queue
      );
      const logger = {
        log: "test",
        setInstance: jest.fn(),
        getInstance: jest.fn().mockReturnValue("instanceName"),
      } as any;
      (HTTPLogger as any as jest.SpyInstance).mockImplementation(() => logger);

      const client = new HTTPInterface({
        host: "host",
        logger,
        port: 12,
        protocol: HTTPProtocols.HTTP,
        interceptor: jest.fn(),
      });

      await client.start();

      expect(SkhailClient).toHaveBeenCalledTimes(1);
      expect(SkhailClient).toHaveBeenCalledWith({
        logger: expect.any(MultiLogger),
        queue,
      });

      expect(skhailClient.start).toHaveBeenCalledTimes(1);
      expect(skhailClient.start).toHaveBeenCalledWith();

      expect(HTTPClientQueue).toHaveBeenCalledTimes(1);
      expect(HTTPClientQueue).toHaveBeenCalledWith({
        url: "http://host:12",
        interceptor: expect.any(Function),
      });
      expect(HTTPLogger).toHaveBeenCalledTimes(1);
      expect(HTTPLogger).toHaveBeenCalledWith({
        url: "http://host:12",
        batchSize: 100,
        interval: 1000,
      });
    });

    it("Should not set HTTPLogger wrapper when transmitlog is false", async () => {
      const skhailClient = { start: jest.fn() } as any;
      (SkhailClient as any as jest.SpyInstance).mockImplementation(
        () => skhailClient
      );
      const queue = {} as any;
      (HTTPClientQueue as any as jest.SpyInstance).mockImplementation(
        () => queue
      );
      const logger = {
        log: "test other",
        setInstance: jest.fn(),
        getInstance: jest.fn().mockReturnValue("instanceName"),
      } as any;

      const client = new HTTPInterface({
        host: "host",
        logger,
        port: 12,
        transmitLogs: false,
        protocol: HTTPProtocols.HTTP,
      });

      await client.start();

      expect(SkhailClient).toHaveBeenCalledTimes(1);
      expect(SkhailClient).toHaveBeenCalledWith({
        logger: expect.any(MultiLogger),
        queue,
      });

      expect(skhailClient.start).toHaveBeenCalledTimes(1);
      expect(skhailClient.start).toHaveBeenCalledWith();

      expect(HTTPClientQueue).toHaveBeenCalledTimes(1);
      expect(HTTPClientQueue).toHaveBeenCalledWith({
        url: "http://host:12",
      });
      expect(HTTPLogger).toHaveBeenCalledTimes(0);
    });
  });

  describe("stop", () => {
    it("Should stop SkhailClient", async () => {
      const skhailClient = { start: jest.fn(), stop: jest.fn() } as any;
      (SkhailClient as any as jest.SpyInstance).mockImplementation(
        () => skhailClient
      );
      const queue = {} as any;
      (HTTPClientQueue as any as jest.SpyInstance).mockImplementation(
        () => queue
      );

      const logger = new ConsoleLogger();
      const client = new HTTPInterface({
        host: "host",
        logger,
        port: 12,
        protocol: HTTPProtocols.HTTP,
      });

      await client.start();

      await client.stop();

      expect(skhailClient.stop).toHaveBeenCalledTimes(1);
      expect(skhailClient.stop).toHaveBeenCalledWith();
    });
  });

  describe("get", () => {
    it("Should call skhail client get", async () => {
      const skhailClient = { start: jest.fn(), get: jest.fn() } as any;
      (SkhailClient as any as jest.SpyInstance).mockImplementation(
        () => skhailClient
      );
      const queue = {} as any;
      (HTTPClientQueue as any as jest.SpyInstance).mockImplementation(
        () => queue
      );

      const logger = new ConsoleLogger();
      const client = new HTTPInterface({
        host: "host",
        logger,
        port: 12,
        protocol: HTTPProtocols.HTTP,
      });

      await client.start();

      const classObject = {} as any;
      client.get(classObject);

      expect(skhailClient.get).toHaveBeenCalledTimes(1);
      expect(skhailClient.get).toHaveBeenCalledWith(
        classObject,
        undefined,
        undefined
      );
    });
  });
});
