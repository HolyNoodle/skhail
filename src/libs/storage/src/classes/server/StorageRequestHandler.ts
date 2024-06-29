import { ILogger, ISkhailServer, SkhailNetwork } from "@skhail/core";
import { IRequestHandler } from "@skhail/http/dist/server";
import { WritableStream } from "@skhail/stream-isomorphic";
import { IncomingMessage, ServerResponse } from "http";
import { IFileSystem } from "../../types";

export interface StorageRequestHandlerOptions {
  route: string;
  storage: IFileSystem;
}

export class StorageRequestHandler implements IRequestHandler {
  private readonly pattern: URLPattern;
  private logger?: ILogger;

  constructor(private readonly options: StorageRequestHandlerOptions) {
    this.pattern = new URLPattern(options.route + "/*", "http://example.com");
  }

  setLogger(logger: ILogger): void {
    this.logger = logger;
  }

  static getURL(url: string) {
    return `http://example.com${url}`;
  }

  match(url: string) {
    return this.pattern.test(StorageRequestHandler.getURL(url));
  }

  async handle(
    _: SkhailNetwork<any, any>,
    request: IncomingMessage,
    response: ServerResponse<IncomingMessage>
  ) {
    const path =
      request.url &&
      this.pattern.exec(StorageRequestHandler.getURL(request.url))?.pathname
        .groups[0];

    if (!path) {
      response.writeHead(403, "Undefined path").end();
      return;
    }

    const stream = await this.options.storage.createReadStream(path, 0);

    await stream.pipeTo(
      new WritableStream<ArrayBuffer>({
        start: () => {
          response.writeHead(200);
        },
        write: (chunk) => {
          if (!response.write(chunk)) {
            return new Promise<void>((resolve) => {
              response.once("drain", () => {
                resolve();
              });
            });
          }
        },
        close: () => {
          response.end();
        },
      })
    );
  }
}
