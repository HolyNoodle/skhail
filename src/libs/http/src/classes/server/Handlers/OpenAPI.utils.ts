import {
  Constructor,
  ILogger,
  ISkhailServer,
  SkhailService,
  ServiceFunctions,
  SkhailNetwork,
} from "@skhail/core";

export interface MethodParameter {
  name: string;
  in?: "path" | "query";
  type?: "integer" | "string";
  description?: string;
  required?: boolean;
}

export class APIMethodBuilder {
  private _description?: string;
  private _summary?: string;
  private _success?: string;
  private _tags: string[] = [];
  private _mode: "get" | "post" | "put" | "delete" = "get";
  private _parameters: Array<any> = [];

  constructor(private method: string) {}

  mode(mode: typeof this._mode) {
    this._mode = mode;

    return this;
  }

  parameter({
    name,
    in: where = "path",
    required = true,
    description,
    type = "string",
  }: MethodParameter) {
    this._parameters.push({
      name,
      in: where,
      description,
      required,
      schema: {
        type,
      },
    });

    return this;
  }

  description(value?: string) {
    this._description = value;

    return this;
  }
  summary(value?: string) {
    this._summary = value;

    return this;
  }
  tags(value?: string[]) {
    this._tags = value || [];

    return this;
  }
  success(value?: string) {
    this._success = value;

    return this;
  }

  getOperationId() {
    return this.method;
  }

  buildDoc() {
    return {
      [this._mode]: {
        operationId: this.method,
        summary: this._summary,
        description: this._description,
        tags: this._tags,
        parameters: this._parameters,
        responses: {
          200: {
            description: this._success,
          },
          default: {
            description: "An error occured",
          },
        },
      },
    };
  }
}

export class APIServiceBuilder<Service extends SkhailService<any>> {
  private methods: { [path: string]: APIMethodBuilder[] } = {};
  private _name: string;
  constructor(
    private service: Constructor<Service>,
    name: string = service.identifier
  ) {
    this._name = name;
  }

  name(value: string) {
    this._name = value;

    return this;
  }

  expose(method: keyof ServiceFunctions<Service, any>, path: string = "") {
    const methodBuilder = new APIMethodBuilder(
      [this.service.identifier, method].join(":") as string
    );

    if (!this.methods[path]) {
      this.methods[path] = [];
    }

    this.methods[path].push(methodBuilder);

    return methodBuilder;
  }

  buildDoc() {
    return Object.fromEntries(
      Object.entries(this.methods).map(([path, methodBuilders]) => {
        const pathMethods = methodBuilders.reduce(
          (pathMethods, methodBuilder) => {
            return {
              ...pathMethods,
              ...methodBuilder.buildDoc(),
            };
          },
          {}
        );

        let fullPath = "/" + this._name;

        if (path) {
          fullPath += "/" + path;
        }

        return [fullPath, pathMethods];
      })
    );
  }

  buildHandlers() {
    const handlers = {};

    const createHandler =
      (builder: any) =>
      async (
        context: any,
        network: SkhailNetwork<any, any>,
        requestContext: any,
        logger: ILogger,
        response: any
      ) => {
        const [service, method] = builder.getOperationId().split(":");

        const params = {
          ...context.request.params,
          ...context.request.query,
          ...context.request.requestBody,
        };

        const enveloppe = {
          args: [params],
          context: requestContext,
          method,
          service,
        };

        logger.debug("API request", {
          tid: requestContext.tid,
          service,
          method,
        });

        const result = await network.queue.enqueue(enveloppe);

        logger.debug("API send response", {
          tid: requestContext.tid,
          service,
          method,
          success: result.success,
        });

        response.writeHead(200).write(JSON.stringify(result));
        response.end();
      };

    Object.values(this.methods).forEach((builders) => {
      builders.forEach((builder) => {
        (handlers[builder.getOperationId() as keyof typeof handlers] as any) =
          createHandler(builder);
      });
    });

    return handlers;
  }
}

export class OpenAPIBuilder {
  private services: APIServiceBuilder<any>[] = [];

  service(service: Constructor<SkhailService<any>>, name?: string) {
    const serviceBuilder = new APIServiceBuilder(service, name);

    this.services.push(serviceBuilder);

    return serviceBuilder;
  }

  buildDoc() {
    return {
      paths: {
        ...this.services.reduce((agg, serviceBuilder) => {
          return {
            ...agg,
            ...serviceBuilder.buildDoc(),
          };
        }, {}),
      },
    };
  }

  buildHandlers() {
    return this.services.reduce((agg, builder) => {
      return {
        ...agg,
        ...builder.buildHandlers(),
      };
    }, {});
  }
}
