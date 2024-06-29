/**
 * @group unit
 */
import { LogLevel } from "../../types";
import { MultiLogger } from "./MultiLogger";

describe("MultiLogger", () => {
  it("Should log to all loggers", () => {
    const logger1 = {
      log: jest.fn(),
    };
    const logger2 = {
      log: jest.fn(),
    };
    const expectedMessage = { message: "test message", level: LogLevel.INFO };
    const logger = new MultiLogger([logger1 as any, logger2 as any]);

    logger.log(expectedMessage as any);

    expect(logger1.log).toHaveBeenCalledTimes(1);
    expect(logger1.log).toHaveBeenCalledWith(expectedMessage);
    expect(logger2.log).toHaveBeenCalledTimes(1);
    expect(logger2.log).toHaveBeenCalledWith(expectedMessage);
  });

  it("Should prepare all loggers", async () => {
    const logger1 = {
      prepare: jest.fn(),
    };
    const logger2 = {
      prepare: jest.fn(),
    };
    const logger = new MultiLogger([logger1 as any, logger2 as any]);

    await logger.prepare();

    expect(logger1.prepare).toHaveBeenCalledTimes(1);
    expect(logger2.prepare).toHaveBeenCalledTimes(1);
  });

  it("Should cleanup all loggers", async () => {
    const logger1 = {
      cleanup: jest.fn(),
    };
    const logger2 = {
      cleanup: jest.fn(),
    };
    const logger = new MultiLogger([logger1 as any, logger2 as any]);

    await logger.cleanup();

    expect(logger1.cleanup).toHaveBeenCalledTimes(1);
    expect(logger2.cleanup).toHaveBeenCalledTimes(1);
  });

  it("Should set instance on all loggers", () => {
    const logger1 = {
      setInstance: jest.fn(),
    };
    const logger2 = {
      setInstance: jest.fn(),
    };
    const logger = new MultiLogger([logger1 as any, logger2 as any]);

    logger.setInstance("instance name");

    expect(logger1.setInstance).toHaveBeenCalledTimes(1);
    expect(logger1.setInstance).toHaveBeenCalledWith("instance name");
    expect(logger2.setInstance).toHaveBeenCalledTimes(1);
    expect(logger2.setInstance).toHaveBeenCalledWith("instance name");
  });

  it("Should set scope on all loggers", () => {
    const logger1 = {
      setScope: jest.fn(),
    };
    const logger2 = {
      setScope: jest.fn(),
    };
    const logger = new MultiLogger([logger1 as any, logger2 as any]);

    logger.setScope("service name");

    expect(logger1.setScope).toHaveBeenCalledTimes(1);
    expect(logger1.setScope).toHaveBeenCalledWith("service name");
    expect(logger2.setScope).toHaveBeenCalledTimes(1);
    expect(logger2.setScope).toHaveBeenCalledWith("service name");
  });

  it("Should set transaction id on all loggers", async () => {
    const logger1 = {
      setTransactionId: jest.fn(),
    };
    const logger2 = {
      setTransactionId: jest.fn(),
    };
    const logger = new MultiLogger([logger1 as any, logger2 as any]);

    logger.setTransactionId("tid");

    expect(logger1.setTransactionId).toHaveBeenCalledTimes(1);
    expect(logger1.setTransactionId).toHaveBeenCalledWith("tid");
    expect(logger2.setTransactionId).toHaveBeenCalledTimes(1);
    expect(logger2.setTransactionId).toHaveBeenCalledWith("tid");
  });

  it("Should clone all loggers", () => {
    const fakeCloned = {
      setInstance: jest.fn(),
      setScope: jest.fn(),
      setTransactionId: jest.fn(),
    };
    const logger1 = {
      clone: jest.fn().mockReturnValue(fakeCloned),
    };
    const logger2 = {
      clone: jest.fn().mockReturnValue(fakeCloned),
    };
    const logger = new MultiLogger([logger1 as any, logger2 as any]);

    const cloned = logger.clone();

    expect(cloned).toBeInstanceOf(MultiLogger);

    expect(logger1.clone).toHaveBeenCalledTimes(1);
    expect(logger2.clone).toHaveBeenCalledTimes(1);

    expect(fakeCloned.setInstance).toHaveBeenCalledTimes(2);
    expect(fakeCloned.setScope).toHaveBeenCalledTimes(2);
    expect(fakeCloned.setTransactionId).toHaveBeenCalledTimes(0);
  });

  it("Should clone all loggers", () => {
    const fakeCloned = {
      setInstance: jest.fn(),
      setScope: jest.fn(),
      setTransactionId: jest.fn(),
    };
    const logger1 = {
      setTransactionId: jest.fn(),
      clone: jest.fn().mockReturnValue(fakeCloned),
    };
    const logger2 = {
      setTransactionId: jest.fn(),
      clone: jest.fn().mockReturnValue(fakeCloned),
    };
    const logger = new MultiLogger([logger1 as any, logger2 as any]);

    logger.setTransactionId("test id");
    logger.clone();

    expect(fakeCloned.setTransactionId).toHaveBeenCalledTimes(2);
  });
});
