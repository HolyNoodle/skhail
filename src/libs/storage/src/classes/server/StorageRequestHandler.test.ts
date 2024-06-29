/**
 * @group unit
 */
import { StorageRequestHandler } from "./StorageRequestHandler";

import "urlpattern-polyfill";
import { ReadableStream } from "@skhail/stream-isomorphic";

describe("StorageRequestHandler", () => {
  it("Should instantiate handler", () => {
    const handler = new StorageRequestHandler({
      route: "/store",
      storage: {} as any,
    });

    expect(handler).toBeInstanceOf(StorageRequestHandler);
  });

  describe("handle", () => {
    it("Should handle message", async () => {
      const logger = { info: jest.fn(), debug: jest.fn() } as any;
      const fileStream = new ReadableStream<ArrayBuffer>({
        start: (controller) => {
          controller.enqueue(Buffer.from("content"));
          controller.close();
        },
      });
      const fileSystem = {
        createReadStream: jest.fn().mockResolvedValue(fileStream),
      };
      const handler = new StorageRequestHandler({
        route: "/store",
        storage: fileSystem as any,
      });

      handler.setLogger(logger);

      const server = {} as any;
      const request = {
        on: jest.fn(),
        url: "/store/path/to/file",
      } as any;
      const response = {
        writeHead: jest.fn().mockReturnThis(),
        write: jest.fn().mockReturnThis(),
        end: jest.fn().mockReturnThis(),
      } as any;

      const promise = handler.handle(server, request, response);

      await promise;

      expect(fileSystem.createReadStream).toHaveBeenCalledTimes(1);
      expect(fileSystem.createReadStream).toHaveBeenCalledWith(
        "path/to/file",
        0
      );

      expect(response.writeHead).toHaveBeenCalledTimes(1);
      expect(response.writeHead).toHaveBeenCalledWith(200);

      expect(response.end).toHaveBeenCalledTimes(1);
      expect(response.end).toHaveBeenCalledWith();
    });

    it("Should send 403 when path does not exists", async () => {
      const logger = { info: jest.fn(), debug: jest.fn() } as any;
      const fileStream = new ReadableStream<ArrayBuffer>({
        start: (controller) => {
          controller.enqueue(Buffer.from("content"));
          controller.close();
        },
      });
      const fileSystem = {
        createReadStream: jest.fn().mockResolvedValue(fileStream),
      };
      const handler = new StorageRequestHandler({
        route: "/store",
        storage: fileSystem as any,
      });

      handler.setLogger(logger);

      const server = {} as any;
      const request = {
        on: jest.fn(),
        url: "/ste/path/to/file",
      } as any;
      const response = {
        writeHead: jest.fn().mockReturnThis(),
        write: jest.fn().mockReturnThis(),
        end: jest.fn().mockReturnThis(),
      } as any;

      const promise = handler.handle(server, request, response);

      await promise;

      expect(fileSystem.createReadStream).toHaveBeenCalledTimes(0);

      expect(response.writeHead).toHaveBeenCalledTimes(1);
      expect(response.writeHead).toHaveBeenCalledWith(403, "Undefined path");

      expect(response.end).toHaveBeenCalledTimes(1);
      expect(response.end).toHaveBeenCalledWith();
    });

    it("Should handle message with drain when multiple chunk", async () => {
      const logger = { info: jest.fn(), debug: jest.fn() } as any;
      const fileStream = new ReadableStream<ArrayBuffer>({
        start: (controller) => {
          controller.enqueue(Buffer.from("content"));
          controller.close();
        },
      });
      const fileSystem = {
        createReadStream: jest.fn().mockResolvedValue(fileStream),
      };
      const handler = new StorageRequestHandler({
        route: "/store",
        storage: fileSystem as any,
      });

      handler.setLogger(logger);

      const server = {} as any;
      const request = {
        on: jest.fn(),
        url: "/store/path/to/file",
      } as any;
      const response = {
        writeHead: jest.fn().mockReturnThis(),
        write: jest.fn().mockReturnValue(false),
        end: jest.fn().mockReturnThis(),
        once: jest.fn().mockImplementation((_, cb) => cb()),
      } as any;

      const promise = handler.handle(server, request, response);

      await promise;

      expect(fileSystem.createReadStream).toHaveBeenCalledTimes(1);
      expect(fileSystem.createReadStream).toHaveBeenCalledWith(
        "path/to/file",
        0
      );

      expect(response.writeHead).toHaveBeenCalledTimes(1);
      expect(response.writeHead).toHaveBeenCalledWith(200);
    });
  });

  describe("match", () => {
    it("Should return false when url does not start with base url", () => {
      const handler = new StorageRequestHandler({
        route: "/store",
        storage: {} as any,
      });

      expect(handler.match("url test")).toBeFalsy();
    });

    it("Should return true when url starts with base url", () => {
      const handler = new StorageRequestHandler({
        route: "/store",
        storage: {} as any,
      });

      expect(handler.match("/store")).toBeFalsy();
    });

    it("Should return true when url have simple path", () => {
      const handler = new StorageRequestHandler({
        route: "/store",
        storage: {} as any,
      });

      expect(handler.match("/store/file.mp4")).toBeTruthy();
    });

    it("Should return true when url have complex path", () => {
      const handler = new StorageRequestHandler({
        route: "/store",
        storage: {} as any,
      });

      expect(handler.match("/store/path/to/file.mp4")).toBeTruthy();
    });
  });
});
