import {
  Constructor,
  ContextOptions,
  IEmitter,
  ILogger,
  IQueue,
  IRequestContext,
  ISkhailClient,
  ServiceFunctions,
} from "../../types";
import { SkhailService } from "../Service";
import { createServiceProxy } from "./utils";

export interface SkhailClientOptions<Context extends ContextOptions> {
  queue: IQueue<Context>;
  event?: IEmitter;
  logger: ILogger;
}

export class SkhailClient<ContextType extends ContextOptions = ContextOptions>
  implements ISkhailClient<ContextType>
{
  constructor(private options: SkhailClientOptions<ContextType>) {}

  async start() {
    this.options.queue.setLogger(this.options.logger);
    this.options.event?.setLogger(this.options.logger);

    await this.options.logger.prepare?.();

    await Promise.all([
      this.options.queue.prepare?.(),
      this.options.event?.prepare?.(),
    ]);
  }

  async stop(): Promise<void> {
    await Promise.all([
      this.options.logger.cleanup?.(),
      this.options.queue.cleanup?.(),
      this.options.event?.cleanup?.(),
    ]);
  }

  get<Service extends SkhailService<ContextType>>(
    type: Constructor<Service>,
    context?: ContextType,
    forwardedContext?: IRequestContext<ContextType>
  ): ServiceFunctions<Service, ContextType> {
    return createServiceProxy(
      type,
      this.options.logger,
      this.options.queue,
      context,
      forwardedContext
    );
  }
}
