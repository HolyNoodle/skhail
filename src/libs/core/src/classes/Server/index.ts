import {
  Constructor,
  ContextOptions,
  IEmitter,
  ILogger,
  IQueue,
  IRequestContext,
  ServiceFunctions,
} from "../../types";
import { SkhailClient } from "../Client";
import { getError } from "../Error";
import { SkhailNetwork } from "../Network";
import { SkhailService } from "../Service";
import { createLoggerCopy, handleServiceCall } from "./utils";

export interface SkhailServerOptions<ContextType extends ContextOptions> {
  services: SkhailService<ContextType>[];
  logger: ILogger;
  queue: IQueue<ContextType>;
  event?: IEmitter;
  manage?: string[];
}

export class SkhailServer<ContextType extends ContextOptions = ContextOptions> {
  private client: SkhailClient<ContextType>;

  constructor(private options: SkhailServerOptions<ContextType>) {
    this.client = new SkhailClient({
      queue: options.queue,
      logger: options.logger,
      event: options.event,
    });
  }

  private matchServiceWithWildCard(wildcard: string, service: string) {
    const parts = wildcard.split("*");
    if (parts.length === 1) {
      return service === wildcard;
    }

    if (parts.length === 2) {
      return service.startsWith(parts[0]) && service.endsWith(parts[1]);
    }

    return false;
  }

  private getManagedServices() {
    if (!this.options.manage) {
      return this.options.services;
    }

    return this.options.services.filter((service) => {
      const classObject = service.constructor as Constructor<SkhailService>;
      const serviceName = classObject.identifier;

      return (
        classObject.isManaged() ||
        this.options.manage!.some((wildcard) =>
          this.matchServiceWithWildCard(wildcard, serviceName)
        )
      );
    });
  }

  private setServiceHandlers(
    managedServices: SkhailService<any, any>[]
  ): Promise<any[]> {
    const serviceHandlerPromises = managedServices.map((service) =>
      this.options.queue.setHandler(
        (service.constructor as Constructor).identifier,
        handleServiceCall(service, this, this.options.logger)
      )
    );

    return Promise.all(serviceHandlerPromises);
  }

  private prepareServices(managedServices: SkhailService<any>[]) {
    const servicePreparePromises = managedServices.map((service) => {
      const serviceClass = service.constructor as Constructor<
        SkhailService<any>
      >;
      const logger = createLoggerCopy(this.options.logger, serviceClass);

      service.setLogger(logger);

      const network = new SkhailNetwork(
        service,
        logger,
        this.getClient(),
        this.getQueue(),
        this.getEmitter()
      );
      service.setNetwork(network);

      this.options.logger.debug("Preparing service", {
        service: serviceClass.identifier,
      });

      return service.prepare?.();
    });

    return Promise.all(servicePreparePromises);
  }

  private async cleanupServices(managedServices: SkhailService<any>[]) {
    const serviceCleanupPromises = managedServices.map((service) =>
      service.cleanup?.().catch((error) => {
        this.options.logger.error("Error while cleanup service", {
          service: (service.constructor as Constructor).identifier,
          error: getError(error).toObject(),
        });
      })
    );

    return Promise.all(serviceCleanupPromises);
  }

  async start(): Promise<void> {
    const queueLogger = this.options.logger.clone();
    queueLogger.setScope("Queue");
    const eventLogger = this.options.logger.clone();
    eventLogger.setScope("Event");

    this.options.queue.setLogger(queueLogger);
    this.options.event?.setLogger(eventLogger);

    await this.options.logger.prepare?.();

    const managedServices = this.getManagedServices();

    this.options.logger.info("Starting skhail server", {
      services: managedServices.map(
        (s) => (s.constructor as Constructor).identifier
      ),
    });

    if (this.options.queue.prepare) {
      this.options.logger.debug("Preparing queue", {
        queue: this.options.queue.constructor.name,
      });
      await this.options.queue.prepare();
    }
    if (this.options.event?.prepare) {
      this.options.logger.debug("Preparing event system", {
        queue: this.options.event.constructor.name,
      });
      await this.options.event.prepare();
    }

    this.options.logger.info("Preparing services");
    await this.prepareServices(managedServices);

    this.options.logger.debug("Setting service handlers");
    await this.setServiceHandlers(managedServices);

    this.options.logger.debug("Preparing middlewares");
    await Promise.all(
      managedServices
        .map((service) => {
          const classObject = service.constructor as Constructor;

          const promises = classObject.getMiddlewares().map((middleware) => {
            this.options.logger.debug("Preparing middleware", {
              middleware: middleware.id,
              service: classObject.identifier,
            });

            return middleware.prepare?.(service) ?? Promise.resolve();
          });

          return promises;
        })
        .flat()
    );

    this.options.logger.debug("Call service ready");
    await Promise.all(managedServices.map((service) => service.ready?.()));

    this.options.logger.info("Server is ready");
  }

  async stop(): Promise<void> {
    const managedServices = this.getManagedServices();
    this.options.logger.info("Stopping skhail server", {
      services: managedServices.map(
        (s) => (s.constructor as Constructor).identifier
      ),
    });

    this.options.logger.info("Cleaning middlewares");
    await Promise.all(
      managedServices
        .map((service) => {
          const classObject = service.constructor as Constructor;

          const promises = classObject.getMiddlewares().map((middleware) => {
            this.options.logger.debug("Cleaning middleware", {
              middleware: middleware.id,
              service: classObject.identifier,
            });
            return middleware.cleanup?.(service) ?? Promise.resolve();
          });

          return promises;
        })
        .flat()
    );

    this.options.logger.info("Cleaning up services");
    await this.cleanupServices(managedServices);

    if (this.options.queue.cleanup) {
      this.options.logger.debug("Cleaning up queue", {
        queue: this.options.queue.constructor.name,
      });
      await this.options.queue.cleanup();
    }
    if (this.options.event?.cleanup) {
      this.options.logger.debug("Cleaning up event system", {
        queue: this.options.event.constructor.name,
      });
      await this.options.event.cleanup();
    }

    await this.options.logger.cleanup?.();

    this.options.logger.info("Server is stopped");
  }

  get<Service extends SkhailService<ContextType>>(
    type: Constructor<Service>,
    context?: ContextType,
    forwardedContext?: IRequestContext<ContextType>
  ): ServiceFunctions<Service, ContextType> {
    return this.client.get(type, context, forwardedContext);
  }

  getQueue() {
    return this.options.queue;
  }

  getEmitter(): IEmitter | undefined {
    return this.options.event;
  }

  getClient() {
    return this.client;
  }
}
