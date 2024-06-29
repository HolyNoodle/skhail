/**
 * @group unit
 */
import { AMQPQueue } from "./Queue";
import * as uuid from "uuid";

jest.mock("uuid");

describe("Queue", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("Should instantiate Connection", () => {
    const connection = {};
    const queue = new AMQPQueue(connection as any);

    expect(queue).toBeInstanceOf(AMQPQueue);
  });

  describe("cleanup", () => {
    it("Should reset listeners", async () => {
      const connection = {};
      const queue = new AMQPQueue(connection as any);

      queue.listeners = [] as any;
      await queue.cleanup();

      expect(queue.listeners).toBeInstanceOf(Map);
    });
  });

  describe("prepare", () => {
    it("Should initiate listeners", async () => {
      const connection = { on: jest.fn() };
      const queue = new AMQPQueue(connection as any);

      await queue.prepare();

      expect(queue.listeners).toBeInstanceOf(Map);
    });

    it("Should reconnect handlers when connection reconnect", async () => {
      const channel = {
        assertQueue: jest.fn(),
        consume: jest.fn().mockResolvedValue({ consumerTag: "consumerTag" }),
        ack: jest.fn(),
        sendToQueue: jest.fn(),
        cancel: jest.fn(),
      };
      const connection = {
        on: jest.fn(),
        getChannel: jest.fn().mockResolvedValue(channel),
        createChannel: jest.fn().mockResolvedValue(channel),
      };
      const queue = new AMQPQueue(connection as any);

      queue.setLogger({ debug: jest.fn() } as any);
      await queue.prepare();

      const expectedResult = "result";
      const handler1 = jest.fn().mockResolvedValue(expectedResult);
      const handler2 = jest.fn().mockResolvedValue(undefined);
      const handler3 = jest.fn();
      queue.listeners!.set("event", [handler1]);
      queue.listeners!.set("event2", [handler2, handler3]);

      expect(connection.on).toHaveBeenCalledTimes(1);

      connection.on.mock.calls[0][1]();

      await new Promise(process.nextTick);

      expect(channel.assertQueue).toHaveBeenCalledTimes(3);
      expect(channel.assertQueue).toHaveBeenNthCalledWith(1, "event", {
        durable: true,
      });
      expect(channel.assertQueue).toHaveBeenNthCalledWith(2, "event2", {
        durable: true,
      });
      expect(channel.assertQueue).toHaveBeenNthCalledWith(3, "event2", {
        durable: true,
      });

      expect(channel.consume).toHaveBeenCalledTimes(3);
      expect(channel.consume.mock.calls[0][0]).toBe("event");
      expect(channel.consume.mock.calls[1][0]).toBe("event2");
      expect(channel.consume.mock.calls[2][0]).toBe("event2");

      const message = {
        content: '{"name": "test content"}',
        properties: {
          correlationId: "test corr",
          replyTo: "reply to queue",
        },
      };

      channel.consume.mock.calls[0][1](message);

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler1).toHaveBeenCalledWith({ name: "test content" });

      await new Promise(process.nextTick);

      expect(channel.ack).toHaveBeenCalledTimes(1);
      expect(channel.ack).toHaveBeenCalledWith(message);

      expect(channel.sendToQueue).toHaveBeenCalledTimes(1);
      expect(channel.sendToQueue).toHaveBeenCalledWith(
        "reply to queue",
        Buffer.from(JSON.stringify("result")),
        { correlationId: "test corr" }
      );
    });

    it("Should ignore message when message or content is empty", async () => {
      const channel = {
        assertQueue: jest.fn(),
        consume: jest.fn().mockResolvedValue({ consumerTag: "consumerTag" }),
        ack: jest.fn(),
        sendToQueue: jest.fn(),
        cancel: jest.fn(),
      };
      const connection = {
        on: jest.fn(),
        getChannel: jest.fn().mockResolvedValue(channel),
        createChannel: jest.fn().mockResolvedValue(channel),
      };
      const queue = new AMQPQueue(connection as any);

      queue.setLogger({ debug: jest.fn() } as any);
      await queue.prepare();

      const handler1 = jest.fn();
      queue.listeners!.set("event", [handler1]);

      expect(connection.on).toHaveBeenCalledTimes(1);

      connection.on.mock.calls[0][1]();

      await new Promise(process.nextTick);

      expect(channel.consume).toHaveBeenCalledTimes(1);
      expect(channel.consume.mock.calls[0][0]).toBe("event");

      channel.consume.mock.calls[0][1]();

      expect(handler1).toHaveBeenCalledTimes(0);

      await new Promise(process.nextTick);

      expect(channel.ack).toHaveBeenCalledTimes(0);

      channel.consume.mock.calls[0][1]({ test: "message" });

      expect(handler1).toHaveBeenCalledTimes(0);

      await new Promise(process.nextTick);

      expect(channel.ack).toHaveBeenCalledTimes(1);
      expect(channel.ack).toHaveBeenCalledWith({ test: "message" });
    });

    it("Should fail when ", async () => {
      const channel = {
        assertQueue: jest.fn(),
        consume: jest.fn().mockResolvedValue({ consumerTag: "consumerTag" }),
        ack: jest.fn(),
        sendToQueue: jest.fn(),
        cancel: jest.fn(),
      };
      const connection = {
        on: jest.fn(),
        getChannel: jest.fn().mockResolvedValue(channel),
        createChannel: jest.fn().mockResolvedValue(channel),
      };
      const queue = new AMQPQueue(connection as any);

      queue.setLogger({ debug: jest.fn() } as any);
      await queue.prepare();

      const expectedResult = "result";
      const handler1 = jest.fn().mockResolvedValue(expectedResult);
      const handler2 = jest.fn().mockResolvedValue(undefined);
      const handler3 = jest.fn();
      queue.listeners!.set("event", [handler1]);
      queue.listeners!.set("event2", [handler2, handler3]);

      expect(connection.on).toHaveBeenCalledTimes(1);

      connection.on.mock.calls[0][1]();

      await new Promise(process.nextTick);

      expect(channel.assertQueue).toHaveBeenCalledTimes(3);
      expect(channel.assertQueue).toHaveBeenNthCalledWith(1, "event", {
        durable: true,
      });
      expect(channel.assertQueue).toHaveBeenNthCalledWith(2, "event2", {
        durable: true,
      });
      expect(channel.assertQueue).toHaveBeenNthCalledWith(3, "event2", {
        durable: true,
      });

      expect(channel.consume).toHaveBeenCalledTimes(3);
      expect(channel.consume.mock.calls[0][0]).toBe("event");
      expect(channel.consume.mock.calls[1][0]).toBe("event2");
      expect(channel.consume.mock.calls[2][0]).toBe("event2");

      const message = {
        content: '{"name": "test content"}',
        properties: {
          correlationId: "test corr",
          replyTo: "replay to queue",
        },
      };

      channel.consume.mock.calls[0][1](message);

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler1).toHaveBeenCalledWith({ name: "test content" });

      await new Promise(process.nextTick);

      expect(channel.ack).toHaveBeenCalledTimes(1);
      expect(channel.ack).toHaveBeenCalledWith(message);

      expect(channel.sendToQueue).toHaveBeenCalledTimes(1);
      expect(channel.sendToQueue).toHaveBeenCalledWith(
        "replay to queue",
        Buffer.from(JSON.stringify("result")),
        { correlationId: "test corr" }
      );

      channel.consume.mock.calls[1][1](message);

      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledWith({ name: "test content" });

      await new Promise(process.nextTick);

      expect(channel.sendToQueue).toHaveBeenCalledTimes(2);
      expect(channel.sendToQueue).toHaveBeenNthCalledWith(
        2,
        "replay to queue",
        Buffer.from(""),
        { correlationId: "test corr" }
      );

      channel.consume.mock.calls[2][1](null);

      expect(handler3).toHaveBeenCalledTimes(0);

      await new Promise(process.nextTick);

      expect(channel.sendToQueue).toHaveBeenCalledTimes(2);
    });
  });

  describe("setHandler", () => {
    it("Should connect handler", async () => {
      const channel = {
        assertQueue: jest.fn(),
        consume: jest.fn().mockResolvedValue({ consumerTag: "consumerTag" }),
        ack: jest.fn(),
        sendToQueue: jest.fn(),
        cancel: jest.fn(),
      };
      const connection = {
        on: jest.fn(),
        getChannel: jest.fn().mockResolvedValue(channel),
        createChannel: jest.fn().mockResolvedValue(channel),
      };
      const queue = new AMQPQueue(connection as any);

      queue.setLogger({ debug: jest.fn() } as any);
      await queue.prepare();

      const expectedResult = "result";
      const handler = jest.fn().mockResolvedValue(expectedResult);

      await queue.setHandler("test service", handler);

      expect(channel.assertQueue).toHaveBeenCalledTimes(1);
      expect(channel.assertQueue).toHaveBeenCalledWith("SERVICE_test service", {
        durable: true,
      });

      expect(channel.consume).toHaveBeenCalledTimes(1);
      expect(channel.consume.mock.calls[0][0]).toBe("SERVICE_test service");

      const message = {
        content: '{"name": "test content"}',
        properties: {
          correlationId: "test corr",
          replyTo: "reply to queue",
        },
      };

      channel.consume.mock.calls[0][1](message);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ name: "test content" });

      await new Promise(process.nextTick);

      expect(channel.ack).toHaveBeenCalledTimes(1);
      expect(channel.ack).toHaveBeenCalledWith(message);

      expect(channel.sendToQueue).toHaveBeenCalledTimes(1);
      expect(channel.sendToQueue).toHaveBeenCalledWith(
        "reply to queue",
        Buffer.from(JSON.stringify("result")),
        { correlationId: "test corr" }
      );

      expect(queue.listeners!.get("SERVICE_test service")).toBeDefined();
      expect(Array.from(queue.listeners!.keys())).toHaveLength(1);
    });

    it("Should register event only once", async () => {
      const channel = {
        assertQueue: jest.fn(),
        consume: jest.fn().mockResolvedValue({ consumerTag: "consumerTag" }),
        ack: jest.fn(),
        sendToQueue: jest.fn(),
        cancel: jest.fn(),
      };
      const connection = {
        on: jest.fn(),
        getChannel: jest.fn().mockResolvedValue(channel),
        createChannel: jest.fn().mockResolvedValue(channel),
      };
      const queue = new AMQPQueue(connection as any);

      queue.setLogger({ debug: jest.fn() } as any);
      await queue.prepare();

      const expectedResult = "result";
      const handler = jest.fn().mockResolvedValue(expectedResult);

      await queue.setHandler("test service", handler);
      await queue.setHandler("test service", handler);
      await queue.setHandler("test service2", handler);

      expect(Array.from(queue.listeners!.keys())).toHaveLength(2);
    });

    it("Should send error response when handler fails", async () => {
      const channel = {
        assertQueue: jest.fn(),
        consume: jest.fn().mockResolvedValue({ consumerTag: "consumerTag" }),
        ack: jest.fn(),
        sendToQueue: jest.fn(),
        cancel: jest.fn(),
      };
      const connection = {
        on: jest.fn(),
        getChannel: jest.fn().mockResolvedValue(channel),
        createChannel: jest.fn().mockResolvedValue(channel),
      };
      const queue = new AMQPQueue(connection as any);

      queue.setLogger({ debug: jest.fn(), error: jest.fn() } as any);
      await queue.prepare();

      const handler = jest.fn().mockRejectedValue(new Error("test error"));

      await queue.setHandler("test service", handler);

      const message = {
        content: '{"name": "test content"}',
        properties: {
          correlationId: "test corr",
          replyTo: "replay to queue",
        },
      };

      channel.consume.mock.calls[0][1](message);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ name: "test content" });

      await new Promise(process.nextTick);

      expect(channel.ack).toHaveBeenCalledTimes(1);
      expect(channel.ack).toHaveBeenCalledWith(message);

      expect(channel.sendToQueue).toHaveBeenCalledTimes(1);
      expect(channel.sendToQueue).toHaveBeenCalledWith(
        "replay to queue",
        Buffer.from(
          JSON.stringify({
            success: false,
            error: {
              message: "An unexpected error occured",
              name: "unexpected",
              details: { error: { message: "test error" } },
            },
          })
        ),
        { correlationId: "test corr" }
      );
    });
  });

  describe("enqueue", () => {
    it("Should send message to queue", async () => {
      const queueChannel = { queue: "reply to queue" };
      const channel = {
        assertQueue: jest.fn().mockResolvedValue(queueChannel),
        consume: jest.fn().mockResolvedValue({ consumerTag: "consumerTag" }),
        ack: jest.fn(),
        sendToQueue: jest.fn(),
        cancel: jest.fn(),
      };
      const connection = {
        on: jest.fn(),
        getChannel: jest.fn().mockResolvedValue(channel),
        createChannel: jest.fn().mockResolvedValue(channel),
      };
      const v4 = (uuid.v4 as any as jest.SpyInstance).mockReturnValue(
        "test uuid"
      );
      const queue = new AMQPQueue(connection as any);

      queue.setLogger({ debug: jest.fn() } as any);
      const promise = queue.enqueue({
        service: "servicetest",
        method: "methodtest",
        args: ["args1", , "args2"],
        context: {
          tid: "test id",
        },
      });

      await new Promise(process.nextTick);

      channel.consume.mock.calls[0][1]({
        content: '{"test":"content"}',
        properties: { correlationId: "test uuid" },
      });

      const result = await promise;

      expect(result).toStrictEqual({ test: "content" });

      expect(v4).toHaveBeenCalledTimes(1);

      expect(channel.consume).toHaveBeenCalledTimes(1);
      expect(channel.consume.mock.calls[0][0]).toBe(queueChannel.queue);
      expect(channel.consume.mock.calls[0][2]).toStrictEqual({ noAck: true });

      expect(channel.sendToQueue).toHaveBeenCalledTimes(1);
      expect(channel.sendToQueue).toHaveBeenCalledWith(
        "SERVICE_servicetest",
        Buffer.from(
          JSON.stringify({
            service: "servicetest",
            method: "methodtest",
            args: ["args1", , "args2"],
            context: {
              tid: "test id",
            },
          })
        ),
        { correlationId: "test uuid", replyTo: "reply to queue" }
      );
    });

    it("Should ignore message when correlation id is not the same", async () => {
      const queueChannel = { queue: "reply to queue" };
      const channel = {
        assertQueue: jest.fn().mockResolvedValue(queueChannel),
        consume: jest.fn().mockResolvedValue({ consumerTag: "consumerTag" }),
        ack: jest.fn(),
        sendToQueue: jest.fn(),
        cancel: jest.fn(),
      };
      const connection = {
        on: jest.fn(),
        getChannel: jest.fn().mockResolvedValue(channel),
        createChannel: jest.fn().mockResolvedValue(channel),
      };
      (uuid.v4 as any as jest.SpyInstance).mockReturnValue("test uuid");
      const queue = new AMQPQueue(connection as any);

      queue.setLogger({ debug: jest.fn() } as any);
      const promise = queue.enqueue({
        service: "servicetest",
        method: "methodtest",
        args: ["args1", , "args2"],
        context: {
          tid: "test id",
        },
      });

      await new Promise(process.nextTick);

      channel.consume.mock.calls[0][1]({
        content: '{"test":"content2"}',
        properties: { correlationId: "test other uuid" },
      });

      channel.consume.mock.calls[0][1]({
        content: '{"test":"content3"}',
        properties: { correlationId: "test uuid" },
      });

      const result = await promise;

      expect(result).toStrictEqual({ test: "content3" });
    });

    it("Should ignore message when it is null", async () => {
      const queueChannel = { queue: "reply to queue" };
      const channel = {
        assertQueue: jest.fn().mockResolvedValue(queueChannel),
        consume: jest.fn().mockResolvedValue({ consumerTag: "consumerTag" }),
        ack: jest.fn(),
        sendToQueue: jest.fn(),
        cancel: jest.fn(),
      };
      const connection = {
        on: jest.fn(),
        getChannel: jest.fn().mockResolvedValue(channel),
        createChannel: jest.fn().mockResolvedValue(channel),
      };
      (uuid.v4 as any as jest.SpyInstance).mockReturnValue("test uuid");
      const queue = new AMQPQueue(connection as any);

      queue.setLogger({ debug: jest.fn() } as any);
      const promise = queue.enqueue({
        service: "servicetest",
        method: "methodtest",
        args: ["args1", , "args2"],
        context: {
          tid: "test id",
        },
      });

      await new Promise(process.nextTick);

      channel.consume.mock.calls[0][1]();

      channel.consume.mock.calls[0][1]({
        content: '{"test":"content"}',
        properties: { correlationId: "test uuid" },
      });

      const result = await promise;

      expect(result).toStrictEqual({ test: "content" });
    });

    it("Should resolve when error is thrown", async () => {
      const queueChannel = { queue: "reply to queue" };
      const channel = {
        assertQueue: jest.fn().mockResolvedValue(queueChannel),
        consume: jest.fn().mockResolvedValue({ consumerTag: "consumerTag" }),
        ack: jest.fn(),
        sendToQueue: jest.fn().mockRejectedValue(new Error("test error")),
      };
      const connection = {
        on: jest.fn(),
        getChannel: jest.fn().mockResolvedValue(channel),
        createChannel: jest.fn().mockResolvedValue(channel),
      };
      (uuid.v4 as any as jest.SpyInstance).mockReturnValue("test uuid");
      const queue = new AMQPQueue(connection as any);

      queue.setLogger({ debug: jest.fn(), error: jest.fn() } as any);
      const promise = queue.enqueue({
        service: "servicetest",
        method: "methodtest",
        args: ["args1", , "args2"],
        context: {
          tid: "test id",
        },
      });

      await new Promise(process.nextTick);

      const result = await promise;

      expect(result).toStrictEqual({
        error: {
          name: "unexpected",
          details: {
            error: {
              message: "test error",
            },
          },
          message: "An unexpected error occured",
        },
        success: false,
        tid: "test id",
      });
    });
  });
});
