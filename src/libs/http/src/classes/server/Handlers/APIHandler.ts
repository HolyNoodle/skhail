import { IncomingMessage, ServerResponse } from "http";
import {
  ContextOptions,
  EmitterListener,
  IEnveloppeResponse,
  ILogger,
  IRequestContext,
  ISkhailServer,
  LogMessage,
  SkhailError,
  SkhailNetwork,
} from "@skhail/core";
import { Duplex } from "stream";
import { IRequestHandler } from "../types";
import { WebSocketServer, WebSocket } from "ws";
import { getError } from "@skhail/core";

import { OpenAPIBackend } from "openapi-backend";
import { OpenAPIBuilder } from "./OpenAPI.utils";

export class APIHandler<ContextType extends ContextOptions>
  implements IRequestHandler<ContextType>
{
  private logger?: ILogger;
  private openApi?: OpenAPIBackend;

  constructor(private openApiBuilder: OpenAPIBuilder) {}

  setLogger(logger: ILogger): void {
    this.logger = logger;
  }

  match(): boolean {
    return true;
  }

  getStatusFromResult(_: IEnveloppeResponse) {
    return 200;
  }

  private readRequest(request: IncomingMessage) {
    const bodyChunks: Buffer[] = [];

    return new Promise<any>((resolve, reject) => {
      request.on("data", (data: Buffer) => {
        this.logger!.debug("Request: receive body chunk");
        bodyChunks.push(data);
      });

      request.on("error", (err: any) => {
        const error = getError(err);
        this.logger!.warning("API request reading error", {
          error: error.toObject(),
        });
        reject(error);
      });

      request.on("end", async () => {
        resolve(Buffer.concat(bodyChunks).toString());
      });
    });
  }

  async prepare() {
    this.openApi = new OpenAPIBackend({
      definition: {
        openapi: "3.0.1",
        info: {
          title: "test",
          version: "1.0.0",
        },
        ...this.openApiBuilder.buildDoc(),
      },
    });

    this.openApi.register(this.openApiBuilder.buildHandlers());

    await this.openApi.init();
  }

  async handle(
    network: SkhailNetwork<ContextType, any>,
    request: IncomingMessage,
    response: ServerResponse<IncomingMessage>
  ): Promise<void> {
    this.logger!.debug("API request handle");

    if (request.url === "/definition") {
      response
        .writeHead(200, {
          "Content-Type": "application/json",
        })
        .write(JSON.stringify(this.openApiBuilder.buildDoc()));

      response.end();
      return;
    }

    const body = await this.readRequest(request);

    if (request.url === "/logs" && request.method === "POST") {
      try {
        const logs: LogMessage[] = JSON.parse(body);

        logs.forEach((log) => this.logger!.log(log));

        response.writeHead(204).end();
      } catch (err: any) {
        const error = getError(err);

        this.logger!.warning("API log request reading error", {
          error,
        });

        response.writeHead(500).end();
      }
      return;
    }

    try {
      if (!request.headers.context) {
        const error = new SkhailError({
          message: "Context header is missing",
          name: "unexpected",
        });
        this.logger!.debug("API request error", {
          error: error.toObject(),
        });

        response.writeHead(400, {
          "Content-Type": "application/json",
        });
        response.write(
          JSON.stringify({
            success: false,
            error: error.toObject(),
          })
        );
        response.end();

        return;
      }

      const context = JSON.parse(
        request.headers.context as string
      ) as IRequestContext<any>;

      const urlInfo = new URL("http://exam.ple" + request.url!);

      await this.openApi?.handleRequest(
        {
          headers: {},
          method: request.method!,
          path: urlInfo.pathname,
          body: body,
          query: urlInfo.search,
        },
        network,
        context,
        this.logger,
        response
      );
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
