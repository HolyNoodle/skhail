import {
  SkhailClient,
  ISkhailClient,
  ILogger,
  Constructor,
  IRequestContext,
  SkhailService,
  ServiceFunctions,
  ContextOptions,
  ConsoleLogger,
  MultiLogger,
  IEnveloppeResponse,
} from "@skhail/core";
import { HTTPProtocols } from "./types";
import { HTTPClientQueue } from "./Queue";
import { HTTPLogger } from "./HTTPLogger";

export interface HTTPInterfaceOptions {
  event?: boolean;
  instance: string;
  service: string;
  protocol: HTTPProtocols;
  host: string;
  port: number;
  baseUrl?: string;
  logger: ILogger;
  transmitLogs?: boolean;
  interceptor?: (response: IEnveloppeResponse) => void;
}

export class HTTPInterface<ContextType extends ContextOptions>
  implements ISkhailClient<ContextType>
{
  private client?: ISkhailClient<ContextType>;
  private options: HTTPInterfaceOptions;

  constructor(options: Partial<HTTPInterfaceOptions> = {}) {
    this.options = {
      host: "localhost",
      port: 5000,
      logger: new ConsoleLogger(),
      protocol: HTTPProtocols.HTTP,
      service: "client",
      instance: "web",
      ...options,
    };
  }

  async start(): Promise<void> {
    const { host, port, protocol, baseUrl } = this.options;
    const serverUrl = `${protocol}://${host}:${port}${baseUrl || ""}`;

    const loggers = [this.options.logger];

    if (this.options.transmitLogs !== false) {
      const httpLogger = new HTTPLogger({
        url: serverUrl,
        batchSize: 100,
        interval: 1000,
      });
      loggers.push(httpLogger);
    }

    const logger = new MultiLogger(loggers);
    logger.setInstance(this.options.instance);
    logger.setScope(this.options.service);

    this.client = new SkhailClient({
      logger,
      queue: new HTTPClientQueue({
        url: serverUrl,
        interceptor: this.options.interceptor,
      }),
    });

    return await this.client.start();
  }

  async stop(): Promise<void> {
    return await this.client?.stop();
  }

  getEmitter() {
    return undefined;
  }

  get<Service extends SkhailService<ContextType>>(
    type: Constructor<Service>,
    context?: ContextType,
    forwardedContext?: IRequestContext<ContextType>
  ): ServiceFunctions<Service, ContextType> {
    return this.client!.get(type, context, forwardedContext);
  }
}
