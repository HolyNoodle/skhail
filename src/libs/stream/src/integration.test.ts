/**
 * @group integration
 */
import * as fs from "fs";
import WebSocket from "isomorphic-ws";
import { WebSocketServer } from "ws";
import { PullReadableSocketStream, PullWritableSocketStream } from ".";

describe("Streams", () => {
  let socketServer: WebSocketServer;
  let socketServer2: WebSocketServer;
  beforeEach(() => {
    jest.resetAllMocks();
    fs.rmSync("./tmp", { force: true, recursive: true });

    socketServer = new WebSocketServer({
      port: 5566,
    });
    socketServer2 = new WebSocketServer({
      port: 5567,
    });
  });
  afterEach(() => {
    socketServer.close();
    socketServer2.close();
  });
  it("Should transmit data toward server", async () => {
    const expectedContent = "test content sent";
    const expectedCount = 1;
    let count = 0;

    const promise = new Promise<void>((resolve) => {
      socketServer.on("connection", async function connection(ws) {
        const serverStream = new PullReadableSocketStream(ws);
        const reader = serverStream.readable.getReader();

        while (true) {
          const { value, done } = await reader.read();

          if (done) {
            break;
          }

          expect(Buffer.from(value).toString()).toBe(expectedContent + count);
          count++;

          expect(count).toBe(expectedCount);
        }

        resolve();
      });
    });

    const socket = new WebSocket("ws://localhost:5566");
    const clientStream = new PullWritableSocketStream(socket);

    const writer = clientStream.writable.getWriter();

    for (let i = 0; i < expectedCount; ++i) {
      await writer.write(Buffer.from(expectedContent + i));
    }

    await writer.close();

    await promise;
  });

  it("Should transmit data from server", async () => {
    const expectedContent = "test content sent";
    const expectedCount = 1;
    let count = 0;

    const promise = new Promise<void>((resolve) => {
      socketServer.on("connection", async function connection(ws) {
        const serverStream = new PullWritableSocketStream(ws);

        const writer = serverStream.writable.getWriter();

        for (let i = 0; i < expectedCount; ++i) {
          await writer.write(Buffer.from(expectedContent + i));
        }

        await writer.close();
        resolve();
      });
    });

    const socket = new WebSocket("ws://localhost:5566");
    const clientStream = new PullReadableSocketStream(socket);

    const reader = clientStream.readable.getReader();

    while (true) {
      const { value, done } = await reader.read();

      if (done) {
        break;
      }

      expect(Buffer.from(value).toString()).toBe(expectedContent + count);
      count++;
    }

    await promise;

    expect(count).toBe(expectedCount);
  });

  it("Should transmit error from server", async () => {
    socketServer.on("connection", async function connection(ws) {
      const serverStream = new PullWritableSocketStream(ws);

      await serverStream.writable.abort("boom");
    });

    const socket = new WebSocket("ws://localhost:5566");
    const clientStream = new PullReadableSocketStream(socket);

    const reader = clientStream.readable.getReader();

    let error;
    try {
      await reader.read();
    } catch (err) {
      error = err;
    }

    expect(error).toBe("boom");
  });

  it("Should transmit error from client", async () => {
    let error;
    const promise = new Promise<void>((resolve) => {
      socketServer.on("connection", async function connection(ws) {
        const serverStream = new PullReadableSocketStream(ws);
        const reader = serverStream.readable.getReader();

        try {
          await reader.read();
        } catch (err) {
          error = err;
        }

        resolve();
      });
    });

    const socket = new WebSocket("ws://localhost:5566");
    const clientStream = new PullWritableSocketStream(socket);

    await clientStream.writable.abort("boom");

    await promise;

    expect(error).toBe("boom");
  });

  it("Should transmit from server to client with relay", async () => {
    const expectedContent = "test content sent";
    const expectedCount = 1;
    let count = 0;

    socketServer.on("connection", async function connection(ws) {
      const socket = new WebSocket("ws://localhost:5567");
      const outStream = new PullWritableSocketStream(ws);
      const inStream = new PullReadableSocketStream(socket);

      await inStream.readable.pipeTo(outStream.writable);
    });
    socketServer2.on("connection", async function connection(ws) {
      const serverStream = new PullWritableSocketStream(ws);

      const writer = serverStream.writable.getWriter();

      for (let i = 0; i < expectedCount; ++i) {
        await writer.write(Buffer.from(expectedContent + i));
      }

      await writer.close();
    });

    const socket = new WebSocket("ws://localhost:5566");
    const clientStream = new PullReadableSocketStream(socket);

    const reader = clientStream.readable.getReader();

    while (true) {
      const { value, done } = await reader.read();

      if (done) {
        break;
      }

      expect(Buffer.from(value).toString()).toBe(expectedContent + count);
      count++;
    }

    expect(count).toBe(expectedCount);
  });

  it("Should transmit toward server to client with relay", async () => {
    const expectedContent = "test content sent";
    const expectedCount = 1;
    let count = 0;

    socketServer.on("connection", async function connection(ws) {
      const socket = new WebSocket("ws://localhost:5567");
      const outStream = new PullWritableSocketStream(socket);
      const inStream = new PullReadableSocketStream(ws);

      await inStream.readable.pipeTo(outStream.writable);
    });

    const promise = new Promise<void>((resolve) => {
      socketServer2.on("connection", async function connection(ws) {
        const serverStream = new PullReadableSocketStream(ws);
        const reader = serverStream.readable.getReader();

        while (true) {
          const { value, done } = await reader.read();

          if (done) {
            break;
          }

          expect(Buffer.from(value).toString()).toBe(expectedContent + count);
          count++;

          expect(count).toBe(expectedCount);
        }

        resolve();
      });
    });

    const socket = new WebSocket("ws://localhost:5566");
    const clientStream = new PullWritableSocketStream(socket);

    const writer = clientStream.writable.getWriter();

    for (let i = 0; i < expectedCount; ++i) {
      await writer.write(Buffer.from(expectedContent + i));
    }

    await writer.close();
    await promise;
  });
});
