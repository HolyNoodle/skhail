import { IncomingMessage, ServerResponse } from "http";
import {
  ContextOptions,
  ILogger,
  ISkhailServer,
  SkhailNetwork,
} from "@skhail/core";
import internal from "stream";

export interface IRequestHandler<ContextType extends ContextOptions = {}> {
  setLogger: (logger: ILogger) => void;
  match: (url: string) => boolean;
  prepare?: () => Promise<void>;
  cleanup?: () => Promise<void>;
  upgrade?: (
    server: SkhailNetwork<ContextType, any>,
    request: IncomingMessage,
    socket: internal.Duplex,
    head: Buffer
  ) => void;
  handle: (
    server: SkhailNetwork<ContextType, any>,
    request: IncomingMessage,
    response: ServerResponse
  ) => Promise<void>;
}
