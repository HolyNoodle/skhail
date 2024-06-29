import * as amqplib from "amqplib";
import { v4 as uuidv4 } from "uuid";
import {
  ContextOptions,
  EnveloppeHandler,
  IEnveloppe,
  IEnveloppeResponse,
  ILogger,
  IQueue,
  getError,
} from "@skhail/core";
import { AMQPConnection } from "./Connection";

export class AMQPQueue<Context extends ContextOptions>
  implements IQueue<Context>
{
  logger?: ILogger;
  listeners: Map<string, EnveloppeHandler<Context>[]>;
  consumers: Map<string, amqplib.Replies.Consume>;

  constructor(private connection: AMQPConnection) {
    this.consumers = new Map();
    this.listeners = new Map();
  }

  setLogger(logger: ILogger): void {
    this.logger = logger;
  }

  async prepare(): Promise<void> {
    this.consumers = new Map();
    this.listeners = new Map();
    this.connection.on("connect", async () => {
      Array.from(this.listeners!.keys()).forEach((queue) => {
        const handlers = this.listeners?.get(queue)!;

        handlers.forEach((handler) => {
          this.connectHandler(queue, handler);
        });
      });
    });
  }

  async cleanup(): Promise<void> {
    try {
      const channel = await this.connection.getChannel();

      await Promise.allSettled(
        Array.from(this.consumers.values()).map((consumer) =>
          channel.cancel(consumer.consumerTag)
        )
      );
    } catch (e) {
      this.logger?.error(
        "AMQP Queue - Error while cleaning up consumers",
        getError(e).toObject()
      );
    }

    this.listeners = new Map();
    this.consumers = new Map();
  }

  private async connectHandler(
    queue: string,
    handler: EnveloppeHandler<Context>
  ) {
    const channel = await this.connection.getChannel();
    await channel!.assertQueue(queue, { durable: true });

    const consumer = await channel!.consume(
      queue,
      async (message: any | null) => {
        if (message && message.content) {
          const enveloppe = JSON.parse(
            message.content.toString()
          ) as IEnveloppe<Context>;

          this.logger!.debug("channel - received message", {
            service: queue,
            messageId: message.properties.correlationId,
          });

          try {
            const result = await handler(enveloppe);

            this.logger!.debug("channel - answering message", {
              messageId: message.properties.correlationId,
            });

            channel.sendToQueue(
              message.properties.replyTo,
              Buffer.from(result ? JSON.stringify(result) : ""),
              {
                correlationId: message.properties.correlationId,
              }
            );
          } catch (err) {
            const error = getError(err).toObject();
            this.logger!.error("channel - error while handling message", {
              messageId: message.properties.correlationId,
              service: queue,
              error,
            });

            channel.sendToQueue(
              message.properties.replyTo,
              Buffer.from(JSON.stringify({ success: false, error: error })),
              {
                correlationId: message.properties.correlationId,
              }
            );
          }
        }

        message && channel.ack(message);
      }
    );

    this.consumers.set(queue, consumer);
  }

  async setHandler(
    service: string,
    handler: EnveloppeHandler<Context>
  ): Promise<void> {
    const queue = `SERVICE_${service}`;
    await this.connectHandler(queue, handler);

    if (!this.listeners?.has(queue)) {
      this.listeners?.set(queue, []);
    }

    this.listeners?.get(queue)?.push(handler);
  }

  enqueue(enveloppe: IEnveloppe<Context>): Promise<IEnveloppeResponse> {
    this.logger!.debug("channel - enqueing message", {
      service: enveloppe.service,
      method: enveloppe.method,
    });

    return new Promise<IEnveloppeResponse>(async (resolve) => {
      try {
        const channel = await this.connection.getChannel();

        const messageId = uuidv4();

        const queue = `SERVICE_${enveloppe.service}`;
        this.logger!.debug("channel - posting message", {
          messageId,
          queue,
          service: enveloppe.service,
          method: enveloppe.method,
        });

        try {
          const replyToQueue = await channel!.assertQueue("", {
            exclusive: true,
          });

          await channel!.assertQueue(queue, { durable: true });
          const replyConsumer = await channel!.consume(
            replyToQueue.queue,
            async (message: amqplib.ConsumeMessage | null) => {
              if (message && message.properties.correlationId === messageId) {
                this.logger!.debug("channel - receive answer", {
                  messageId,
                  service: enveloppe.service,
                  method: enveloppe.method,
                });
                const result = JSON.parse(
                  message.content.toString()
                ) as IEnveloppeResponse;

                await channel.cancel(replyConsumer.consumerTag);

                resolve(result);
              }
            },
            {
              noAck: true,
            }
          );

          await channel!.sendToQueue(
            queue,
            Buffer.from(JSON.stringify(enveloppe)),
            {
              replyTo: replyToQueue.queue,
              correlationId: messageId,
            }
          );
        } catch (e) {
          throw e;
        }
      } catch (err) {
        const error = getError(err);
        this.logger!.error("channel - error while posting message", {
          error: error.toObject(),
        });

        resolve({
          tid: enveloppe.context.tid,
          success: false,
          error: error.toObject(),
        });
      }
    });
  }
}
