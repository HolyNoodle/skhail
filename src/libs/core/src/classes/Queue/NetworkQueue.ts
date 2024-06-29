import { IEnveloppe, IQueue, ContextOptions, ILogger } from "../../types";
import { SkhailError } from "../Error";

export type NetworkQueueOptions<Context extends ContextOptions> = {
  default?: boolean;
  queue: IQueue<Context>;
  services: string[];
}[];

export class NetworkQueue<Context extends ContextOptions = any>
  implements IQueue<Context>
{
  private logger?: ILogger;
  private serviceToQueues: Map<string, IQueue<Context>> = new Map();
  private defaultQueue?: IQueue<Context>;
  constructor(private options: NetworkQueueOptions<Context>) {}

  async prepare(): Promise<void> {
    this.serviceToQueues = new Map();

    await Promise.all(this.options.map(({ queue }) => queue.prepare?.()));

    for (const { default: defaultNetwork, queue, services } of this.options) {
      for (const service of services) {
        if (this.serviceToQueues.has(service)) {
          throw new SkhailError({
            name: "unexpected",
            message: `Service ${service} already registered with other network`,
          });
        }

        if (defaultNetwork) {
          if (this.defaultQueue) {
            throw new SkhailError({
              name: "unexpected",
              message: `Default network already set`,
            });
          }

          this.defaultQueue = queue;
        }
        this.serviceToQueues.set(service, queue);
      }
    }
  }

  async cleanup(): Promise<void> {
    await Promise.all(this.options.map(({ queue }) => queue.cleanup?.()));

    this.serviceToQueues = new Map();
    this.defaultQueue = undefined;
  }

  setLogger(logger: ILogger): void {
    this.logger = logger;

    for (const { queue } of this.options) {
      queue.setLogger(logger);
    }
  }

  setHandler(
    service: string,
    handler: (enveloppe: any) => Promise<any>
  ): Promise<void> {
    if (!this.serviceToQueues.has(service)) {
      return Promise.reject(
        new SkhailError({
          name: "unexpected",
          message: `Service ${service} has no network associated`,
        })
      );
    }

    const queue = this.serviceToQueues.get(service)!;

    this.logger?.debug("NetworkRouter set handler", {
      service,
      queue,
    });

    return queue.setHandler(service, handler);
  }

  enqueue(enveloppe: IEnveloppe<Context>): Promise<any> {
    const queue =
      this.serviceToQueues.get(enveloppe.service) ?? this.defaultQueue;

    if (!queue) {
      return Promise.reject(
        new SkhailError({
          name: "not_found",
          message:
            "No network found for sending message. Consider adding a default network",
          details: {
            targetService: enveloppe.service,
          },
        })
      );
    }

    this.logger?.debug("NetworkRouter enqueue message", {
      service: enveloppe.service,
      queue: queue.constructor,
    });

    return queue.enqueue(enveloppe);
  }
}
