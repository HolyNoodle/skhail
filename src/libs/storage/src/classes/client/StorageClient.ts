import { ISkhailClient, SkhailService, getError } from "@skhail/core";
import { IStorageService } from "./IStorageService";
import {
  PullReadableSocketStream,
  PullWritableSocketStream,
} from "@skhail/stream";
import WebSocket from "isomorphic-ws";
import { HTTPProtocols } from "@skhail/http";

function concat(views: ArrayBuffer[]) {
  let length = 0;
  for (const v of views) length += v.byteLength;

  let buf = new Uint8Array(length);
  let offset = 0;
  for (const v of views) {
    const uint8view = new Uint8Array(v, 0, v.byteLength);
    buf.set(uint8view, offset);
    offset += uint8view.byteLength;
  }

  return buf;
}

function chunk(buffer: Buffer, maxBytes: number = 10 * 1024 * 1024) {
  const result: Buffer[] = [];
  while (buffer.length) {
    const i = Math.min(maxBytes, buffer.length);
    result.push(buffer.subarray(0, i));
    buffer = buffer.subarray(i);
  }

  return result;
}

export class StorageClient {
  constructor(
    private client: ISkhailClient<any>,
    private protocol: HTTPProtocols,
    private host: string,
    private port: number
  ) {}

  private getURL(storagePath: string) {
    return `${this.protocol === HTTPProtocols.HTTP ? "ws" : "wss"}://${
      this.host
    }:${this.port}${storagePath}`;
  }

  list(path: string) {
    return this.client.get(IStorageService).list(path);
  }
  delete(path: string) {
    return this.client.get(IStorageService).delete(path);
  }

  async write(path: string, data: Buffer) {
    const url = await this.client
      .get(IStorageService)
      .negociate({ method: "createWriteStream", args: [path] });

    const socket = new WebSocket(this.getURL(url));
    const stream = new PullWritableSocketStream(socket);

    const chunks = chunk(data);

    try {
      const writer = stream.writable.getWriter();

      for (const chunk of chunks) {
        await writer.write(chunk);
      }

      await writer.close();
    } catch (err) {
      const error = getError(err);

      socket.close(3000, error.message);

      throw error;
    }
  }
  async read(path: string) {
    const url = await this.client
      .get(IStorageService)
      .negociate({ method: "createReadStream", args: [path] });

    const socket = new WebSocket(this.getURL(url));

    return new Promise<Buffer>(async (resolve, reject) => {
      try {
        const stream = new PullReadableSocketStream(socket);
        const chunks: ArrayBuffer[] = [];

        const reader = stream.readable.getReader();
        while (true) {
          const { value, done } = await reader.read();

          if (done) {
            break;
          }

          chunks.push(value);
        }

        reader.releaseLock();

        resolve(Buffer.from(concat(chunks).buffer));
      } catch (err) {
        reject(getError(err));
      }
    });
  }
  async createReadStream(path: string, start?: number) {
    const url = await this.client
      .get(IStorageService)
      .negociate({ method: "createReadStream", args: [path, start] });

    return new Promise<PullReadableSocketStream>((resolve) => {
      const socket = new WebSocket(this.getURL(url));
      socket.binaryType = "arraybuffer";

      socket.onopen = () => {
        resolve(new PullReadableSocketStream(socket));
      };
    });
  }
  async createWriteStream(path: string, start?: number) {
    const url = await this.client
      .get(IStorageService)
      .negociate({ method: "createWriteStream", args: [path, start] });

    return new Promise<PullWritableSocketStream>((resolve, reject) => {
      const socket = new WebSocket(this.getURL(url));
      socket.binaryType = "arraybuffer";

      socket.onopen = () => {
        resolve(new PullWritableSocketStream(socket));
      };

      socket.onerror = (err) => {
        const error = getError(err);

        reject(error);
      };
    });
  }
}
