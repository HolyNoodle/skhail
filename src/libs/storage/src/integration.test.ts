/**
 * @group integration
 */
import fetch from "node-fetch";
import { WebSocket } from "ws";
import * as fs from "fs";

import {
  ConsoleLogger,
  InMemoryEventEmitter,
  InMemoryQueue,
  LogLevel,
  SkhailError,
  SkhailServer,
} from "@skhail/core";

import { StorageClient } from "./classes/client/StorageClient";
import { StorageService } from "./classes/server/StorageService";
import { LocalFileSystem } from "./classes/server/LocalFileSystem";
import { HTTPProtocols } from "@skhail/http";
import { WebSocketService } from "@skhail/http/dist/server";
import {
  PullReadableSocketStream,
  PullWritableSocketStream,
} from "@skhail/stream";

interface AppContext {}
SkhailError.stack = true;

if (!globalThis.WebSocket) {
  globalThis["WebSocket"] = WebSocket as any;
}
if (!globalThis.fetch) {
  globalThis["fetch"] = fetch as any;
}

class RelayService extends WebSocketService {
  async read(socket: WebSocket, path: string) {
    const client = new StorageClient(
      this.server.getClient(),
      HTTPProtocols.HTTP,
      "localhost",
      4448
    );
    const inStream = await client.createReadStream(path, 0);
    const outStream = new PullWritableSocketStream(socket);

    await inStream.readable.pipeTo(outStream.writable);
  }
  async write(socket: WebSocket, path: string) {
    const client = new StorageClient(
      this.server.getClient(),
      HTTPProtocols.HTTP,
      "localhost",
      4448
    );
    const outStream = await client.createWriteStream(path, 0);
    const inStream = new PullReadableSocketStream(socket);

    await inStream.readable.pipeTo(outStream.writable);
  }
}

describe("Integration", () => {
  let server: SkhailServer<AppContext>;
  let client: StorageClient;

  beforeAll(async () => {
    const logger = new ConsoleLogger([LogLevel.ERROR]);
    logger["error"] = jest.fn();
    server = new SkhailServer({
      services: [
        new RelayService(
          {
            route: "/relay",
          },
          { port: 4449 }
        ),
        new StorageService(
          {
            fileSystem: new LocalFileSystem("./tmp"),
          },
          {
            route: "/storage",
          },
          {
            port: 4448,
          }
        ),
      ],
      logger,
      queue: new InMemoryQueue(),
      event: new InMemoryEventEmitter(),
    });

    client = new StorageClient(
      server.getClient(),
      HTTPProtocols.HTTP,
      "localhost",
      4448
    );

    await server.start();
  });

  afterAll(async () => {
    await server?.stop();

    fs.rmSync("./tmp", { recursive: true, force: true });
  });

  describe("write", () => {
    it("Should write file", async () => {
      const path = "/write/file.txt";
      const expectedContent = "test content";

      await client.write(path, Buffer.from(expectedContent));

      const content = await client.read(path);

      expect(content.toString()).toBe(expectedContent);
    });
  });

  describe("read", () => {
    it("Should read file", async () => {
      const path = "/read/file.txt";
      const expectedContent = "test content";

      fs.mkdirSync("./tmp/read");
      fs.writeFileSync("./tmp" + path, Buffer.from(expectedContent));

      const content = await client.read(path);

      expect(content.toString()).toBe(expectedContent);
    });

    it("Should reject when path does not exists", async () => {
      await expect(client.read("/read/not-exists.txt")).rejects.toThrow(
        "File does not exist"
      );
    });
  });

  describe("list", () => {
    it("Should list files", async () => {
      const path = "/list/file{num}.txt";
      const expectedContent = "test content{num}";
      const iteration = 3;

      for (let i = 0; i < iteration; ++i) {
        await client.write(
          path.replace("{num}", i.toString()),
          Buffer.from(expectedContent.replace("{num}", i.toString()))
        );
      }

      const files = await client.list("/list");

      expect(files).toHaveLength(iteration);
      for (let i = 0; i < iteration; ++i) {
        expect(files[i]).toBe(path.replace("{num}", i.toString()));
      }
    });

    it("Should reject when path does not exists", async () => {
      let error;
      try {
        await client.list("/list-not-exists");
      } catch (e) {
        error = e;
      }

      expect(error.toObject()).toMatchObject({
        name: "not_found",
        details: {
          method: "list",
          service: "STORAGE_SERVICE",
          path: "/list-not-exists",
        },
        message: "Path does not exist",
        name: "not_found",
      });
    });
  });

  describe("delete", () => {
    it("Should delete file", async () => {
      const path = "/delete/file.txt";
      const expectedContent = "test content";

      fs.mkdirSync("./tmp/delete");
      fs.writeFileSync("./tmp" + path, Buffer.from(expectedContent));

      await client.delete(path);

      expect(fs.existsSync("./tmp" + path)).toBe(false);
    });
  });

  describe("createWriteStream", () => {
    it("Should write to file through stream", async () => {
      const path = "/write-stream/file.txt";
      const expectedContent = "test content";
      const buffer = Buffer.from("test content");

      let buffers: Buffer[] = [];
      for (let i = 0; i < 120000; i++) {
        buffers.push(Buffer.from(expectedContent));
      }

      const stream = await client.createWriteStream(path);
      const writer = stream.writable.getWriter();

      await writer.write(Buffer.concat(buffers));

      await writer.close();

      const content = await client.read(path);

      expect(content.toString()).toBe(Buffer.concat(buffers).toString());
    });
  });

  describe("createReadStream", () => {
    it("Should read file through stream", async () => {
      const path = "/read-stream/file.txt";
      const expectedContent = "test content";

      let buffers: Buffer[] = [];
      for (let i = 0; i < 120000; i++) {
        buffers.push(Buffer.from(expectedContent));
      }

      fs.mkdirSync("./tmp/read-stream");
      fs.writeFileSync("./tmp" + path, Buffer.concat(buffers));

      const readStream = await client.createReadStream(path);
      const reader = await readStream.readable.getReader();

      let chunks: any[] = [];
      while (true) {
        const { value, done } = await reader.read();

        if (done) {
          break;
        }

        chunks.push(Buffer.from(value));
      }

      expect(Buffer.concat(chunks).toString()).toBe(
        Buffer.concat(buffers).toString()
      );
    });
  });
});
