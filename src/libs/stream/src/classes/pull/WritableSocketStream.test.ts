/**
 * @group unit
 */
import { ReadableStream, WritableStream } from "@skhail/stream-isomorphic";
import { WritableSocketStream } from "./WritableSocketStream";

describe("WritableSocketStream", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  it("Should instantiate stream", () => {
    const socket = {};
    const stream = new WritableSocketStream(socket as any);

    expect(stream).toBeInstanceOf(WritableSocketStream);
    expect(stream["writable"]).toBeInstanceOf(WritableStream<ArrayBuffer>);
  });

  it("Should pull data after write has been called", async () => {
    const socket: any = { send: jest.fn(), readyState: 1, close: jest.fn() };
    const stream = new WritableSocketStream(socket as any);
    const writer = stream.writable.getWriter();

    const writePromise = writer.write(Buffer.from("content"));

    await jest.advanceTimersToNextTimer();

    expect(socket.onmessage).toBeDefined();
    expect(socket.onmessage).not.toBeNull();

    socket.onmessage({ message: { data: Buffer.from("") } });

    await writePromise;

    expect(socket.send).toHaveBeenCalledTimes(1);
    expect(socket.send).toHaveBeenCalledWith(Buffer.from("content"));

    await writer.close();

    expect(socket.close).toHaveBeenCalledTimes(1);
    expect(socket.close).toHaveBeenCalledWith(1000);
    expect(stream.bytesSent).toBe(7);
  });

  it("Should pull data before write has been called", async () => {
    const socket: any = { send: jest.fn(), readyState: 1, close: jest.fn() };
    const stream = new WritableSocketStream(socket as any);
    const writer = stream.writable.getWriter();

    await jest.advanceTimersToNextTimer();

    expect(socket.onmessage).toBeDefined();

    socket.onmessage({ message: { data: Buffer.from("") } });

    await writer.write(Buffer.from("content"));

    expect(socket.send).toHaveBeenCalledTimes(1);
    expect(socket.send).toHaveBeenCalledWith(Buffer.from("content"));

    await writer.close();

    expect(socket.close).toHaveBeenCalledTimes(1);
    expect(socket.close).toHaveBeenCalledWith(1000);
    expect(stream.bytesSent).toBe(7);
  });

  it("Should ignore close information from socket if socket closed gracefully", async () => {
    const socket: any = { send: jest.fn(), readyState: 1, close: jest.fn() };
    const stream = new WritableSocketStream(socket as any);
    const writer = stream.writable.getWriter();

    await jest.advanceTimersToNextTimer();

    const writePromise = writer.write(Buffer.from("content"));

    expect(socket.onmessage).toBeDefined();
    expect(socket.onclose).toBeDefined();

    socket.onclose({ name: 1000 });
    socket.onmessage();

    await writePromise;

    expect(socket.send).toHaveBeenCalledTimes(1);
    expect(socket.send).toHaveBeenCalledWith(Buffer.from("content"));

    await writer.close();

    expect(socket.close).toHaveBeenCalledTimes(1);
    expect(socket.close).toHaveBeenCalledWith(1000);
    expect(stream.bytesSent).toBe(7);
  });

  it("Should receive message multiple message", async () => {
    const socket: any = { send: jest.fn(), readyState: 1, close: jest.fn() };
    const stream = new WritableSocketStream(socket as any);
    const writer = stream.writable.getWriter();

    await jest.advanceTimersToNextTimer();

    const contents = ["content", "other content"];
    for (let content of contents) {
      const writePromise = writer.write(Buffer.from(content));

      expect(socket.onmessage).toBeDefined();
      expect(socket.onclose).toBeDefined();

      socket.onmessage();

      await writePromise;
    }

    expect(socket.send).toHaveBeenCalledTimes(contents.length);
    for (let contentIndex in contents) {
      expect(socket.send).toHaveBeenNthCalledWith(
        parseInt(contentIndex, 10) + 1,
        Buffer.from(contents[contentIndex])
      );
    }

    await writer.close();

    expect(socket.close).toHaveBeenCalledTimes(1);
    expect(socket.close).toHaveBeenCalledWith(1000);
    expect(stream.bytesSent).toBe(20);
  });

  it("Should wait for socket open", async () => {
    const socket: any = { send: jest.fn(), readyState: 0, close: jest.fn() };
    const stream = new WritableSocketStream(socket as any);

    await jest.advanceTimersToNextTimer();

    const writer = stream.writable.getWriter();
    const writePromise = writer.write(Buffer.from("content"));

    expect(socket.send).toHaveBeenCalledTimes(0);

    socket.onopen();

    socket["readyState"] = 1;

    await jest.advanceTimersToNextTimer();

    socket.onmessage();

    await writePromise;

    expect(socket.send).toHaveBeenCalledTimes(1);
    expect(socket.send).toHaveBeenCalledWith(Buffer.from("content"));

    await writer.close();

    expect(socket.close).toHaveBeenCalledTimes(1);
    expect(socket.close).toHaveBeenCalledWith(1000);
    expect(stream.bytesSent).toBe(7);
  });

  it("Should error stream when socket error", async () => {
    const socket: any = { send: jest.fn(), readyState: 1, close: jest.fn() };
    const stream = new WritableSocketStream(socket as any);
    const readStream = new ReadableStream<ArrayBuffer>({});

    const promise = readStream.pipeTo(stream.writable);

    await jest.advanceTimersToNextTimer();

    expect(socket.onerror).toBeDefined();

    socket.onerror("test error");

    try {
      await promise;
      expect(false).toBeTruthy();
    } catch (err) {
      expect(err).toBe("test error");
    }

    expect(stream.bytesSent).toBe(0);
  });

  it("Should error stream when socket closes in error", async () => {
    const socket: any = { send: jest.fn(), readyState: 1, close: jest.fn() };
    const stream = new WritableSocketStream(socket as any);
    const readStream = new ReadableStream<ArrayBuffer>({});

    const promise = readStream.pipeTo(stream.writable);

    await jest.advanceTimersToNextTimer();

    expect(socket.onclose).toBeDefined();

    socket.onclose({ code: 3000, reason: "test error" });

    try {
      await promise;
      expect(false).toBeTruthy();
    } catch (err) {
      expect(err).toBe("test error");
    }

    expect(stream.bytesSent).toBe(0);
  });

  it("Should throw error when writing to closed stream", async () => {
    const socket: any = { send: jest.fn(), readyState: 1, close: jest.fn() };
    const stream = new WritableSocketStream(socket as any);
    const writer = stream.writable.getWriter();

    await jest.advanceTimersToNextTimer();

    socket["readyState"] = 0;

    const writePromise = writer.write(Buffer.from("content"));

    await jest.advanceTimersToNextTimer();

    socket.onmessage();
    await expect(writePromise).rejects.toThrow("Socket is not in open state");
  });
});
