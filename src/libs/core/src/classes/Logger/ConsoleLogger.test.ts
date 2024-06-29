/**
 * @group unit
 */
import { LogLevel } from "../../types";
import { ConsoleLogger } from "./ConsoleLogger";

describe("ConsoleLogger", () => {
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.resetAllMocks();

    jest
      .useFakeTimers()
      .setSystemTime(new Date(Date.UTC(2020, 0, 1, 0, 0, 0, 0)));

    logSpy = jest.spyOn(console, "log");
  });

  it("Should instantiate logger", () => {
    const logger = new ConsoleLogger([LogLevel.WARNING]);

    expect(logger).toBeInstanceOf(ConsoleLogger);
    expect(logger["logLevels"]).toStrictEqual([LogLevel.WARNING]);
  });

  it("Should instantiate logger with default levels", () => {
    const logger = new ConsoleLogger();

    expect(logger).toBeInstanceOf(ConsoleLogger);
    expect(logger["logLevels"]).toStrictEqual([
      LogLevel.INFO,
      LogLevel.WARNING,
      LogLevel.ERROR,
    ]);
  });

  it("Should instantiate logger", () => {
    const logger = new ConsoleLogger();

    expect(logger).toBeInstanceOf(ConsoleLogger);
    expect(logger["logLevels"]).toStrictEqual([
      LogLevel.INFO,
      LogLevel.WARNING,
      LogLevel.ERROR,
    ]);
  });

  it("Should return instance name", () => {
    const logger = new ConsoleLogger([LogLevel.DEBUG]);

    logger.setInstance("instanceName");

    expect(logger.getInstance()).toBe("instanceName");
  });

  describe("setService", () => {
    it("Should set service on logger", () => {
      const logger = new ConsoleLogger([LogLevel.DEBUG]);

      logger.setScope("service name");

      expect(logger["scope"]).toBe("service name");
    });
  });

  describe("debug", () => {
    it("Should not call log with DEBUG when log level is higher than debug", () => {
      const logger = new ConsoleLogger([LogLevel.INFO]);

      logger.debug("test log message");

      expect(logSpy).toHaveBeenCalledTimes(0);
    });

    it("Should call log with DEBUG", () => {
      const logger = new ConsoleLogger([LogLevel.DEBUG]);

      logger.debug("test log message");

      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith(
        "[DEBUG] (SERVER) #SYSTEM# 2020-01-01T00:00:00.000Z: test log message"
      );
    });

    it("Should call log with details", () => {
      const logger = new ConsoleLogger([LogLevel.DEBUG]);

      logger.debug("test log message", { this: "is", some: "details" });

      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith(
        '[DEBUG] (SERVER) #SYSTEM# 2020-01-01T00:00:00.000Z: test log message details: {"this":"is","some":"details"}'
      );
    });

    it("Should call log with DEBUG with service name", () => {
      const logger = new ConsoleLogger([LogLevel.DEBUG]);
      logger.setScope("serviceName");
      logger.debug("test log message");

      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith(
        "[DEBUG] (SERVER) #serviceName# 2020-01-01T00:00:00.000Z: test log message"
      );
    });

    it("Should call log with DEBUG with instance name", () => {
      const logger = new ConsoleLogger([LogLevel.DEBUG]);
      logger.setInstance("instanceName");
      logger.debug("test log message");

      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith(
        "[DEBUG] (instanceName) #SYSTEM# 2020-01-01T00:00:00.000Z: test log message"
      );
    });

    it("Should call log with DEBUG with transaction id", () => {
      const logger = new ConsoleLogger([LogLevel.DEBUG]);
      logger.setTransactionId("transaction id");
      logger.debug("test log message");

      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith(
        "[DEBUG] (SERVER) #SYSTEM(transaction id)# 2020-01-01T00:00:00.000Z: test log message"
      );
    });
  });

  describe("trace", () => {
    it("Should call log with TRACE", () => {
      const logger = new ConsoleLogger([LogLevel.TRACE]);

      logger.trace("test log message");

      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith(
        "[TRACE] (SERVER) #SYSTEM# 2020-01-01T00:00:00.000Z: test log message"
      );
    });
  });

  describe("info", () => {
    it("Should call log with INFO", () => {
      const logger = new ConsoleLogger([LogLevel.INFO]);

      logger.info("test log message");

      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith(
        "[INFO] (SERVER) #SYSTEM# 2020-01-01T00:00:00.000Z: test log message"
      );
    });
  });

  describe("warning", () => {
    it("Should call log with WARNING", () => {
      const logger = new ConsoleLogger([LogLevel.WARNING]);

      logger.warning("test log message");

      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith(
        "[WARNING] (SERVER) #SYSTEM# 2020-01-01T00:00:00.000Z: test log message"
      );
    });
  });

  describe("error", () => {
    it("Should call log with ERROR", () => {
      const logger = new ConsoleLogger([LogLevel.ERROR]);

      logger.error("test log message");

      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith(
        "[ERROR] (SERVER) #SYSTEM# 2020-01-01T00:00:00.000Z: test log message"
      );
    });
  });

  describe("Clone", () => {
    it("Should clone logger", () => {
      const logger = new ConsoleLogger([LogLevel.ERROR]);
      logger.setScope("service name");
      logger.setInstance("instanceName");
      logger.setTransactionId("transaction id");

      const clonedLogger = logger.clone();

      expect(clonedLogger).toBeInstanceOf(ConsoleLogger);
      expect(clonedLogger["logLevels"]).toStrictEqual([LogLevel.ERROR]);
      expect(clonedLogger["scope"]).toBe("service name");
      expect(clonedLogger["instance"]).toBe("instanceName");
      expect(clonedLogger["tid"]).toBe("transaction id");
    });
  });
});
