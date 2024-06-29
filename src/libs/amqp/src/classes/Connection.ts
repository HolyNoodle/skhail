import * as amqplib from "amqplib";
import {
  ConsoleLogger,
  getError,
  ILifeCycle,
  ILogger,
  SkhailError,
} from "@skhail/core";
import EventEmitter from "events";
import { faultProofRetry } from "../utils/faultProofRetry";

export interface AMQPConnectionOptions {
  logger?: ILogger;
  frameMax?: number;
  heartbeat?: number;
  protocol?: string;
  hostname?: string;
  port?: number;
  vhost?: string;
  locale?: string;
  password?: string;
  username?: string;
  retryAttempts?: number;
  retryInterval?: number;
}

export class AMQPConnection extends EventEmitter implements ILifeCycle {
  private client?: amqplib.Connection;
  private channel?: amqplib.Channel;
  private logger: ILogger;
  private irrecuperableError = false;

  private connectPromise?: Promise<amqplib.Connection>;
  private channelPromise?: Promise<amqplib.Channel>;

  constructor(protected options: AMQPConnectionOptions) {
    super();

    this.logger = options.logger ?? new ConsoleLogger();
  }

  private connect() {
    const { retryInterval = 5, retryAttempts = 120, ...options } = this.options;

    if (this.irrecuperableError) {
      return Promise.reject(
        new SkhailError({
          name: "unexpected",
          message:
            "Irrecuperable error have been raised. Aborting connection attempt",
        })
      );
    }

    if (this.client) {
      return Promise.resolve(this.client);
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.connectPromise = faultProofRetry(
      "connecting to rabbitmq",
      async (attempt) => {
        this.logger.info(
          `Attempting AMQP connection (${attempt}/${retryAttempts})`
        );
        this.client = await amqplib.connect(options);
        this.logger.info("Attempting AMQP connection success");

        this.client!.on("close", async () => {
          this.logger.info("AMQP Connection - Connection closing");

          this.client!.removeAllListeners();
          this.client = undefined;
        });

        this.client!.on("error", (err) => {
          this.logger.error(
            "AMQP Connection - Connection error",
            getError(err).toObject()
          );
        });

        this.emit("connect");

        return this.client!;
      },
      (error, attempt) => {
        this.logger.error(
          `AMQP Connection - Error while trying to connect (${attempt}/${retryAttempts})`,
          error.toObject()
        );
      },
      retryInterval,
      retryAttempts
    )
      .then((result) => {
        this.connectPromise = undefined;

        return result;
      })
      .catch((e) => {
        this.irrecuperableError = true;
        this.client = undefined;

        this.logger.error(
          "AMQP Connection - Irrecuperable error",
          getError(e).toObject()
        );

        throw getError(e, undefined, {
          name: "unexpected",
          message: "AMQP Connection - Irrecuperable error",
        });
      });

    return this.connectPromise;
  }

  private createChannel() {
    if (this.channel) {
      return Promise.resolve(this.channel);
    }

    if (this.channelPromise) {
      return this.channelPromise;
    }

    this.channelPromise = new Promise<amqplib.Channel>(
      async (resolve, reject) => {
        try {
          const connection = await this.connect();

          this.logger.debug(`AMQP channel - creation`);
          this.channel = await connection.createChannel();
          this.logger.debug("AMQP channel - creation success");

          this.channel.on("close", async () => {
            this.logger.info("AMQP channel - Channel closing");

            this.channel!.removeAllListeners();
            this.channel = undefined;
          });
          this.channel.on("error", (err) => {
            const error = getError(err);

            this.logger.error(
              "AMQP Connection - Channel error",
              error.toObject()
            );
          });
          resolve(this.channel);
        } catch (e) {
          reject(getError(e));
        } finally {
          this.channelPromise = undefined;
        }
      }
    );

    return this.channelPromise;
  }

  async cleanup(): Promise<void> {
    if (this.irrecuperableError) {
      return;
    }

    this.channel?.removeAllListeners();
    try {
      await this.channel?.close();
    } catch (e) {
      this.logger.error(
        "Error while closing AMQP channel",
        getError(e).toObject()
      );
    } finally {
      this.channel = undefined;
    }

    // await new Promise<void>((resolve) => setTimeout(resolve, 1500));

    this.client?.removeAllListeners();
    try {
      await this.client?.close();
    } catch (e) {
      this.logger.error(
        "Error while closing the AMQP connection",
        getError(e).toObject()
      );
    } finally {
      this.client = undefined;
    }
  }

  getClient() {
    return this.connect();
  }

  getChannel() {
    return this.createChannel();
  }
}
