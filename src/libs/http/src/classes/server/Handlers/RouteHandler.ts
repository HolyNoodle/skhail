import { IncomingMessage, ServerResponse } from "http";
import {
  ContextOptions,
  ILogger,
  IRequestContext,
  ISkhailServer,
  SkhailNetwork,
} from "@skhail/core";
import { IRequestHandler } from "../types";

import "urlpattern-polyfill";
import { getError } from "@skhail/core";
import { v4 } from "uuid";

export interface RouteHandlerOptions {
  route: string;
  service: string;
  method: string;
  raw?: boolean;
}

export class RouteHandler<ContextType extends ContextOptions>
  implements IRequestHandler<ContextType>
{
  private readonly pattern: URLPattern;
  private logger?: ILogger;

  constructor(private readonly options: RouteHandlerOptions) {
    this.pattern = new URLPattern(options.route, "http://example.com");
  }

  setLogger(logger: ILogger): void {
    this.logger = logger;
  }

  static getURL(url: string) {
    return `http://example.com${url}`;
  }

  private getParameters(request: IncomingMessage) {
    const routeParams =
      (request.url &&
        this.pattern.exec(RouteHandler.getURL(request.url))?.pathname.groups) ||
      {};

    if (request.method === "GET") {
      return Promise.resolve(routeParams);
    }

    return new Promise<any>((resolve, reject) => {
      const bodyChunks: Buffer[] = [];

      request.on("data", (data: Buffer) => {
        bodyChunks.push(data);
      });

      request.on("error", (err) => {
        const error = getError(err);

        reject(error);
      });

      request.on("end", () => {
        const body = Buffer.concat(bodyChunks).toString();

        const bodyParams = JSON.parse(body);

        resolve({
          ...routeParams,
          ...bodyParams,
        });
      });
    });
  }

  match(url: string): boolean {
    return this.pattern.test(RouteHandler.getURL(url));
  }

  async handle(
    network: SkhailNetwork<ContextType, any>,
    request: IncomingMessage,
    response: ServerResponse<IncomingMessage>
  ): Promise<void> {
    this.logger!.info("Route request", {
      service: this.options.service,
      method: this.options.method,
    });
    try {
      const contextContent = request.headers["skhail-route-context"] as
        | string
        | undefined;
      const context: IRequestContext<ContextType> = contextContent
        ? JSON.parse(contextContent)
        : {
            tid: v4(),
            data: {},
            origin: "RouteService.handle",
          };

      const params = await this.getParameters(request);

      const result = await network.queue.enqueue({
        service: this.options.service,
        method: this.options.method,
        args: [params],
        context,
      });

      this.logger!.info("Route response send", {
        service: this.options.service,
        method: this.options.method,
        success: result.success,
      });
      if (result.success === false) {
        switch (result.error.name) {
          case "denied":
            response.writeHead(401, result.error.message, {
              "Content-Type": "application/json",
            });
            break;
          case "not_found":
            response.writeHead(404, result.error.message, {
              "Content-Type": "application/json",
            });
            break;
          default:
            response.writeHead(500, result.error.message, {
              "Content-Type": "application/json",
            });
            break;
        }

        response.write(
          JSON.stringify({
            success: false,
            error: result.error,
          })
        );
        response.end();
        return;
      }

      if (!this.options.raw) {
        response.writeHead(200, {
          "Content-Type": "application/json",
        });
        response.write(JSON.stringify(result));
      } else {
        response.writeHead(200, {
          "Content-Type": "application/octet-stream",
        });
        response.write(result.response);
      }
      response.end();
    } catch (err) {
      response.writeHead(500, {
        "Content-Type": "application/json",
      });
      response.write(
        JSON.stringify({
          success: false,
          error: getError(err).toObject(),
        })
      );
      response.end();
    }
  }
}
