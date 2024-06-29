import { LogLevel, LogMessage } from "../../types";
import { BaseLogger } from "./BaseLogger";

export class ConsoleLogger extends BaseLogger {
  constructor(logLevels?: LogLevel[]) {
    super(logLevels);
  }
  override logMessage({
    level,
    scope,
    date,
    message,
    details,
    instance,
  }: LogMessage) {
    const logDate = new Date();
    logDate.setTime(date);

    const detailsContent = details
      ? ` details: ${JSON.stringify(details)}`
      : "";

    console.log(
      `[${LogLevel[level]}] (${instance}) #${scope}${
        this.tid ? `(${this.tid})` : ""
      }# ${logDate.toISOString()}: ${message}${detailsContent}`
    );
  }
}
