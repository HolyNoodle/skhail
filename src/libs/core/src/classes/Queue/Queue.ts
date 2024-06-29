import {
  ContextOptions,
  EnveloppeHandler,
  IEnveloppe,
  IEnveloppeResponse,
  ILogger,
  IQueue,
} from "../../types";
import { SkhailError } from "../Error";

export class InMemoryQueue<Context extends ContextOptions>
  implements IQueue<Context>
{
  private handlers?: Map<string, EnveloppeHandler<Context>>;
  private logger?: ILogger;
  setLogger(logger: ILogger): void {
    this.logger = logger;
  }

  setHandler(
    service: string,
    handler: EnveloppeHandler<Context>
  ): Promise<void> {
    this.logger?.debug("InMemoryQueue: set service handler", {
      service,
    });
    this.handlers?.set(service, handler);

    return Promise.resolve();
  }

  prepare(): Promise<void> {
    this.handlers = new Map();

    return Promise.resolve();
  }

  cleanup(): Promise<void> {
    this.handlers = undefined;

    return Promise.resolve();
  }

  enqueue(enveloppe: IEnveloppe<Context>): Promise<IEnveloppeResponse> {
    const handler = this.handlers?.get(enveloppe.service) ?? null;

    if (handler === null) {
      this.logger?.warning("InMemoryQueue: service not found", {
        service: enveloppe.service,
        method: enveloppe.method,
      });

      return Promise.resolve({
        tid: enveloppe.context.tid,
        success: false,
        error: new SkhailError({
          name: "not_found",
          message: "Service not found",
          details: {
            queue: "InMemoryQueue",
            service: enveloppe.service,
            method: enveloppe.method,
          },
        }),
      });
    }

    return handler(enveloppe);
  }
}
