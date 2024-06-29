/**
 * @group unit
 */
import { ReadableStream, WritableStream } from "@skhail/stream-isomorphic";
import { ReadableSocketStream } from "./ReadableSocketStream";

describe("PullReadableSocketStream", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  it("Should instantiate stream", () => {
    const socket = {};
    const stream = new ReadableSocketStream(socket as any);

    expect(stream).toBeInstanceOf(ReadableSocketStream);
    expect(stream["readable"]).toBeInstanceOf(ReadableStream<ArrayBuffer>);
  });

  it("Should pull data", async () => {
    const socket: any = { send: jest.fn(), readyState: 1 };
    const stream = new ReadableSocketStream(socket as any);
    const reader = stream.readable.getReader();

    const readPromise = reader.read();

    await jest.advanceTimersToNextTimer();
    await jest.advanceTimersToNextTimer();
    await jest.advanceTimersToNextTimer();

    await jest.advanceTimersToNextTimer();
    await jest.advanceTimersToNextTimer();
    await jest.advanceTimersToNextTimer();
    await jest.advanceTimersToNextTimer();

    expect(socket.onmessage).toBeDefined();
    expect(socket.onclose).toBeDefined();

    socket.onmessage({ data: Buffer.from("content") });
    socket.onclose({ name: 1000 });

    const data = await readPromise;

    expect(data.value!.toString()).toBe("content");
    expect(data.done).toBeFalsy();

    const data2 = await reader.read();

    expect(data2.value).toBeFalsy();
    expect(data2.done).toBeTruthy();

    reader.releaseLock();

    expect(stream.bytesReceived).toBe(7);

    expect(socket.send).toHaveBeenCalledTimes(1);
    expect(socket.send).toHaveBeenCalledWith("", expect.any(Function));
  });

  it("Should wait for socket open", async () => {
    const socket: any = { send: jest.fn(), close: jest.fn() };
    const stream = new ReadableSocketStream(socket as any);

    const reader = stream.readable.getReader();

    const readPromise = reader.read();

    await jest.advanceTimersToNextTimer();

    expect(socket.onopen).toBeDefined();

    socket.onopen();
    socket.readyState = 1;

    await jest.advanceTimersToNextTimer();
    await jest.advanceTimersToNextTimer();

    expect(socket.send).toHaveBeenCalledTimes(0);

    await jest.advanceTimersToNextTimer();
    await jest.advanceTimersToNextTimer();
    await jest.advanceTimersToNextTimer();

    expect(socket.send).toHaveBeenCalledTimes(1);
  });

  it("Should fail when socket errors", async () => {
    const socket: any = { send: jest.fn() };
    const stream = new ReadableSocketStream(socket as any);

    const promise = stream.readable.pipeTo(new WritableStream({}));

    socket.onopen();

    await jest.advanceTimersToNextTimer();
    await jest.advanceTimersToNextTimer();
    await jest.advanceTimersToNextTimer();

    expect(socket.onerror).toBeDefined();

    socket.onerror("error test");

    await jest.advanceTimersToNextTimer();
    await jest.advanceTimersToNextTimer();
    await jest.advanceTimersToNextTimer();

    await expect(promise).rejects.toBe("error test");
  });

  it("Should fail when socket close for error", async () => {
    const socket: any = { send: jest.fn() };
    const stream = new ReadableSocketStream(socket as any);

    const promise = stream.readable.pipeTo(new WritableStream({}));

    socket.onopen();

    await jest.advanceTimersToNextTimer();
    await jest.advanceTimersToNextTimer();
    await jest.advanceTimersToNextTimer();

    expect(socket.onerror).toBeDefined();

    socket.onclose({ code: 3000, reason: "test error" });

    await jest.advanceTimersToNextTimer();
    await jest.advanceTimersToNextTimer();
    await jest.advanceTimersToNextTimer();

    await expect(promise).rejects.toBe("test error");
  });

  it("Should not fail when sending undefined", async () => {
    const socket: any = { send: jest.fn(), readyState: 1 };
    const stream = new ReadableSocketStream(socket as any);
    const reader = stream.readable.getReader();

    await jest.advanceTimersToNextTimer();
    await jest.advanceTimersToNextTimer();
    await jest.advanceTimersToNextTimer();

    const readPromise = reader.read();

    expect(socket.onmessage).toBeDefined();
    expect(socket.onclose).toBeDefined();

    socket.onmessage(undefined);
    socket.onclose({ name: 1000 });

    const data = await readPromise;

    expect(data.value).toBeUndefined();
    expect(data.done).toBeTruthy();

    reader.releaseLock();

    expect(stream.bytesReceived).toBe(0);
  });

  it("Should not fail when message had no data", async () => {
    const socket: any = { send: jest.fn(), readyState: 1 };
    const stream = new ReadableSocketStream(socket as any);
    const reader = stream.readable.getReader();

    await jest.advanceTimersToNextTimer();
    await jest.advanceTimersToNextTimer();
    await jest.advanceTimersToNextTimer();

    const readPromise = reader.read();

    expect(socket.onmessage).toBeDefined();
    expect(socket.onclose).toBeDefined();

    socket.onmessage({});
    socket.onclose({ name: 1000 });

    const data = await readPromise;

    expect(data.value).toBeUndefined();
    expect(data.done).toBeTruthy();

    reader.releaseLock();

    expect(stream.bytesReceived).toBe(0);
  });

  it("Should transmit message with multiple chunks", async () => {
    const socket: any = { send: jest.fn(), readyState: 1 };
    const stream = new ReadableSocketStream(socket as any);
    const reader = stream.readable.getReader();

    await jest.advanceTimersToNextTimer();
    await jest.advanceTimersToNextTimer();
    await jest.advanceTimersToNextTimer();

    const readPromise = reader.read();

    expect(socket.send).toHaveBeenCalledTimes(1);
    expect(socket.send).toHaveBeenNthCalledWith(1, "", expect.any(Function));

    expect(socket.onmessage).toBeDefined();
    expect(socket.onclose).toBeDefined();

    socket.onmessage({ data: Buffer.from("content") });

    const data = await readPromise;

    expect(socket.send).toHaveBeenCalledTimes(2);
    expect(socket.send).toHaveBeenNthCalledWith(2, "", expect.any(Function));

    expect(data.value!.toString()).toBe("content");
    expect(data.done).toBeFalsy();

    socket.onmessage({ data: Buffer.from("content") });

    const data2 = await reader.read();

    expect(socket.send).toHaveBeenCalledTimes(3);
    expect(socket.send).toHaveBeenNthCalledWith(3, "", expect.any(Function));

    expect(data2.value!.toString()).toBe("content");
    expect(data2.done).toBeFalsy();

    socket.onclose({ name: 1000 });

    reader.releaseLock();

    expect(stream.bytesReceived).toBe(14);
  });

  it("Should ignore message when stream didn't pull", async () => {
    const socket: any = { send: jest.fn(), readyState: 1 };
    const stream = new ReadableSocketStream(socket as any);
    const reader = stream.readable.getReader();

    await jest.advanceTimersToNextTimer();
    await jest.advanceTimersToNextTimer();
    await jest.advanceTimersToNextTimer();

    expect(socket.onmessage).toBeDefined();
    expect(socket.onclose).toBeDefined();

    let readPromise = reader.read();

    socket.onmessage({ data: Buffer.from("content") });

    const data = await readPromise;
    expect(data.value!.toString()).toBe("content");
    expect(data.done).toBeFalsy();

    readPromise = reader.read();

    socket.onmessage({ data: Buffer.from("content") });
    socket.onclose(1000);

    const data2 = await readPromise;

    expect(data2.value!.toString()).toBe("content");
    expect(data2.done).toBeFalsy();

    const data3 = await reader.read();

    expect(data3.value).toBeUndefined();
    expect(data3.done).toBeTruthy();

    expect(stream.bytesReceived).toBe(14);
  });

  it("Should close socket on cancel", () => {
    const socket: any = { close: jest.fn(), readyState: 1 };
    const stream = new ReadableSocketStream(socket as any);

    stream.readable.cancel("this is a reason");

    expect(socket.close).toHaveBeenCalledTimes(1);
    expect(socket.close).toHaveBeenCalledWith(3000, "this is a reason");
  });

  it("Should reject pull when socket send fails", async () => {
    const socket: any = { send: jest.fn(), readyState: 1 };
    const stream = new ReadableSocketStream(socket as any);
    const reader = stream.readable.getReader();

    const promise = reader.read();

    await jest.advanceTimersToNextTimer();
    await jest.advanceTimersToNextTimer();
    await jest.advanceTimersToNextTimer();

    expect(socket.send).toHaveBeenCalledTimes(1);
    expect(socket.send).toHaveBeenCalledWith("", expect.any(Function));

    socket.send.mock.calls[0][1]("test error");

    expect(promise).rejects.toBe("test error");
  });
});
