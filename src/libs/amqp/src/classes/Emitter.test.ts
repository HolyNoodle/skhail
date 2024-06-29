/**
 * @group unit
 */
import { AMQPEventEmitter } from "./Emitter";

describe("AMQPEventEmitter", () => {
  it("Should instantiate AMQPEventEmitter", () => {
    const connection = {};
    const emitter = new AMQPEventEmitter(connection as any);

    expect(emitter).toBeInstanceOf(AMQPEventEmitter);
  });

  describe("prepare", () => {
    it("Should prepare listeners", async () => {
      const connection = { on: jest.fn() };
      const emitter = new AMQPEventEmitter(connection as any);

      await emitter.prepare();

      expect(connection.on).toHaveBeenCalledTimes(1);
      expect(connection.on).toHaveBeenCalledWith(
        "connect",
        expect.any(Function)
      );
    });

    it("Should reconnect listeners on connect", async () => {
      const channel = { consume: jest.fn() };
      const connection = {
        on: jest.fn(),
        getChannel: jest.fn().mockResolvedValue(channel),
      };
      const emitter = new AMQPEventEmitter(connection as any);
      await emitter.prepare();

      const spy = jest.fn();
      emitter["connectHandler"] = spy;

      const listener1 = jest.fn();
      const listener2 = jest.fn();
      await emitter.on("group", "test event", listener1);
      await emitter.on("group2", "test event", listener2);

      const reconnect = connection.on.mock.calls[0][1];
      spy.mockClear();
      await reconnect();

      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenNthCalledWith(1, "group", "test event", listener1);
      expect(spy).toHaveBeenNthCalledWith(2, "group2", "test event", listener2);
    });
  });

  describe("cleanup", () => {
    it("Should cleanup listeners", async () => {
      const channel = { cancel: jest.fn() };
      const connection = {
        getChannel: jest.fn().mockResolvedValue(channel),
      };
      const emitter = new AMQPEventEmitter(connection as any);
      emitter["connectHandler"] = jest.fn();
      emitter["consumers"] = new Map([
        ["group", new Map([["event", { consumerTag: "test consumer tag" }]])],
        [
          "group2",
          new Map([["event", { consumerTag: "test consumer tag 2" }]]),
        ],
      ]);

      await emitter.cleanup();

      expect(channel.cancel).toHaveBeenCalledTimes(2);
      expect(channel.cancel).toHaveBeenNthCalledWith(1, "test consumer tag");
      expect(channel.cancel).toHaveBeenNthCalledWith(2, "test consumer tag 2");
    });

    it("Should log error while cleaning up", async () => {
      const channel = {
        cancel: jest.fn(),
      };
      const connection = {
        getChannel: jest.fn().mockRejectedValue("error"),
      };
      const logger = { error: jest.fn() };
      const emitter = new AMQPEventEmitter(connection as any);
      emitter["connectHandler"] = jest.fn();
      emitter["consumers"] = new Map([
        ["group", new Map([["event", { consumerTag: "test consumer tag" }]])],
      ]);
      emitter["logger"] = logger as any;

      await emitter.cleanup();

      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        "AMQP Event Emitter - Error while cleaning up consumers",
        expect.any(Object)
      );
    });
  });

  describe("setLogger", () => {
    it("Should set logger", async () => {
      const connection = { on: jest.fn() };
      const emitter = new AMQPEventEmitter(connection as any);

      const logger = {};
      emitter.setLogger(logger as any);

      expect(emitter["logger"]).toBe(logger);
    });
  });

  describe("on", () => {
    it("Should register listener", async () => {
      const queue = { queue: "test queue" };
      const exchange = { exchange: "test exchange" };
      const channel = {
        ack: jest.fn(),
        consume: jest.fn(),
        bindQueue: jest.fn(),
        assertExchange: jest.fn().mockResolvedValue(exchange),
        assertQueue: jest.fn().mockResolvedValue(queue),
      };
      const connection = {
        on: jest.fn(),
        getChannel: jest.fn().mockResolvedValue(channel),
      };

      const listener1 = jest.fn();
      const listener2 = jest.fn();
      const emitter = new AMQPEventEmitter(connection as any);
      await emitter.on("group", "test event", listener1);
      await emitter.on("group2", "test event", listener2);

      expect(channel.assertQueue).toHaveBeenCalledTimes(2);
      expect(channel.assertQueue).toHaveBeenNthCalledWith(1, "GROUP-group", {
        durable: true,
      });
      expect(channel.assertQueue).toHaveBeenNthCalledWith(2, "GROUP-group2", {
        durable: true,
      });

      expect(channel.bindQueue).toHaveBeenCalledTimes(2);
      expect(channel.bindQueue).toHaveBeenCalledWith(
        queue.queue,
        exchange.exchange,
        ""
      );

      expect(channel.assertExchange).toHaveBeenCalledTimes(2);
      expect(channel.assertExchange).toHaveBeenCalledWith(
        "EVENT-test event",
        "topic",
        { durable: true }
      );

      const message = {
        content: JSON.stringify([{ test: "content" }]),
      };
      await channel.consume.mock.calls[0][1](message);

      channel.consume.mock.calls[1][1](null);

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(0);

      expect(listener1).toHaveBeenCalledWith({ test: "content" });

      expect(channel.ack).toHaveBeenCalledTimes(1);
      expect(channel.ack).toHaveBeenCalledWith(message);
    });

    it("Should register two listener for same group and event", async () => {
      const queue = { queue: "test queue" };
      const exchange = { exchange: "test exchange" };
      const channel = {
        ack: jest.fn(),
        consume: jest.fn(),
        bindQueue: jest.fn(),
        assertExchange: jest.fn().mockResolvedValue(exchange),
        assertQueue: jest.fn().mockResolvedValue(queue),
      };
      const connection = {
        on: jest.fn(),
        getChannel: jest.fn().mockResolvedValue(channel),
      };

      const listener1 = jest.fn();
      const listener2 = jest.fn();
      const emitter = new AMQPEventEmitter(connection as any);
      await emitter.on("group", "test event", listener1);
      await emitter.on("group", "test event", listener2);

      expect(emitter["listeners"].get("group")!.get("test event")).toEqual([
        listener1,
        listener2,
      ]);
    });
  });

  describe("off", () => {
    it("Should remove listener", async () => {
      const channel = { cancel: jest.fn() };
      const connection = {
        getChannel: jest.fn().mockResolvedValue(channel),
      };
      const emitter = new AMQPEventEmitter(connection as any);
      emitter["consumers"] = new Map([
        ["group", new Map([["event", { consumerTag: "test consumer tag" }]])],
      ]);

      await emitter.off("group", "event", jest.fn());

      expect(channel.cancel).toHaveBeenCalledTimes(1);
      expect(channel.cancel).toHaveBeenCalledWith("test consumer tag");
    });

    it("Should not cancel the consumer when not exists", async () => {
      const channel = { cancel: jest.fn() };
      const connection = {
        getChannel: jest.fn().mockResolvedValue(channel),
      };
      const emitter = new AMQPEventEmitter(connection as any);
      emitter["consumers"] = new Map();

      await emitter.off("group", "event", jest.fn());

      expect(channel.cancel).toHaveBeenCalledTimes(0);
    });
  });

  describe("emit", () => {
    it("Should send message to event queue", async () => {
      const exchange = { exchange: "test exchange" };
      const channel = {
        publish: jest.fn(),
        assertExchange: jest.fn().mockResolvedValue(exchange),
      };
      const connection = {
        getChannel: jest.fn().mockResolvedValue(channel),
      };

      const emitter = new AMQPEventEmitter(connection as any);

      const args = ["string", 123];
      await emitter.emit("event name", args);

      expect(channel.assertExchange).toHaveBeenCalledTimes(1);
      expect(channel.assertExchange).toHaveBeenCalledWith(
        "EVENT-event name",
        "topic",
        { durable: true }
      );

      expect(channel.publish).toHaveBeenCalledTimes(1);
      expect(channel.publish).toHaveBeenCalledWith(
        "EVENT-event name",
        "",
        Buffer.from(JSON.stringify(args))
      );
    });
  });
});
