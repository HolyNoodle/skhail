import { Server, createServer, IncomingMessage, ServerResponse } from "http";
import { createServer as createSecuredServer, ServerOptions } from "https";
import {
  ContextOptions,
  getError,
  SkhailError,
  Constructor,
  EventOptions,
  IEnveloppeResponse,
  SkhailService,
  ServiceFunctions,
} from "@skhail/core";
import { RouteHandler } from "./Handlers/RouteHandler";
import { HTTPProtocols } from "../client/types";
import { IRequestHandler } from "./types";

export type HTTPServiceOptions = {
  port: number;
  allowedOrigins: string[];
} & (
  | {
      protocol: HTTPProtocols.HTTP;
    }
  | {
      protocol: HTTPProtocols.HTTPS;
      tls: ServerOptions;
    }
);

export const defaultHTTPOptions: HTTPServiceOptions = {
  protocol: HTTPProtocols.HTTP,
  port: 5000,
  allowedOrigins: ["*"],
};

export class HTTPService<
  Context extends ContextOptions = {},
  Events extends EventOptions = {}
> extends SkhailService<Context, Events> {
  static identifier = "HTTPService";
  protected httpServer?: Server;
  protected options: HTTPServiceOptions;
  protected handlers: IRequestHandler<Context>[];

  constructor(options: Partial<HTTPServiceOptions> = defaultHTTPOptions) {
    super();

    this.handlers = [];

    this.options = {
      ...defaultHTTPOptions,
      ...options,
    } as HTTPServiceOptions;
  }

  private requestHandler(self: this) {
    return (request: IncomingMessage, response: ServerResponse) => {
      if (
        self.options.allowedOrigins.includes("*") ||
        (request.headers.origin &&
          self.options.allowedOrigins.includes(request.headers.origin))
      ) {
        response.setHeader(
          "Access-Control-Allow-Origin",
          request.headers.origin || "*"
        );
      } else {
        response.setHeader("Access-Control-Allow-Origin", "null");
      }

      if (request.method === "OPTIONS") {
        response.setHeader(
          "Access-Control-Allow-Headers",
          "Content-Type, Accept, Origin, Context"
        );
        response.setHeader(
          "Access-Control-Allow-Methods",
          "GET, POST, PUT, DELETE, PATCH, OPTIONS"
        );

        response.end();
        return;
      }

      const tid = request.headers["skhail-tid"] as string;

      for (let i = 0; i < this.handlers?.length || 0; ++i) {
        const handler = this.handlers[i];
        if (request.url && handler.match(request.url)) {
          handler.handle(this.network, request, response);

          return;
        }
      }

      const message =
        "No request handler registered for this route: " + request.url;
      response.writeHead(404, message, {
        "Content-Type": "application/json",
      });

      response.write(
        JSON.stringify({
          tid,
          success: false,
          error: new SkhailError({
            message: "No request handler registered for this route",
            name: "not_found",
            details: {
              url: request.url,
            },
          }).toObject(),
        } as IEnveloppeResponse)
      );
      response.end();
    };
  }

  async prepare() {
    this.logger!.debug("HTTP server starting", {
      port: this.options.port,
      protocol: this.options.protocol,
    });

    const promises = this.handlers?.map(async (handler) => {
      handler.setLogger(this.logger!);

      return await handler.prepare?.();
    });

    await Promise.all(promises);

    const requestHandler = this.requestHandler(this);
    this.httpServer =
      this.options.protocol === HTTPProtocols.HTTP
        ? createServer(requestHandler)
        : createSecuredServer(this.options.tls, requestHandler);

    this.httpServer.on("upgrade", (request, socket, head) => {
      this.logger!.debug("Upgrade request", { url: request.url });
      if (request.headers.upgrade !== "websocket") {
        socket.end("HTTP/1.1 400 Bad Request");
        return;
      }

      for (let i = 0; i < this.handlers?.length || 0; ++i) {
        const handler = this.handlers[i];

        if (request.url && handler.upgrade && handler.match(request.url)) {
          this.logger!.debug("Upgrade handler execution", {
            url: request.url,
            handler: handler.constructor.name,
          });

          handler.upgrade(this.network, request, socket, head);

          return;
        }
      }

      socket.destroy(new Error("No upgrade handler found for " + request.url));
    });

    return await new Promise<void>((resolve) => {
      this.httpServer!.listen(this.options.port, "0.0.0.0", () => {
        resolve();

        this.logger!.info("HTTP server running", {
          port: this.options.port,
          protocol: this.options.protocol,
        });
      });
    });
  }

  async cleanup() {
    return await new Promise<void>(async (resolve) => {
      this.logger!.debug("HTTP server cleaning handler", {
        port: this.options.port,
        protocol: this.options.protocol,
      });
      const promises = this.handlers?.map(async (handler) => {
        return await handler.cleanup?.();
      });

      await Promise.all(promises);

      this.logger!.debug("HTTP server stopping", {
        port: this.options.port,
        protocol: this.options.protocol,
      });

      this.httpServer!.close((err) => {
        if (err) {
          this.logger!.error("An error occured while stopping the server", {
            error: getError(err).toObject(),
          });
        }

        this.logger!.info("HTTP server stopped", {
          port: this.options.port,
          protocol: this.options.protocol,
        });

        resolve();
      });
    });
  }

  registerRoute<Service extends SkhailService<Context>>(
    route: string,
    service: Constructor<Service>,
    method: keyof ServiceFunctions<Service, Context>,
    raw: boolean = false
  ) {
    this.handlers.push(
      new RouteHandler({
        route,
        service: service.identifier,
        method: method as string,
        raw,
      })
    );
  }
}
