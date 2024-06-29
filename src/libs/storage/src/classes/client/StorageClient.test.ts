/**
 * @group unit
 */
import { WebSocket } from "ws";
import { StorageClient } from "./StorageClient";
import {
  PullReadableSocketStream,
  PullWritableSocketStream,
} from "@skhail/stream";
import { HTTPProtocols } from "@skhail/http";

jest.mock("ws");
jest.mock("@skhail/stream");

describe("StorageClient", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("Should instantiate StorageClient", () => {
    const client = {};
    const storage = new StorageClient(
      client as any,
      HTTPProtocols.HTTP,
      "domainhost",
      123
    );

    expect(storage).toBeInstanceOf(StorageClient);
  });

  describe("write", () => {
    it("Should call storage service write", async () => {
      let websocket = { send: jest.fn(), close: jest.fn() };
      let writer = { write: jest.fn(), close: jest.fn() };
      let stream = {
        writable: { getWriter: jest.fn().mockReturnValue(writer) },
      };

      (WebSocket as any as jest.SpyInstance).mockReturnValue(websocket);
      (PullWritableSocketStream as any as jest.SpyInstance).mockReturnValue(
        stream
      );

      const negociate = jest.fn().mockResolvedValue("/test url");
      const client = { get: () => ({ negociate }) };
      const storage = new StorageClient(
        client as any,
        HTTPProtocols.HTTP,
        "domainhost",
        123
      );

      const promise = storage.write("test path", Buffer.from("content"));

      await new Promise(process.nextTick);

      expect(negociate).toHaveBeenCalledTimes(1);
      expect(negociate).toHaveBeenCalledWith({
        method: "createWriteStream",
        args: ["test path"],
      });

      expect(WebSocket).toHaveBeenCalledTimes(1);
      expect(WebSocket).toHaveBeenCalledWith("ws://domainhost:123/test url");

      expect(PullWritableSocketStream).toHaveBeenCalledTimes(1);
      expect(PullWritableSocketStream).toHaveBeenCalledWith(websocket);

      expect(stream.writable.getWriter).toHaveBeenCalledTimes(1);
      expect(stream.writable.getWriter).toHaveBeenCalledWith();

      expect(writer.write).toHaveBeenCalledTimes(1);
      expect(writer.write).toHaveBeenCalledWith(Buffer.from("content"));

      expect(writer.close).toHaveBeenCalledTimes(1);
      expect(writer.close).toHaveBeenCalledWith();

      expect(promise).resolves.toBeUndefined();
    });

    it("Should reject with code 3000", async () => {
      let websocket = { send: jest.fn(), close: jest.fn() };
      let writer = {
        write: jest.fn().mockRejectedValue("test error"),
        close: jest.fn(),
      };
      let stream = {
        writable: { getWriter: jest.fn().mockReturnValue(writer) },
      };

      (WebSocket as any as jest.SpyInstance).mockReturnValue(websocket);
      (PullWritableSocketStream as any as jest.SpyInstance).mockReturnValue(
        stream
      );

      const negociate = jest.fn().mockResolvedValue("/test url");
      const client = { get: () => ({ negociate }) };
      const storage = new StorageClient(
        client as any,
        HTTPProtocols.HTTP,
        "domainhost",
        123
      );

      let error;
      try {
        const promise = storage.write("test path", Buffer.from("content"));

        await new Promise(process.nextTick);

        await promise;
      } catch (e) {
        error = e;
      }

      expect(error).toBeDefined();
      expect(error.toObject()).toStrictEqual({
        name: "unexpected",
        details: {},
        message: "test error",
        name: "unexpected",
      });

      expect(negociate).toHaveBeenCalledTimes(1);
      expect(negociate).toHaveBeenCalledWith({
        method: "createWriteStream",
        args: ["test path"],
      });

      expect(WebSocket).toHaveBeenCalledTimes(1);
      expect(WebSocket).toHaveBeenCalledWith("ws://domainhost:123/test url");

      expect(websocket.close).toHaveBeenCalledTimes(1);
      expect(websocket.close).toHaveBeenCalledWith(3000, "test error");
    });

    it("Should call on wss protocol", async () => {
      let websocket = { send: jest.fn(), close: jest.fn() };
      let writer = {
        write: jest.fn().mockRejectedValue("test error"),
        close: jest.fn(),
      };
      let stream = {
        writable: { getWriter: jest.fn().mockReturnValue(writer) },
      };

      (WebSocket as any as jest.SpyInstance).mockReturnValue(websocket);
      (PullWritableSocketStream as any as jest.SpyInstance).mockReturnValue(
        stream
      );

      const negociate = jest.fn().mockResolvedValue("/test url");
      const client = { get: () => ({ negociate }) };
      const storage = new StorageClient(
        client as any,
        HTTPProtocols.HTTPS,
        "domainhost",
        123
      );

      let error;
      try {
        const promise = storage.write("test path", Buffer.from("content"));

        await new Promise(process.nextTick);

        await promise;
      } catch (e) {
        error = e;
      }

      expect(error).toBeDefined();
      expect(error.toObject()).toStrictEqual({
        name: "unexpected",
        details: {},
        message: "test error",
        name: "unexpected",
      });

      expect(negociate).toHaveBeenCalledTimes(1);
      expect(negociate).toHaveBeenCalledWith({
        method: "createWriteStream",
        args: ["test path"],
      });

      expect(WebSocket).toHaveBeenCalledTimes(1);
      expect(WebSocket).toHaveBeenCalledWith("wss://domainhost:123/test url");

      expect(websocket.close).toHaveBeenCalledTimes(1);
      expect(websocket.close).toHaveBeenCalledWith(3000, "test error");
    });
  });

  describe("read", () => {
    it("Should call storage service read", async () => {
      let websocket = { send: jest.fn(), close: jest.fn() };
      let reader = {
        releaseLock: jest.fn(),
        read: jest
          .fn()
          .mockResolvedValueOnce({ value: Buffer.from("cont"), done: false })
          .mockResolvedValueOnce({ value: Buffer.from("ent"), done: false })
          .mockResolvedValueOnce({ value: null, done: true }),
      };
      let stream = {
        readable: { getReader: jest.fn().mockReturnValue(reader) },
      };

      (WebSocket as any as jest.SpyInstance).mockReturnValue(websocket);
      (PullReadableSocketStream as any as jest.SpyInstance).mockReturnValue(
        stream
      );

      const negociate = jest.fn().mockResolvedValue("/test url");
      const client = { get: () => ({ negociate }) };
      const storage = new StorageClient(
        client as any,
        HTTPProtocols.HTTP,
        "domainhost",
        123
      );

      const promise = storage.read("test path");

      await new Promise(process.nextTick);

      expect(negociate).toHaveBeenCalledTimes(1);
      expect(negociate).toHaveBeenCalledWith({
        method: "createReadStream",
        args: ["test path"],
      });

      expect(WebSocket).toHaveBeenCalledTimes(1);
      expect(WebSocket).toHaveBeenCalledWith("ws://domainhost:123/test url");

      const buffer = await promise;

      expect(buffer.toString()).toBe("content");
    });

    it("Should reject when read fails", async () => {
      let websocket = { send: jest.fn(), close: jest.fn() };
      let reader = {
        releaseLock: jest.fn(),
        read: jest
          .fn()
          .mockResolvedValueOnce({ value: Buffer.from("cont"), done: false })
          .mockRejectedValue("test error"),
      };
      let stream = {
        readable: { getReader: jest.fn().mockReturnValue(reader) },
      };

      (WebSocket as any as jest.SpyInstance).mockReturnValue(websocket);
      (PullReadableSocketStream as any as jest.SpyInstance).mockReturnValue(
        stream
      );

      const negociate = jest.fn().mockResolvedValue("/test url");
      const client = { get: () => ({ negociate }) };
      const storage = new StorageClient(
        client as any,
        HTTPProtocols.HTTP,
        "domainhost",
        123
      );
      let error;

      try {
        const promise = storage.read("test path");

        await new Promise(process.nextTick);

        await promise;
      } catch (e) {
        error = e;
      }

      expect(error).toBeDefined();
      expect(error.toObject()).toStrictEqual({
        name: "unexpected",
        details: {},
        message: "test error",
        name: "unexpected",
      });

      expect(negociate).toHaveBeenCalledTimes(1);
      expect(negociate).toHaveBeenCalledWith({
        method: "createReadStream",
        args: ["test path"],
      });

      expect(WebSocket).toHaveBeenCalledTimes(1);
      expect(WebSocket).toHaveBeenCalledWith("ws://domainhost:123/test url");
    });
  });

  describe("createWriteStream", () => {
    it("Should call storage service createWriteStream", async () => {
      let websocket = { send: jest.fn(), close: jest.fn() };
      (WebSocket as any as jest.SpyInstance).mockReturnValue(websocket);

      const negociate = jest.fn().mockResolvedValue("/test url");
      const client = { get: () => ({ negociate }) };
      const storage = new StorageClient(
        client as any,
        HTTPProtocols.HTTP,
        "domainhost",
        123
      );

      const promise = storage.createWriteStream("test path");

      await new Promise(process.nextTick);

      (websocket as any).onopen();

      expect(negociate).toHaveBeenCalledTimes(1);
      expect(negociate).toHaveBeenCalledWith({
        method: "createWriteStream",
        args: ["test path", undefined],
      });

      expect(WebSocket).toHaveBeenCalledTimes(1);
      expect(WebSocket).toHaveBeenCalledWith("ws://domainhost:123/test url");

      await expect(promise).resolves.toBeInstanceOf(PullWritableSocketStream);
    });

    it("Should reject when socket errors", async () => {
      let websocket = { send: jest.fn(), close: jest.fn() };
      (WebSocket as any as jest.SpyInstance).mockReturnValue(websocket);

      const negociate = jest.fn().mockResolvedValue("/test url");
      const client = { get: () => ({ negociate }) };
      const storage = new StorageClient(
        client as any,
        HTTPProtocols.HTTP,
        "domainhost",
        123
      );

      const promise = storage.createWriteStream("test path");

      await new Promise(process.nextTick);

      (websocket as any).onerror("test error");

      let error;

      try {
        await promise;
      } catch (e) {
        error = e;
      }

      expect(error).toBeDefined();
      expect(error.toObject()).toStrictEqual({
        name: "unexpected",
        details: {},
        message: "test error",
        name: "unexpected",
      });

      expect(negociate).toHaveBeenCalledTimes(1);
      expect(negociate).toHaveBeenCalledWith({
        method: "createWriteStream",
        args: ["test path", undefined],
      });

      expect(WebSocket).toHaveBeenCalledTimes(1);
      expect(WebSocket).toHaveBeenCalledWith("ws://domainhost:123/test url");
    });
  });

  describe("createReadStream", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    it("Should call storage service createReadStream", async () => {
      let websocket = { send: jest.fn(), close: jest.fn() } as any;
      (WebSocket as any as jest.SpyInstance).mockReturnValue(websocket);

      const negociate = jest.fn().mockResolvedValue("/test url");
      const client = { get: () => ({ negociate }) };
      const storage = new StorageClient(
        client as any,
        HTTPProtocols.HTTP,
        "domainhost",
        123
      );

      const resultPromise = storage.createReadStream("test path");

      expect(negociate).toHaveBeenCalledTimes(1);
      expect(negociate).toHaveBeenCalledWith({
        method: "createReadStream",
        args: ["test path", undefined],
      });

      await jest.advanceTimersToNextTimer();
      websocket.onopen();

      const result = await resultPromise;

      expect(WebSocket).toHaveBeenCalledTimes(1);
      expect(WebSocket).toHaveBeenCalledWith("ws://domainhost:123/test url");

      expect(result).toBeInstanceOf(PullReadableSocketStream);
    });
  });

  describe("list", () => {
    it("Should call service list", async () => {
      const list = jest.fn().mockResolvedValue("test list");
      const client = { get: () => ({ list }) };
      const storage = new StorageClient(
        client as any,
        HTTPProtocols.HTTP,
        "domainhost",
        123
      );

      const result = await storage.list("test path");

      expect(list).toHaveBeenCalledTimes(1);
      expect(list).toHaveBeenCalledWith("test path");

      expect(result).toBe("test list");
    });
  });

  describe("delete", () => {
    it("Should call service delete", async () => {
      const deleteSpy = jest.fn().mockResolvedValue("test list");
      const client = { get: () => ({ delete: deleteSpy }) };
      const storage = new StorageClient(
        client as any,
        HTTPProtocols.HTTP,
        "domainhost",
        123
      );

      const result = await storage.delete("test path");

      expect(deleteSpy).toHaveBeenCalledTimes(1);
      expect(deleteSpy).toHaveBeenCalledWith("test path");

      expect(result).toBe("test list");
    });
  });
});
