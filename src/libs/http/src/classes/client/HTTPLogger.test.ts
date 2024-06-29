/**
 * @group unit
 */
import { LogLevel } from "@skhail/core";
import { HTTPLogger } from "./HTTPLogger";

const fetchSpy = jest.fn();
global.fetch = fetchSpy;

describe("HTTPLogger", () => {
  beforeEach(() => {
    jest.resetAllMocks();

    jest.spyOn(global, "setInterval").mockReturnValue(123 as any);
    jest.spyOn(global, "clearInterval");
  });

  it("Should instantiate the logger", () => {
    const logger = new HTTPLogger({
      url: "test url",
      batchSize: 2,
      interval: 50,
    });

    expect(logger).toBeInstanceOf(HTTPLogger);
  });

  describe("log", () => {
    it("Should post message to the buffer", async () => {
      const logger = new HTTPLogger({
        url: "test url",
        batchSize: 2,
        interval: 50,
      });

      const message = { test: "message", level: LogLevel.INFO };

      logger.log(message as any);

      expect(logger["buffer"]).toHaveLength(1);
      expect(logger["buffer"]).toStrictEqual([message]);
    });
  });

  describe("prepare", () => {
    it("Should set interval", async () => {
      const logger = new HTTPLogger({
        url: "test url",
        batchSize: 2,
        interval: 50,
      });

      await logger.prepare();

      expect(setInterval).toHaveBeenCalledTimes(1);
      expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 50);
    });

    it("Should send batch logs", async () => {
      const logger = new HTTPLogger({
        url: "test url",
        batchSize: 2,
        interval: 50,
      });

      const message = { test: "message", level: LogLevel.INFO };
      const messages = [message, message, message];
      await logger.prepare();

      logger["sendLogs"] = jest.fn();
      logger["buffer"] = messages as any;
      const [batchFunction] = (setInterval as any).mock.calls[0];

      batchFunction();

      expect(logger["sendLogs"]).toHaveBeenCalledTimes(1);
      expect(logger["sendLogs"]).toHaveBeenCalledWith([message, message]);

      batchFunction();

      expect(logger["sendLogs"]).toHaveBeenCalledTimes(2);
      expect(logger["sendLogs"]).toHaveBeenNthCalledWith(2, [message]);
    });

    it("Should not send batch logs when empty", async () => {
      const logger = new HTTPLogger({
        url: "test url",
        batchSize: 2,
        interval: 50,
      });

      await logger.prepare();

      logger["buffer"] = [];
      logger["sendLogs"] = jest.fn();
      const [batchFunction] = (setInterval as any).mock.calls[0];

      batchFunction();

      expect(logger["sendLogs"]).toHaveBeenCalledTimes(0);
    });
  });

  describe("cleanup", () => {
    it("Should clean interval", async () => {
      const logger = new HTTPLogger({
        url: "test url",
        batchSize: 2,
        interval: 50,
      });

      await logger.prepare();
      await logger.cleanup();

      expect(clearInterval).toHaveBeenCalledTimes(1);
      expect(clearInterval).toHaveBeenCalledWith(123);
    });

    it("Should not clean interval when timer id not set", async () => {
      const logger = new HTTPLogger({
        url: "test url",
        batchSize: 2,
        interval: 50,
      });

      await logger.cleanup();

      expect(clearInterval).toHaveBeenCalledTimes(0);
    });
  });

  describe("sendLogs", () => {
    it("Should send log batch to API", async () => {
      const logger = new HTTPLogger({
        url: "test url",
        batchSize: 2,
        interval: 50,
      });

      const message = { test: "message", level: LogLevel.INFO };
      const messages = [message, message, message];

      await logger["sendLogs"](messages as any);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith("test url/logs", {
        method: "post",
        body: JSON.stringify(messages),
      });
    });
  });
});
