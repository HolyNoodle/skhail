import * as amqplib from "amqplib";
import {
  EmitterListener,
  IEmitter,
  ILogger,
  SkhailError,
  getError,
} from "@skhail/core";
import { AMQPConnection } from "./Connection";

export class AMQPEventEmitter implements IEmitter {
  logger!: ILogger;
  listeners: Map<string, Map<string, EmitterListener[]>>;
  consumers: Map<string, Map<string, amqplib.Replies.Consume>>;

  setLogger(logger: ILogger): void {
    this.logger = logger;
  }

  constructor(private connection: AMQPConnection) {
    this.consumers = new Map();
    this.listeners = new Map();
  }

  async prepare(): Promise<void> {
    this.consumers = new Map();
    this.connection.on("connect", async () => {
      Array.from(this.listeners!.keys()).forEach((group) => {
        const groupHandlers = this.listeners?.get(group)!;

        Array.from(groupHandlers.keys()).forEach((event) => {
          groupHandlers
            .get(event)!
            .map((handler) => this.connectHandler(group, event, handler));
        });
      });
    });
  }

  async cleanup(): Promise<void> {
    try {
      const channel = await this.connection.getChannel();

      await Promise.allSettled(
        Array.from(this.consumers!.keys())
          .map((group) => {
            const groupConsumers = this.consumers?.get(group)!;

            Array.from(groupConsumers.keys()).map((event) => {
              return channel.cancel(groupConsumers.get(event)!.consumerTag);
            });
          })
          .flat()
      );
    } catch (e) {
      this.logger?.error(
        "AMQP Event Emitter - Error while cleaning up consumers",
        getError(e).toObject()
      );
    }

    this.listeners = new Map();
    this.consumers = new Map();
  }

  async on(group: string, event: string, listener: EmitterListener) {
    let groupListeners = this.listeners.get(group);
    if (!groupListeners) {
      groupListeners = new Map();

      this.listeners.set(group, groupListeners);
    }

    let eventListeners = groupListeners.get(event);
    if (!eventListeners) {
      eventListeners = [];
      groupListeners.set(event, eventListeners);
    }

    eventListeners.push(listener);

    await this.connectHandler(group, event, listener);
  }

  private async connectHandler(
    group: string,
    event: string,
    listener: EmitterListener
  ) {
    const channel = await this.connection.getChannel();

    const exchange = await channel.assertExchange(`EVENT-${event}`, "topic", {
      durable: true,
    });
    const queue = await channel.assertQueue(`GROUP-${group}`, {
      durable: true,
    });

    await channel.bindQueue(queue.queue, exchange.exchange, "");

    const consumer = await channel.consume(
      queue.queue,
      async (msg: amqplib.ConsumeMessage | null) => {
        if (msg !== null) {
          try {
            await listener(...JSON.parse(msg.content.toString()));

            channel.ack(msg);
          } catch (e: any) {
            const error = getError(e);

            this.logger!.error("Error while executing event listener", error);
          }
        }
      }
    );

    let groupMap = this.consumers.get(group);
    if (!groupMap) {
      groupMap = new Map();

      this.consumers.set(group, groupMap);
    }

    groupMap.set(event, consumer);
  }

  async off(group: string, event: string, _: EmitterListener) {
    const channel = await this.connection.getChannel();

    const consumer = this.consumers.get(group)?.get(event);

    if (consumer) {
      await channel.cancel(consumer.consumerTag);
    }

    this.consumers.get(group)?.delete(event);
  }

  async emit(event: string, args: any[]) {
    const channel = await this.connection.getChannel();

    await channel.assertExchange(`EVENT-${event}`, "topic", {
      durable: true,
    });

    await channel.publish(
      `EVENT-${event}`,
      "",
      Buffer.from(JSON.stringify(args))
    );
  }
}
