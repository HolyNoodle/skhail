import { ContextOptions, SkhailError, getError } from "@skhail/core";
import { IEnveloppe, IEnveloppeResponse, ILogger, IQueue } from "@skhail/core";
import {
  OpenAPIClientAxios,
  Document as OpenAPIDocument,
} from "openapi-client-axios";

export interface HTTPClientQueueOptions {
  url: string;
  interceptor?: (response: IEnveloppeResponse) => void;
}

export class HTTPClientQueue<Context extends ContextOptions>
  implements IQueue<Context>
{
  private logger!: ILogger;
  private openApiClientDefinition?: Partial<OpenAPIDocument>;
  private openApiClient?: OpenAPIClientAxios;

  constructor(private readonly options: HTTPClientQueueOptions) {}

  setLogger(logger: ILogger) {
    this.logger = logger;
  }

  async setHandler(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  async prepare() {
    const response = await fetch(this.options.url + "/definition", {
      method: "get",
      headers: {
        accept: "application/json",
      },
    });

    this.openApiClientDefinition = await response.json();

    const api = new OpenAPIClientAxios({
      axiosConfigDefaults: {
        baseURL: this.options.url,
        headers: {
          "Content-Type": "application/json",
        },
      },
      definition: {
        openapi: "3.0.1",
        info: {
          title: "test",
          version: "1.0.0",
        },
        ...this.openApiClientDefinition,
      } as any,
    });

    this.openApiClient = await api.init();
  }

  private findMethodDefinition(operationId: string) {
    return Object.values(this.openApiClientDefinition?.paths || {}).reduce(
      (result, pathDef) => {
        if (result) {
          return result;
        }

        if (pathDef!.get?.operationId === operationId) {
          return pathDef?.get;
        }
        if (pathDef!.post?.operationId === operationId) {
          return pathDef?.post;
        }
        if (pathDef!.delete?.operationId === operationId) {
          return pathDef?.delete;
        }
        if (pathDef!.put?.operationId === operationId) {
          return pathDef?.put;
        }

        return undefined;
      },
      undefined
    );
  }

  async enqueue(enveloppe: IEnveloppe<Context>): Promise<IEnveloppeResponse> {
    try {
      const operationId = `${enveloppe.service}:${enveloppe.method}`;

      if (
        !this.openApiClient![operationId as keyof typeof this.openApiClient]
      ) {
        throw new SkhailError({
          name: "not_found",
          message: "Method not found in api definition",
          details: {
            operationId,
          },
        });
      }

      const parameters =
        this.findMethodDefinition(operationId)?.parameters || [];

      const { params, body } = parameters.reduce(
        ({ params, body }, parameter: any) => {
          const { [parameter.name]: prop, ...rest } = body;
          return {
            params: {
              ...params,
              [parameter.name]: prop,
            },
            body: rest,
          };
        },
        { params: {}, body: enveloppe.args[0] || {} }
      );

      const method = this.openApiClient![
        operationId as keyof typeof this.openApiClient
      ] as any;
      const response = await method(params, body, {
        headers: {
          context: JSON.stringify(enveloppe.context),
        },
      });

      if (this.options.interceptor) {
        this.options.interceptor(response.data);
      }

      return response.data;
    } catch (error: any) {
      let actualError = error;

      if (error.response) {
        actualError = error.response.data.error;
      }

      return {
        tid: enveloppe.context.tid,
        success: false,
        error: getError(actualError, {
          path: error.request?.path,
        }).toObject(),
      };
    }
  }
}
