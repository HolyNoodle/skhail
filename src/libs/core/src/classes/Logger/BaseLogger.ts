import { ILogger, LogLevel, LogMessage } from "../../types";

export abstract class BaseLogger implements ILogger {
  protected scope: string = "SYSTEM";
  protected tid?: string;
  protected instance: string = "SERVER";

  constructor(
    protected logLevels: LogLevel[] = [
      LogLevel.INFO,
      LogLevel.WARNING,
      LogLevel.ERROR,
    ]
  ) {}

  abstract logMessage(logMessage: LogMessage): void;

  clone(): BaseLogger {
    const logger = Object.assign(
      Object.create(Object.getPrototypeOf(this)),
      this
    ) as BaseLogger;

    logger.setInstance(this.instance);
    logger.setScope(this.scope);
    this.tid && logger.setTransactionId(this.tid);

    return logger;
  }
  prepare?(): Promise<void>;
  cleanup?(): Promise<void>;

  setScope(scope: string) {
    this.scope = scope;
  }
  setTransactionId(tid: string): void {
    this.tid = tid;
  }
  setInstance(instance: string): void {
    this.instance = instance;
  }
  getInstance(): string {
    return this.instance;
  }

  private wrapLog(level: LogLevel, message: string, details?: {}) {
    const logMessage: LogMessage = {
      level,
      instance: this.instance,
      scope: this.scope,
      tid: this.tid,
      details,
      message,
      date: new Date().getTime(),
    };

    this.log(logMessage);
  }

  log(logMessage: LogMessage) {
    if (!this.logLevels.includes(logMessage.level)) {
      return;
    }

    this.logMessage(logMessage);
  }

  debug(message: string, details?: {} | undefined): void {
    this.wrapLog(LogLevel.DEBUG, message, details);
  }
  trace(message: string, details?: {} | undefined): void {
    this.wrapLog(LogLevel.TRACE, message, details);
  }
  info(message: string, details?: {} | undefined): void {
    this.wrapLog(LogLevel.INFO, message, details);
  }
  warning(message: string, details?: {} | undefined): void {
    this.wrapLog(LogLevel.WARNING, message, details);
  }
  error(message: string, details?: {} | undefined): void {
    this.wrapLog(LogLevel.ERROR, message, details);
  }
}
