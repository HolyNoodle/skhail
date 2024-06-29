import { BaseLogger, LogLevel, LogMessage, getError } from "@skhail/core";
import fetch from "node-fetch-commonjs";

export interface LokiLoggerOptions {
  app: string;
  url: string;
  sendBatchTime: number;
  batchSize: number;
  levels?: LogLevel[];
  env: string;
}

const getLevelString = (level: LogLevel) => {
  switch (level) {
    case LogLevel.DEBUG:
      return "debug";
    case LogLevel.INFO:
      return "info";
    case LogLevel.WARNING:
      return "warning";
    case LogLevel.ERROR:
      return "error";
    case LogLevel.TRACE:
      return "trace";
  }
};

export class LokiLogger extends BaseLogger {
  private timer!: NodeJS.Timer;
  private buffer: LogMessage[] = [];

  constructor(private options: LokiLoggerOptions) {
    super(options.levels);
  }

  private async sendLogs(logs: LogMessage[]) {
    const lokiPushUrl = this.options.url + "/loki/api/v1/push";

    const streams = logs.reduce((acc, log) => {
      const [service, method] = log.scope.split(":");
      const targetStream = {
        env: this.options.env,
        app: this.options.app,
        instance: log.instance,
        service,
        method,
      };

      const logLine = [
        (log.date * 1000 * 1000).toString(),
        JSON.stringify({
          level: getLevelString(log.level),
          tid: log.tid,
          message: log.message,
          details: log.details,
        }),
      ] as [string, string];

      const stream = acc.find(
        (s) =>
          s.stream.env === targetStream.env &&
          s.stream.app === targetStream.app &&
          s.stream.instance === targetStream.instance &&
          s.stream.service === targetStream.service &&
          s.stream.method === targetStream.method
      );
      if (!stream) {
        acc.push({ stream: targetStream, values: [logLine] });
      } else {
        stream.values.push(logLine);
      }

      return acc;
    }, [] as { stream: any; values: [string, string][] }[]);

    const body = Buffer.from(
      JSON.stringify({
        streams,
      }),
      "utf-8"
    );

    const response = await fetch(lokiPushUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": body.length.toString(),
      },
      body,
    });

    if (response.status !== 204) {
      return new Promise((_, reject) => {
        let data: Buffer[] = [];
        response.body?.on("data", (chunk: Buffer) => {
          data.push(chunk);
        });
        response.body?.on("end", () => {
          reject(Buffer.concat(data).toString("utf-8"));
        });
      });
    }
  }

  prepare() {
    this.timer = setInterval(async () => {
      const logs = this.buffer.splice(0, this.options.batchSize);

      if (logs.length > 0) {
        try {
          await this.sendLogs(logs);
        } catch (err) {
          const error = getError(err).toObject();

          try {
            await this.sendLogs([
              {
                date: Date.now(),
                level: LogLevel.ERROR,
                message: "An error occured while sending logs to Loki",
                scope: this.scope,
                instance: this.instance,
                details: error,
              },
            ]);
          } catch (err) {
            const errorPush = getError(err, error).toObject();
            console.error("Could not push error to loki", errorPush);
          }
        }
      }
    }, this.options.sendBatchTime);

    return Promise.resolve();
  }

  async cleanup(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  logMessage(message: LogMessage): void {
    this.buffer.push(message);
  }
}
