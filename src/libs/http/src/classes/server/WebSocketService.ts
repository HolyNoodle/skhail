import { v4 } from "uuid";
import { ContextOptions, EventOptions, SkhailError } from "@skhail/core";
import { WebSocketHandler } from "./Handlers/WebSocketHandler";
import {
  HTTPServiceOptions,
  defaultHTTPOptions,
  HTTPService,
} from "./HTTPService";
import {
  WebSocketFunction,
  WebSocketFunctionArgs,
  WebSocketFunctions,
} from "../client/types";
import { WebSocketGetter } from "../../utils";

const WebSocket = WebSocketGetter();

export interface WebSocketServiceOptions {
  route: string;
  timeout: number;
}

export const defaultWebSocketOptions: WebSocketServiceOptions = {
  route: "/socket",
  timeout: 15,
};

interface WebSocketRequest {
  method: string;
  args: any[];
  expiresAt: Date;
}

export abstract class WebSocketService<
  Context extends ContextOptions = {},
  Events extends EventOptions = {}
> extends HTTPService<Context, Events> {
  private readonly wsOptions: WebSocketServiceOptions;
  private requests?: Map<string, WebSocketRequest>;
  private interval?: NodeJS.Timer;

  constructor(
    options: Partial<WebSocketServiceOptions> = defaultWebSocketOptions,
    serverOptions: Partial<HTTPServiceOptions> = defaultHTTPOptions
  ) {
    super(serverOptions);

    this.wsOptions = { ...defaultWebSocketOptions, ...options };
  }

  async prepare() {
    this.requests = new Map();

    this.handlers.push(
      new WebSocketHandler(
        this.wsOptions.route,
        this.handleConnectionRequest(this)
      )
    );

    this.interval = setInterval(() => {
      if (!this.requests) {
        clearInterval(this.interval);
        return;
      }

      const now = new Date().getTime();
      const toDelete = Array.from(this.requests.keys()).filter((id) => {
        const { expiresAt } = this.requests!.get(id)!;

        return expiresAt.getTime() <= now;
      });

      if (toDelete.length > 0) {
        this.logger!.debug("Delete websocket connection requests", {
          count: toDelete.length,
        });

        toDelete.forEach((id) => {
          this.requests!.delete(id);
        });
      }
    }, 5000);

    await super.prepare();
  }

  async cleanup() {
    this.requests = undefined;
    this.interval && clearInterval(this.interval);

    await super.cleanup();
  }

  private handleConnectionRequest(self: this) {
    return function (webSocket: typeof WebSocket, id: string) {
      self.logger!.info("Websocket connection opened", { id });

      if (!self.requests!.has(id)) {
        throw new SkhailError({
          name: "not_found",
          message: "Id does not exists or already consumed",
          details: { id },
        });
      }

      const { method, args } = self.requests!.get(id)!;

      self.requests!.delete(id);

      self.logger!.debug("Websocket consuming token", { id, method });

      const methodRef = self[method as keyof typeof self] as WebSocketFunction;

      if (!methodRef) {
        throw new SkhailError({
          name: "not_found",
          message: "Requested method has not been found",
          details: { method },
        });
      }

      Reflect.apply(methodRef, self, [webSocket, ...args]);
    };
  }

  async negociate<
    Key extends keyof Service,
    Service extends WebSocketFunctions<Omit<this, "negociate">>,
    Function extends Service[Key],
    Params extends WebSocketFunctionArgs<Parameters<Function>>
  >({ method, args }: { method: Key; args: Params }): Promise<string> {
    const id = v4();

    const expiresAt = new Date();
    const time = expiresAt.getTime();
    const expireTime = time + 1000 * this.wsOptions.timeout;
    expiresAt.setTime(expireTime);

    this.requests!.set(id, {
      method: method as string,
      args,
      expiresAt,
    });

    this.logger!.debug("Negociate access to websocket method", {
      id,
      method,
    });

    return await Promise.resolve(
      `${this.wsOptions.route}${
        this.wsOptions.route.endsWith("/") ? "" : "/"
      }${id}`
    );
  }
}
