/**
 * @group unit
 */
import { WebSocketService } from "@skhail/http/dist/server";
import {
  PullReadableSocketStream,
  PullWritableSocketStream,
} from "@skhail/stream";
import { WebSocket } from "ws";
import { StorageService } from "./StorageService";

jest.mock("ws");
jest.mock("@skhail/stream");

describe("StorageService", () => {
  const logger = {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn().mockImplementation(console.log),
  } as any;

  const superPrepare = jest.fn().mockResolvedValue(undefined);
  const superCleanup = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.resetAllMocks();

    WebSocketService.prototype.prepare = superPrepare;
    WebSocketService.prototype.cleanup = superCleanup;
  });
  it("Should instantiate StorageService", () => {
    const fileSystem = {} as any;
    const service = new StorageService({ fileSystem });

    expect(service).toBeInstanceOf(StorageService);
  });

  describe("prepare", () => {
    it("Should prepare file system", async () => {
      const fileSystem = { prepare: jest.fn() } as any;
      const service = new StorageService({ fileSystem });
      service["logger"] = logger;

      await service.prepare();

      expect(fileSystem.prepare).toHaveBeenCalledTimes(1);
      expect(fileSystem.prepare).toHaveBeenCalledWith();

      expect(superPrepare).toHaveBeenCalledTimes(1);
      expect(superPrepare).toHaveBeenCalledWith();
    });

    it("Should not prepare file system", async () => {
      const fileSystem = {} as any;
      const service = new StorageService({ fileSystem });
      service["logger"] = logger;

      await service.prepare();

      expect(superPrepare).toHaveBeenCalledTimes(1);
      expect(superPrepare).toHaveBeenCalledWith();
    });
  });

  describe("cleanup", () => {
    it("Should cleanup file system", async () => {
      const fileSystem = { cleanup: jest.fn() } as any;
      const service = new StorageService({ fileSystem });
      service["logger"] = logger;

      await service.cleanup();

      expect(fileSystem.cleanup).toHaveBeenCalledTimes(1);
      expect(fileSystem.cleanup).toHaveBeenCalledWith();

      expect(superCleanup).toHaveBeenCalledTimes(1);
      expect(superCleanup).toHaveBeenCalledWith();
    });

    it("Should not cleanup file system", async () => {
      const fileSystem = {} as any;
      const service = new StorageService({ fileSystem });
      service["logger"] = logger;

      await service.cleanup();

      expect(superCleanup).toHaveBeenCalledTimes(1);
      expect(superCleanup).toHaveBeenCalledWith();
    });
  });

  describe("list", () => {
    it("Should call list from file system", async () => {
      const files = ["file1"];
      const fileSystem = { list: jest.fn().mockResolvedValue(files) } as any;
      const service = new StorageService({ fileSystem });
      service["logger"] = logger;

      const result = await service.list("test path");

      expect(fileSystem.list).toHaveBeenCalledTimes(1);
      expect(fileSystem.list).toHaveBeenCalledWith("test path");

      expect(result).toStrictEqual(files);
    });
  });

  describe("delete", () => {
    it("Should call delete from file system", async () => {
      const fileSystem = { delete: jest.fn() } as any;
      const service = new StorageService({ fileSystem });
      service["logger"] = logger;

      await service.delete("test path");

      expect(fileSystem.delete).toHaveBeenCalledTimes(1);
      expect(fileSystem.delete).toHaveBeenCalledWith("test path");
    });
  });

  describe("createWriteStream", () => {
    it("Should call createWriteStream from file system", async () => {
      const websocket = { close: jest.fn() } as any;
      let stream = { readable: { pipeTo: jest.fn() } };

      (WebSocket as any as jest.SpyInstance).mockReturnValue(websocket);
      (PullReadableSocketStream as any as jest.SpyInstance).mockReturnValue(
        stream
      );

      const fsStream = {} as any;
      const fileSystem = {
        createWriteStream: jest.fn().mockResolvedValue(fsStream),
      } as any;
      const service = new StorageService({ fileSystem });
      service["logger"] = logger;

      service.createWriteStream(websocket, "test path");

      await new Promise(process.nextTick);

      expect(PullReadableSocketStream).toHaveBeenCalledTimes(1);
      expect(PullReadableSocketStream).toHaveBeenCalledWith(websocket);

      expect(stream.readable.pipeTo).toHaveBeenCalledTimes(1);
      expect(stream.readable.pipeTo).toHaveBeenCalledWith(fsStream);
    });

    it("Should close socket on stream close", async () => {
      const websocket = { close: jest.fn() } as any;
      let stream = {
        readable: { pipeTo: jest.fn().mockRejectedValue("test error") },
      };

      (WebSocket as any as jest.SpyInstance).mockReturnValue(websocket);
      (PullReadableSocketStream as any as jest.SpyInstance).mockReturnValue(
        stream
      );
      const fsStream = {} as any;
      const fileSystem = {
        createWriteStream: jest.fn().mockResolvedValue(fsStream),
      } as any;
      const service = new StorageService({ fileSystem });

      service["logger"] = logger;

      service.createWriteStream(websocket, "test path");

      await new Promise(process.nextTick);

      expect(PullReadableSocketStream).toHaveBeenCalledTimes(1);
      expect(PullReadableSocketStream).toHaveBeenCalledWith(websocket);

      expect(stream.readable.pipeTo).toHaveBeenCalledTimes(1);
      expect(stream.readable.pipeTo).toHaveBeenCalledWith(fsStream);

      expect(websocket.close).toHaveBeenCalledTimes(1);
      expect(websocket.close).toHaveBeenCalledWith(1007, "test error");
    });

    it("Should reject when createWriteStream fails", async () => {
      const websocket = { close: jest.fn() } as any;
      let stream = {
        readable: { pipeTo: jest.fn().mockResolvedValue(undefined) },
      };

      (WebSocket as any as jest.SpyInstance).mockReturnValue(websocket);
      (PullReadableSocketStream as any as jest.SpyInstance).mockReturnValue(
        stream
      );
      const fileSystem = {
        createWriteStream: jest.fn().mockRejectedValue("test error"),
      } as any;
      const service = new StorageService({ fileSystem });

      service["logger"] = logger;

      service.createWriteStream(websocket, "test path");

      await new Promise(process.nextTick);

      expect(websocket.close).toHaveBeenCalledTimes(1);
      expect(websocket.close).toHaveBeenCalledWith(1007, "test error");
    });
  });

  describe("createReadStream", () => {
    it("Should call createReadStream from file system", async () => {
      const websocket = { close: jest.fn() } as any;
      let stream = {
        writable: { test: "writestream" },
      };

      (WebSocket as any as jest.SpyInstance).mockReturnValue(websocket);
      (PullWritableSocketStream as any as jest.SpyInstance).mockReturnValue(
        stream
      );
      const fsStream = { pipeTo: jest.fn() } as any;
      const fileSystem = {
        createReadStream: jest.fn().mockResolvedValue(fsStream),
      } as any;
      const service = new StorageService({ fileSystem });
      service["logger"] = logger;

      service.createReadStream(websocket, "test path");

      await new Promise(process.nextTick);

      expect(PullWritableSocketStream).toHaveBeenCalledTimes(1);
      expect(PullWritableSocketStream).toHaveBeenCalledWith(websocket);

      expect(fsStream.pipeTo).toHaveBeenCalledTimes(1);
      expect(fsStream.pipeTo).toHaveBeenCalledWith(stream.writable);
    });

    it("Should reject when createWebSocketStream fails", async () => {
      const websocket = { on: jest.fn(), close: jest.fn() } as any;
      let stream = {
        writable: { test: "writestream" },
      };

      (WebSocket as any as jest.SpyInstance).mockReturnValue(websocket);
      (PullWritableSocketStream as any as jest.SpyInstance).mockReturnValue(
        stream
      );
      const fsStream = { pipe: jest.fn() } as any;
      const fileSystem = {
        createReadStream: jest.fn().mockRejectedValue("test error"),
      } as any;
      const service = new StorageService({ fileSystem });

      service["logger"] = logger;

      service.createReadStream(websocket, "test path");

      await new Promise(process.nextTick);

      expect(PullWritableSocketStream).toHaveBeenCalledTimes(0);

      expect(fsStream.pipe).toHaveBeenCalledTimes(0);

      expect(websocket.close).toHaveBeenCalledTimes(1);
      expect(websocket.close).toHaveBeenCalledWith(1007, "test error");
    });
  });
});
