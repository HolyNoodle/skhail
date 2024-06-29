import * as winston from "winston";

import { BaseLogger, LogLevel, LogMessage } from "@skhail/core";

const levels: { [level in LogLevel]?: string } = {
  [LogLevel.INFO]: "info",
  [LogLevel.ERROR]: "error",
  [LogLevel.DEBUG]: "debug",
  [LogLevel.WARNING]: "warning",
};

export class WinstonLogger extends BaseLogger {
  constructor(
    private winstonLogger: winston.Logger,
    ...args: ConstructorParameters<typeof BaseLogger>
  ) {
    super(...args);
  }

  override logMessage({
    date,
    level,
    instance,
    scope,
    message,
    details,
    tid,
  }: LogMessage): void {
    const logDate = new Date();
    logDate.setTime(date);

    let levelString = levels[level];

    if (!levelString) {
      levelString = levels[LogLevel.DEBUG]!;
    }

    const detailsContent = details
      ? ` details: ${JSON.stringify(details)}`
      : "";

    const tidString = tid ? `(${tid})` : "";

    this.winstonLogger.log(
      levelString,
      `(${instance}) #${scope}${tidString}# ${logDate.toISOString()}: ${message}${detailsContent}`
    );
  }
}
