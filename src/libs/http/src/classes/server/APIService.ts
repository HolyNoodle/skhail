import {
  Constructor,
  ContextOptions,
  EventOptions,
  IEnveloppe,
  SkhailService,
} from "@skhail/core";
import { APIHandler } from "./Handlers/APIHandler";
import {
  defaultHTTPOptions,
  HTTPService,
  HTTPServiceOptions,
} from "./HTTPService";
import {
  APIMethodBuilder,
  APIServiceBuilder,
  MethodParameter,
  OpenAPIBuilder,
} from "./Handlers/OpenAPI.utils";

export type GetAPIContextFunction<ContextType extends ContextOptions> = (
  context?: ContextType
) => Promise<ContextType | undefined>;

export type ProcessBodyFunction<ContextType extends ContextOptions> = (
  body: string
) => Promise<IEnveloppe<ContextType>>;

export interface APIServiceOptions {
  log: boolean;
}

export const defaultAPIOptions: APIServiceOptions = {
  log: true,
};

export class APIService<
  ContextType extends ContextOptions = {},
  Events extends EventOptions = {}
> extends HTTPService<ContextType, Events> {
  static identifier = "HTTPAPIService";

  protected apiOptions: APIServiceOptions;

  constructor(
    options: Partial<APIServiceOptions> = defaultAPIOptions,
    server: Partial<HTTPServiceOptions> = defaultHTTPOptions
  ) {
    super(server);

    this.apiOptions = {
      ...defaultAPIOptions,
      ...options,
    };
  }

  async prepare(): Promise<void> {
    this.handlers.push(new APIHandler<ContextType>(APIService.openApiBuilder));

    return await super.prepare();
  }

  async cleanup(): Promise<void> {
    await super.cleanup();

    this.handlers = [];
  }

  static openApiBuilder = new OpenAPIBuilder();
  static openApiServices: { [key: string]: APIServiceBuilder<any> } = {};
}

export function Expose<Service extends SkhailService<any>>(name?: string) {
  return (target: Constructor<Service>) => {
    if (!APIService.openApiServices[target.identifier]) {
      APIService.openApiServices[target.identifier] =
        APIService.openApiBuilder.service(target, target.identifier);
    }

    const serviceBuilder = APIService.openApiServices[target.identifier];

    serviceBuilder.name(name || target.identifier);
  };
}

export interface ExposeMethodOptions {
  mode?: (typeof APIMethodBuilder.prototype)["_mode"];
  path?: string;
  description?: string;
  summary?: string;
  success?: string;
  parameters?: MethodParameter[];
}

export function ExposeMethod<Service extends SkhailService<any>>({
  mode = "get",
  path,
  description,
  summary,
  success = "Success",
  parameters = [],
}: ExposeMethodOptions | undefined = {}) {
  return (target: Service, propertyKey: string) => {
    const serviceClass = target.constructor as Constructor;

    if (!APIService.openApiServices[serviceClass.identifier]) {
      APIService.openApiServices[serviceClass.identifier] =
        APIService.openApiBuilder.service(
          serviceClass,
          serviceClass.identifier
        );
    }

    const serviceBuilder = APIService.openApiServices[serviceClass.identifier];

    const methodBuilder = serviceBuilder
      .expose(propertyKey as any, path)
      .mode(mode)
      .description(description)
      .summary(summary)
      .success(success);

    parameters.forEach((parameter) => {
      methodBuilder.parameter(parameter);
    });
  };
}
