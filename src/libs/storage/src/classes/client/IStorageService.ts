import { IWebSocketService } from "@skhail/http";
import { ContextOptions } from "@skhail/core";
import { WebSocket } from "isomorphic-ws";

export abstract class IStorageService<
  Context extends ContextOptions
> extends IWebSocketService<Context> {
  static identifier = "STORAGE_SERVICE";

  abstract createReadStream(
    socket: typeof WebSocket,
    path: string,
    start?: number
  ): void;
  abstract createWriteStream(
    socket: typeof WebSocket,
    path: string,
    start?: number
  ): void;

  abstract list(path: string): Promise<string[]>;
  abstract delete(path: string): Promise<void>;
}
