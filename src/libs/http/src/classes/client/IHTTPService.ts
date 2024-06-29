import {
  Constructor,
  EventOptions,
  SkhailService,
  ServiceFunctions,
  ContextOptions,
} from "@skhail/core";

export abstract class IHTTPService<
  Context extends ContextOptions = {},
  Events extends EventOptions = {}
> extends SkhailService<Context, Events> {
  static identifier = "HTTPService";

  abstract registerRoute<Service extends SkhailService<Context>>(
    route: string,
    service: Constructor<Service>,
    method: keyof ServiceFunctions<Service, Context>
  ): void;
}
