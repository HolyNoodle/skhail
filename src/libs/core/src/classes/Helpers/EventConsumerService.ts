import { SkhailService } from "../Service/Service";
import {
  Constructor,
  DefinedConstructor,
  EventOptions,
  ILogger,
} from "../../types";
import { SkhailNetwork } from "../Network";
import { BaseHelperService } from "./BaseHelperService";

export type EventConsumerExecutionContext<T extends EventOptions> = {
  network: SkhailNetwork<any, T>;
  logger: ILogger;
};

export type ConsumerEventHandler<
  OwnedEvents extends EventOptions,
  Args extends any[],
  Events extends EventOptions,
  Event extends keyof Events
> = (
  executionContext: EventConsumerExecutionContext<OwnedEvents>,
  constructorArgs: Args,
  ...args: Events[Event]
) => Promise<void>;

export function EventConsumerService<
  OwnedEvents extends EventOptions = EventOptions
>(identifier: string) {
  return function ConsumerServiceMixin<
    Events extends EventOptions,
    Event extends keyof Events,
    Args extends any[]
  >(
    service: Constructor<SkhailService<any, Events>>,
    event: Event,
    handler: (
      executionContext: EventConsumerExecutionContext<OwnedEvents>,
      constructorArgs: Args,
      ...args: Events[Event]
    ) => Promise<void>
  ): DefinedConstructor<BaseHelperService<Events[Event]>, Args> {
    return class ConsumerEventServiceMixin extends BaseHelperService<
      Events[Event]
    > {
      static identifier = identifier;
      private args: Args;

      constructor(...args: Args) {
        super();

        this.args = args;
      }

      async prepare(): Promise<void> {
        await super.prepare();

        await this.network.on(
          service,
          event as any,
          this.executeHandler as any
        );
      }

      async cleanup(): Promise<void> {
        await this.network.off(
          service,
          event as any,
          this.executeHandler as any
        );

        await super.cleanup();
      }

      run(args: Events[Event]): Promise<void> {
        return handler(
          {
            network: this.network,
            logger: this.logger,
          },
          this.args,
          ...args
        );
      }
    };
  };
}
