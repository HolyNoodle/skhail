import { IncomingMessage, ServerResponse } from "http";
import {
  ContextOptions,
  ILogger,
  ISkhailServer,
  SkhailNetwork,
} from "@skhail/core";
import { Duplex } from "stream";
import { IRequestHandler } from "../types";
import { WebSocketServer, WebSocket } from "ws";
import { getError } from "@skhail/core";

import "urlpattern-polyfill";
import { RouteHandler } from "./RouteHandler";

export class WebSocketHandler<ContextType extends ContextOptions>
  implements IRequestHandler<ContextType>
{
  private webSocketServer?: WebSocketServer;
  private readonly pattern: URLPattern;
  private logger?: ILogger;

  constructor(
    route: string,
    private readonly callback: (websocket: WebSocket, id: string) => void
  ) {
    const pattern = route + (route.endsWith("/") ? "" : "/") + ":id";
    this.pattern = new URLPattern(pattern, "http://example.com");
  }

  setLogger(logger: ILogger): void {
    this.logger = logger;
  }

  private getParameters(request: IncomingMessage) {
    return (
      (request.url &&
        this.pattern.exec(RouteHandler.getURL(request.url))?.pathname.groups) ||
      {}
    );
  }

  match(url: string): boolean {
    return this.pattern.test(RouteHandler.getURL(url));
  }

  async prepare() {
    this.webSocketServer = new WebSocketServer({
      noServer: true,
    });

    this.webSocketServer.on("error", (err) => {
      const error = getError(err);

      this.logger!.error("WebSocket server error", { error: error.toObject() });
    });

    this.webSocketServer.on("connection", (webSocket, request) => {
      const { id } = this.getParameters(request);

      this.logger!.debug("WebSocket connection requested", { id });

      if (!id) {
        webSocket.close(
          1007,
          "WebSocket connection premature closing: no id provided"
        );

        return;
      }

      try {
        this.callback(webSocket, id);
      } catch (err: any) {
        webSocket.close(3000, err.message);
      }
    });

    return await Promise.resolve();
  }

  async cleanup(): Promise<void> {
    return await new Promise<void>((resolve, reject) => {
      if (!this.webSocketServer) {
        resolve();
        return;
      }

      for (const ws of this.webSocketServer.clients) ws.close();

      this.webSocketServer.close((err) => {
        if (err) {
          reject(getError(err));
          return;
        }

        resolve();
      });
    });
  }

  upgrade(
    _network: SkhailNetwork<ContextType, any>,
    request: IncomingMessage,
    socket: Duplex,
    head: Buffer
  ): void {
    this.logger!.debug("Websocket upgrade");
    this.webSocketServer!.handleUpgrade(request, socket, head, (webSocket) => {
      this.logger!.debug("Websocket connection");
      this.webSocketServer!.emit("connection", webSocket, request);
    });
  }

  async handle(
    _network: SkhailNetwork<ContextType, any>,
    _request: IncomingMessage,
    response: ServerResponse<IncomingMessage>
  ): Promise<void> {
    return await new Promise<void>((resolve) => {
      response.writeHead(404);
      response.end();

      resolve();
    });
  }
}
