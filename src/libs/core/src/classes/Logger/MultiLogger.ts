import { ILogger, LogLevel, LogMessage } from "../../types";
import { BaseLogger } from "./BaseLogger";

export class MultiLogger extends BaseLogger {
  constructor(private loggers: ILogger[]) {
    super([
      LogLevel.DEBUG,
      LogLevel.TRACE,
      LogLevel.INFO,
      LogLevel.WARNING,
      LogLevel.ERROR,
    ]);
  }

  override setInstance(instance: string): void {
    super.setInstance(instance);
    this.loggers.forEach((logger) => {
      logger.setInstance(instance);
    });
  }

  override setTransactionId(tid: string): void {
    super.setTransactionId(tid);
    this.loggers.forEach((logger) => {
      logger.setTransactionId(tid);
    });
  }

  override setScope(scope: string): void {
    super.setScope(scope);
    this.loggers.forEach((logger) => {
      logger.setScope(scope);
    });
  }

  override prepare(): Promise<void> {
    return Promise.all(
      this.loggers.map((logger) => {
        return logger.prepare?.();
      })
    ).then(() => {});
  }

  override cleanup(): Promise<void> {
    return Promise.all(
      this.loggers.map((logger) => {
        return logger.cleanup?.();
      })
    ).then(() => {});
  }

  override logMessage(message: LogMessage) {
    this.loggers.forEach((logger) => {
      logger.log(message);
    });
  }

  override clone(): BaseLogger {
    const logger = new MultiLogger(
      this.loggers.map((logger) => logger.clone())
    );
    logger.setInstance(this.instance);
    logger.setScope(this.scope);
    this.tid && logger.setTransactionId(this.tid);

    return logger;
  }
}
