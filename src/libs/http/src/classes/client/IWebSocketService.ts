import { ContextOptions, EventOptions } from "@skhail/core";

import { WebSocketFunctionArgs, WebSocketFunctions } from "./types";
import { IHTTPService } from "./IHTTPService";

export abstract class IWebSocketService<
  Context extends ContextOptions = {},
  Events extends EventOptions = {}
> extends IHTTPService<Context, Events> {
  abstract negociate<
    Key extends keyof Service,
    Service extends WebSocketFunctions<Omit<this, "negociate">>,
    Function extends Service[Key],
    Params extends WebSocketFunctionArgs<Parameters<Function>>
  >(parameters: { method: Key; args: [...Params] }): Promise<string>;
}
