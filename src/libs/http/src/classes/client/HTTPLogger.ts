import { BaseLogger, LogLevel, LogMessage } from "@skhail/core";
import { HTTPProtocols } from "./types";

export interface LoggerOptions {
  url: string;
  batchSize: number;
  interval: number;
}

export class HTTPLogger extends BaseLogger {
  private buffer: LogMessage[] = [];
  private timer?: NodeJS.Timer;

  constructor(
    private options: LoggerOptions,
    logLevels: LogLevel[] = [
      LogLevel.TRACE,
      LogLevel.INFO,
      LogLevel.WARNING,
      LogLevel.ERROR,
    ]
  ) {
    super(logLevels);
  }

  private sendLogs(logs: LogMessage[]) {
    fetch(this.options.url + "/logs", {
      method: "post",
      body: JSON.stringify(logs),
    });
  }

  prepare(): Promise<void> {
    this.timer = setInterval(() => {
      const logs = this.buffer.splice(0, this.options.batchSize);
      if (logs.length > 0) {
        this.sendLogs(logs);
      }
    }, this.options.interval);

    return Promise.resolve();
  }
  cleanup(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
    }

    return Promise.resolve();
  }

  logMessage(logMessage: LogMessage): void {
    this.buffer.push(logMessage);
  }
}
