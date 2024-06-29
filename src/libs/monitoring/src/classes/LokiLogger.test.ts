/**
 * @group unit
 */
import fetch from "node-fetch-commonjs";

import { LogLevel, LogMessage } from "@skhail/core";

import { LokiLogger, LokiLoggerOptions } from "./LokiLogger";

jest.mock("node-fetch-commonjs");

describe("LokiLogger", () => {
  let options: LokiLoggerOptions;

  beforeEach(() => {
    options = {
      app: "test",
      url: "http://localhost:3100",
      sendBatchTime: 1000,
      batchSize: 3,
      levels: [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARNING, LogLevel.ERROR],
      env: "test",
    };

    jest.useFakeTimers();
    jest.setSystemTime(new Date("2021-01-01T00:00:00.000Z").getTime());

    jest.spyOn(global, "setInterval").mockReturnValue(123 as any);
    jest.spyOn(global, "clearInterval");
    jest.spyOn(global.console, "error");
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe("prepare", () => {
    it("should start the timer", async () => {
      const logger = new LokiLogger(options);

      await logger.prepare();

      expect(setInterval).toHaveBeenCalledTimes(1);
      expect(setInterval).toHaveBeenLastCalledWith(
        expect.any(Function),
        options.sendBatchTime
      );
    });

    it("should not trigger send logs when no logs", async () => {
      const logger = new LokiLogger(options);
      logger["sendLogs"] = jest.fn().mockResolvedValue(undefined);

      await logger.prepare();
      (setInterval as any).mock.calls[0][0]();

      expect(logger["timer"]).toBe(123);
      expect(logger["sendLogs"]).toHaveBeenCalledTimes(0);
    });
    it("should trigger send logs when there is logs", async () => {
      const logger = new LokiLogger(options);
      logger["sendLogs"] = jest.fn().mockResolvedValue(undefined);

      const logMessage: LogMessage = {
        date: Date.now(),
        level: LogLevel.DEBUG,
        message: "test",
        scope: "test:test",
        instance: "test",
        details: {
          props: "string",
        },
      };

      await logger.prepare();

      logger.logMessage(logMessage);

      await (setInterval as any).mock.calls[0][0]();

      expect(logger["sendLogs"]).toHaveBeenCalledTimes(1);
      expect(logger["sendLogs"]).toHaveBeenCalledWith([logMessage]);
    });

    it("should trigger send logs when multiple times", async () => {
      const logger = new LokiLogger(options);
      logger["sendLogs"] = jest.fn().mockResolvedValue(undefined);

      const logMessage: LogMessage = {
        date: Date.now(),
        level: LogLevel.DEBUG,
        message: "test",
        scope: "test:test",
        instance: "test",
        details: {
          props: "string",
        },
      };

      await logger.prepare();
      const messages = [
        logMessage,
        {
          date: Date.now(),
          level: LogLevel.TRACE,
          message: "test",
          scope: "test:test",
          instance: "test",
          details: {
            props: "string",
          },
        },
        {
          date: Date.now(),
          level: LogLevel.INFO,
          message: "test",
          scope: "test:test",
          instance: "test",
          details: {
            props: "string",
          },
        },
        {
          date: Date.now(),
          level: LogLevel.WARNING,
          message: "test",
          scope: "test:test",
          instance: "test",
          details: {
            props: "string",
          },
        },
        {
          date: Date.now(),
          level: LogLevel.ERROR,
          message: "test",
          scope: "test:test",
          instance: "test",
          details: {
            props: "string",
          },
        },
      ];

      for (let m of messages) {
        logger.logMessage(m);
      }

      await (setInterval as any).mock.calls[0][0]();
      await (setInterval as any).mock.calls[0][0]();

      expect(logger["sendLogs"]).toHaveBeenCalledTimes(2);
      expect(logger["sendLogs"]).toHaveBeenNthCalledWith(
        1,
        messages.slice(0, 3)
      );
      expect(logger["sendLogs"]).toHaveBeenNthCalledWith(2, messages.slice(3));
    });

    it("should log error when sendLogs fails", async () => {
      const logger = new LokiLogger(options);
      logger["sendLogs"] = jest
        .fn()
        .mockRejectedValueOnce("test error")
        .mockResolvedValueOnce(undefined);

      const logMessage: LogMessage = {
        date: Date.now(),
        level: LogLevel.DEBUG,
        message: "test",
        scope: "test:test",
        instance: "test",
        details: {
          props: "string",
        },
      };

      await logger.prepare();

      logger.logMessage(logMessage);

      await (setInterval as any).mock.calls[0][0]();

      expect(logger["sendLogs"]).toHaveBeenCalledTimes(2);
      expect(logger["sendLogs"]).toHaveBeenNthCalledWith(1, [logMessage]);
      expect(logger["sendLogs"]).toHaveBeenNthCalledWith(2, [
        {
          date: 1609459200000,
          details: {
            details: {},
            message: "test error",
            name: "unexpected",
          },
          instance: "SERVER",
          level: 4,
          message: "An error occured while sending logs to Loki",
          scope: "SYSTEM",
        },
      ]);
    });
    it("should console log error when sendLogs totally fails", async () => {
      const logger = new LokiLogger(options);
      logger["sendLogs"] = jest
        .fn()
        .mockRejectedValueOnce("test error")
        .mockRejectedValueOnce("second error");

      const logMessage: LogMessage = {
        date: Date.now(),
        level: LogLevel.DEBUG,
        message: "test",
        scope: "test:test",
        instance: "test",
        details: {
          props: "string",
        },
      };

      await logger.prepare();

      logger.logMessage(logMessage);

      await (setInterval as any).mock.calls[0][0]();

      expect(logger["sendLogs"]).toHaveBeenCalledTimes(2);
      expect(logger["sendLogs"]).toHaveBeenNthCalledWith(1, [logMessage]);
      expect(logger["sendLogs"]).toHaveBeenNthCalledWith(2, [
        {
          date: 1609459200000,
          details: {
            details: {},
            message: "test error",
            name: "unexpected",
          },
          instance: "SERVER",
          level: 4,
          message: "An error occured while sending logs to Loki",
          scope: "SYSTEM",
        },
      ]);

      expect(console.error).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalledWith(
        "Could not push error to loki",
        {
          details: {
            details: {},
            message: "test error",
            name: "unexpected",
          },
          message: "second error",
          name: "unexpected",
        }
      );
    });
  });

  describe("cleanup", () => {
    it("should stop the timer", async () => {
      const logger = new LokiLogger(options);

      await logger.prepare();
      await logger.cleanup();

      expect(clearInterval).toHaveBeenCalledTimes(1);
    });

    it("should not stop the timer when not prepared", async () => {
      const logger = new LokiLogger(options);

      await logger.cleanup();

      expect(clearInterval).toHaveBeenCalledTimes(0);
    });
  });

  describe("logMessage", () => {
    it("should add the message to the buffer", () => {
      const logger = new LokiLogger(options);

      const message = {
        date: Date.now(),
        level: LogLevel.DEBUG,
        message: "test",
        scope: "test:test",
        instance: "test",
        details: {},
      };

      logger.logMessage(message);

      expect(logger["buffer"]).toEqual([message]);
    });
  });

  describe("sendLogs", () => {
    it("should send the logs to Loki", async () => {
      const logger = new LokiLogger(options);

      const message = {
        date: Date.now(),
        level: LogLevel.DEBUG,
        message: "test",
        scope: "test:test",
        instance: "test",
        details: {},
      };

      const response = {
        status: 204,
        body: {
          on: jest.fn(),
        },
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(
        response as any
      );

      await (logger as any)["sendLogs"]([message]);

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(`${options.url}/loki/api/v1/push`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": expect.any(String),
        },
        body: expect.any(Buffer),
      });
    });

    it("should throw if the response status is not 204", async () => {
      const logger = new LokiLogger(options);

      const message = {
        date: Date.now(),
        level: LogLevel.DEBUG,
        message: "test",
        scope: "test:test",
        instance: "test",
        details: {},
      };

      const response = {
        status: 500,
        body: {
          on: jest
            .fn()
            .mockImplementation((_: string, cb: Function) =>
              cb(Buffer.from("error body"))
            ),
        },
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(
        response as any
      );

      await expect((logger as any)["sendLogs"]([message])).rejects.toBe(
        "error body"
      );
    });

    it("should trigger send logs when multiple times", async () => {
      const logger = new LokiLogger(options);

      const logMessage: LogMessage = {
        date: Date.now(),
        level: LogLevel.DEBUG,
        message: "test",
        scope: "test:test",
        instance: "test",
        details: {
          props: "string",
        },
      };

      const response = {
        status: 204,
        body: {
          on: jest.fn(),
        },
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(
        response as any
      );

      await logger.prepare();
      const messages = [
        logMessage,
        {
          date: Date.now(),
          level: LogLevel.TRACE,
          message: "test",
          scope: "test:test",
          instance: "test",
          details: {
            props: "string",
          },
        },
        {
          date: Date.now(),
          level: LogLevel.INFO,
          message: "test",
          scope: "test:test",
          instance: "test",
          details: {
            props: "string",
          },
        },
        {
          date: Date.now(),
          level: LogLevel.WARNING,
          message: "test",
          scope: "test:test",
          instance: "test",
          details: {
            props: "string",
          },
        },
        {
          date: Date.now(),
          level: LogLevel.ERROR,
          message: "test",
          scope: "test:test",
          instance: "test",
          details: {
            props: "string",
          },
        },
      ];

      await logger["sendLogs"](messages);

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(`${options.url}/loki/api/v1/push`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": expect.any(String),
        },
        body: expect.any(Buffer),
      });

      const buffer = (fetch as any).mock.calls[0][1].body;
      const body = JSON.parse(buffer.toString());

      expect(body).toStrictEqual({
        streams: [
          {
            stream: {
              app: "test",
              env: "test",
              instance: "test",
              method: "test",
              service: "test",
            },
            values: [
              [
                "1609459200000000000",
                '{"level":"debug","message":"test","details":{"props":"string"}}',
              ],
              [
                "1609459200000000000",
                '{"level":"trace","message":"test","details":{"props":"string"}}',
              ],
              [
                "1609459200000000000",
                '{"level":"info","message":"test","details":{"props":"string"}}',
              ],
              [
                "1609459200000000000",
                '{"level":"warning","message":"test","details":{"props":"string"}}',
              ],
              [
                "1609459200000000000",
                '{"level":"error","message":"test","details":{"props":"string"}}',
              ],
            ],
          },
        ],
      });
    });

    it("Should send tid to loki", async () => {
      const logger = new LokiLogger(options);

      const response = {
        status: 204,
        body: {
          on: jest.fn(),
        },
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(
        response as any
      );

      await logger.prepare();

      const messages = [
        {
          date: Date.now(),
          tid: "test transaction id",
          level: LogLevel.TRACE,
          message: "test message",
          scope: "service:method",
          instance: "instance",
          details: {
            props: "string",
          },
        },
        {
          date: Date.now(),
          tid: "test transaction id",
          level: LogLevel.INFO,
          message: "test other message",
          scope: "service:method2",
          instance: "instance",
          details: {
            props: "string",
          },
        },
      ];

      await logger["sendLogs"](messages);

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(`${options.url}/loki/api/v1/push`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": expect.any(String),
        },
        body: expect.any(Buffer),
      });

      const buffer = (fetch as any).mock.calls[0][1].body;
      const body = JSON.parse(buffer.toString());

      expect(body).toStrictEqual({
        streams: [
          {
            stream: {
              app: "test",
              env: "test",
              instance: "instance",
              method: "method",
              service: "service",
            },
            values: [
              [
                "1609459200000000000",
                '{"level":"trace","tid":"test transaction id","message":"test message","details":{"props":"string"}}',
              ],
            ],
          },
          {
            stream: {
              app: "test",
              env: "test",
              instance: "instance",
              method: "method2",
              service: "service",
            },
            values: [
              [
                "1609459200000000000",
                '{"level":"info","tid":"test transaction id","message":"test other message","details":{"props":"string"}}',
              ],
            ],
          },
        ],
      });
    });
  });
});
