import {
  Constructor,
  ContextOptions,
  EventFunction,
  EventOptions,
  IEmitter,
  IEventEmitter,
  IEventListener,
  ILogger,
  IQueue,
  QueueWrapper,
  ServiceFunctions,
} from "../types";
import { SkhailClient } from "./Client";
import { createServiceProxy } from "./Client/utils";
import { SkhailService } from "./Service";

export class SkhailNetwork<
  ContextType extends ContextOptions,
  EventType extends EventOptions
> implements
    IEventListener,
    IEventEmitter<EventType>,
    QueueWrapper<ContextType>
{
  constructor(
    private owner: SkhailService<any, EventType>,
    private logger: ILogger,
    private client: SkhailClient<ContextType>,
    public queue: IQueue<ContextType>,
    public pubsub?: IEmitter,
    private forwardedContext?: any
  ) {}

  private buildEvent(emitterService: Constructor<any>, event: string) {
    return `${emitterService.identifier}:${event}`;
  }

  on<
    Service extends SkhailService<any, EventType>,
    EventType extends EventOptions,
    Event extends keyof EventType
  >(
    service: Constructor<Service>,
    event: Event,
    listener: EventFunction<EventType[Event]>
  ): Promise<void> {
    if (!this.pubsub) {
      this.logger.warning("Event emitter not configured", {
        service: service.identifier,
        event,
      });

      return Promise.resolve();
    }

    this.owner.getLogger().trace("Service event start listening", {
      service: service.identifier,
      event,
    });
    return this.pubsub.on(
      (this.owner.constructor as Constructor<any>).identifier,
      this.buildEvent(service, event as string),
      listener as any
    );
  }

  off<
    Service extends SkhailService<any, EventType>,
    EventType extends EventOptions,
    Event extends keyof EventType
  >(
    service: Constructor<Service>,
    event: Event,
    listener: EventFunction<EventType[Event]>
  ): Promise<void> {
    if (!this.pubsub) {
      this.logger.warning("Event emitter not configured", {
        service: service.identifier,
        event,
      });

      return Promise.resolve();
    }

    this.owner.getLogger().trace("Service event stop listening", {
      service: service.identifier,
      event,
    });

    return this.pubsub.off(
      (this.owner.constructor as Constructor<any>).identifier,
      this.buildEvent(service, event as string),
      listener as any
    );
  }

  emit<Event extends keyof EventType>(
    event: Event,
    args: EventType[Event]
  ): Promise<void> {
    if (!this.pubsub) {
      this.logger.warning("Event emitter not configured", {
        service: (this.owner.constructor as Constructor<any>).identifier,
        event,
      });

      return Promise.resolve();
    }

    this.owner.getLogger().trace("Service event emition", {
      service: (this.owner.constructor as Constructor<any>).identifier,
      event,
    });
    return this.pubsub.emit(
      this.buildEvent(
        this.owner.constructor as Constructor<any>,
        event as string
      ),
      args
    );
  }

  get<Service extends SkhailService<ContextType, {}>>(
    type: Constructor<Service>,
    context?: ContextType | undefined
  ): ServiceFunctions<Service, ContextType> {
    return createServiceProxy(
      type,
      this.logger.clone(),
      this.queue,
      context,
      this.forwardedContext
    );
  }

  getClient() {
    return this.client;
  }
}
