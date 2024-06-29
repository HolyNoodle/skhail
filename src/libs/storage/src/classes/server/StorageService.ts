import { WebSocket } from "ws";
import {
  defaultHTTPOptions,
  defaultWebSocketOptions,
  HTTPServiceOptions,
  WebSocketService,
  WebSocketServiceOptions,
} from "@skhail/http/dist/server";
import "urlpattern-polyfill";
import { IFileSystem } from "../../types";
import { ContextOptions, getError } from "@skhail/core";
import {
  PullWritableSocketStream,
  PullReadableSocketStream,
} from "@skhail/stream";
import { StorageRequestHandler } from "./StorageRequestHandler";

export interface StorageServiceOptions {
  fileSystem: IFileSystem;
}

export class StorageService<
  Context extends ContextOptions
> extends WebSocketService<Context> {
  static identifier = "STORAGE_SERVICE";

  constructor(
    private storageOptions: StorageServiceOptions,
    wsOptions: Partial<WebSocketServiceOptions> = defaultWebSocketOptions,
    serverOptions: Partial<HTTPServiceOptions> = defaultHTTPOptions
  ) {
    super(wsOptions, serverOptions);
  }

  async prepare() {
    this.logger!.info("Preparing storage", {
      fileSystem: this.storageOptions.fileSystem.constructor.name,
    });
    this.handlers.push(
      new StorageRequestHandler({
        storage: this.storageOptions.fileSystem,
        route: "/storage",
      })
    );

    await this.storageOptions.fileSystem.prepare?.();

    await super.prepare();
  }

  async cleanup() {
    await super.cleanup();

    this.logger!.info("Cleanup storage", {
      fileSystem: this.storageOptions.fileSystem.constructor.name,
    });
    await this.storageOptions.fileSystem.cleanup?.();
  }

  createReadStream(socket: WebSocket, path: string, start: number = 0) {
    this.logger!.debug("Create read stream to resource", { path, start });
    const fileSystem = this.storageOptions.fileSystem;

    fileSystem
      .createReadStream(path, start)
      .then(async (stream) => {
        const streamSocket = new PullWritableSocketStream(socket);
        await stream.pipeTo(streamSocket.writable);
      })
      .catch((err) => {
        const error = getError(err);
        this.logger!.error("Error while creating read stream", {
          path,
          start,
          error,
        });
        socket.close(1007, error.message);
      });
  }
  createWriteStream(socket: WebSocket, path: string, start?: number) {
    this.logger!.debug("Create write stream to resource", { path, start });

    const fileSystem = this.storageOptions.fileSystem;

    fileSystem
      .createWriteStream(path, start)
      .then((stream) => {
        const streamSocket = new PullReadableSocketStream(socket);

        return streamSocket.readable.pipeTo(stream as any);
      })
      .catch((err) => {
        const error = getError(err);
        this.logger!.error("Error while creating write stream", {
          path,
          start,
          error,
        });
        socket.close(1007, error.message);
      });
  }
  list(path: string) {
    this.logger!.debug("List resources", { path });
    return this.storageOptions.fileSystem.list(path);
  }
  delete(path: string) {
    this.logger!.debug("Delete resource", { path });
    return this.storageOptions.fileSystem.delete(path);
  }
}
