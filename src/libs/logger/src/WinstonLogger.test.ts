/**
 * @group unit
 */
import winston from "winston";
import { LogLevel, LogMessage } from "@skhail/core";

import { WinstonLogger } from "./WinstonLogger";

describe("WinstonLogger", () => {
  const winstonLoggerMock: winston.Logger = {
    log: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2023-12-29T20:17:45.902Z"));
  });

  it("should be tested", () => {
    // Arrange
    // Act
    const logger = new WinstonLogger(winstonLoggerMock);

    // Assert
    expect(logger).toBeDefined();
    expect(logger["winstonLogger"]).toBe(winstonLoggerMock);
  });

  it("Should log message to winston logger", () => {
    // Arrange
    const logger = new WinstonLogger(winstonLoggerMock);
    const logMessage: LogMessage = {
      date: Date.now(),
      instance: "instance_test",
      level: LogLevel.INFO,
      message: "message",
      scope: "scope",
    };

    // Act
    logger.logMessage(logMessage);

    // Assert
    expect(winstonLoggerMock.log).toBeCalledTimes(1);
    expect(winstonLoggerMock.log).toBeCalledWith(
      "info",
      "(instance_test) #scope# 2023-12-29T20:17:45.902Z: message"
    );
  });

  it("Should log message to winston logger with details", () => {
    // Arrange
    const logger = new WinstonLogger(winstonLoggerMock);
    const logMessage: LogMessage = {
      date: Date.now(),
      instance: "instance_test",
      level: LogLevel.INFO,
      message: "message",
      scope: "scope",
      details: {
        test: "prop",
      },
    };

    // Act
    logger.logMessage(logMessage);

    // Assert
    expect(winstonLoggerMock.log).toBeCalledTimes(1);
    expect(winstonLoggerMock.log).toBeCalledWith(
      "info",
      '(instance_test) #scope# 2023-12-29T20:17:45.902Z: message details: {"test":"prop"}'
    );
  });

  it("Should log message to winston logger with tid", () => {
    // Arrange
    const logger = new WinstonLogger(winstonLoggerMock);
    const logMessage: LogMessage = {
      date: Date.now(),
      instance: "instance_test",
      level: LogLevel.INFO,
      message: "message",
      scope: "scope",
      tid: "tid_test",
    };

    // Act
    logger.logMessage(logMessage);

    // Assert
    expect(winstonLoggerMock.log).toBeCalledTimes(1);
    expect(winstonLoggerMock.log).toBeCalledWith(
      "info",
      "(instance_test) #scope(tid_test)# 2023-12-29T20:17:45.902Z: message"
    );
  });

  it("Should log message as debug to winston logger when level is trace", () => {
    // Arrange
    const logger = new WinstonLogger(winstonLoggerMock);
    const logMessage: LogMessage = {
      date: Date.now(),
      instance: "instance_test",
      level: LogLevel.TRACE,
      message: "message",
      scope: "scope",
      tid: "tid_test",
    };

    // Act
    logger.logMessage(logMessage);

    // Assert
    expect(winstonLoggerMock.log).toBeCalledTimes(1);
    expect(winstonLoggerMock.log).toBeCalledWith(
      "debug",
      "(instance_test) #scope(tid_test)# 2023-12-29T20:17:45.902Z: message"
    );
  });
});
