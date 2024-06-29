/**
 * @group unit
 */
import { ConsoleLogger } from "@skhail/core";
import { AMQPConnection } from "./Connection";
import * as amqp from "amqplib";

jest.mock("amqplib");

describe("AMQPConnection", () => {
  const logger = { error: jest.fn(), info: jest.fn(), debug: jest.fn() };

  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers();
  });

  it("Should instantiate AMQPConnection", () => {
    const connection = new AMQPConnection({});

    expect(connection).toBeInstanceOf(AMQPConnection);
    expect(connection["logger"]).toBeInstanceOf(ConsoleLogger);
  });

  describe("connect", () => {
    it("Should connect to amqp", async () => {
      // Arrange
      const connection = new AMQPConnection({
        logger,
      } as any);

      const client = { on: jest.fn() };
      (amqp.connect as any as jest.SpyInstance).mockResolvedValue(
        client as any
      );

      const spy = jest.fn();
      connection.on("connect", spy);

      // Act
      const result = await connection["connect"]();

      // Assert
      expect(amqp.connect).toHaveBeenCalledTimes(1);
      expect(amqp.connect).toHaveBeenCalledWith({
        logger,
      });

      expect(result).toBe(client);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it("Should connect to amqp only once", async () => {
      // Arrange
      const connection = new AMQPConnection({
        logger,
      } as any);

      const client = { on: jest.fn() };
      (amqp.connect as any as jest.SpyInstance).mockResolvedValue(
        client as any
      );

      // Act
      const result = await Promise.all(
        new Array(5).fill(0).map(() => connection["connect"]())
      );

      // Assert
      expect(amqp.connect).toHaveBeenCalledTimes(1);
      expect(amqp.connect).toHaveBeenCalledWith({
        logger,
      });

      expect(result).toHaveLength(5);
      expect(result.every((r: any) => r === client)).toBeTruthy();
    });

    it("Should throw error when definitely fail in an irrecuperable way", async () => {
      // Arrange
      const connection = new AMQPConnection({
        logger,
        retryAttempts: 1,
        retryInterval: 1000,
      } as any);

      (amqp.connect as any as jest.SpyInstance).mockRejectedValueOnce(
        "test error"
      );

      // Act & Assert
      await expect(connection["connect"]()).rejects.toThrow(
        "Max attempts reached while connecting to rabbitmq"
      );

      expect(logger.error).toHaveBeenCalledTimes(2);
      expect(logger.error).toHaveBeenNthCalledWith(
        1,
        "AMQP Connection - Error while trying to connect (1/1)",
        {
          details: {
            error: {
              message: "test error",
            },
          },
          message: "Unexpected error while connecting to rabbitmq",
          name: "unexpected",
        }
      );
    });
  });

  describe("connect", () => {
    it("Should connect to amqp", async () => {
      // Arrange
      const connection = new AMQPConnection({
        logger,
      } as any);

      const client = { on: jest.fn() };
      (amqp.connect as any as jest.SpyInstance).mockResolvedValue(
        client as any
      );

      const spy = jest.fn();
      connection.on("connect", spy);

      // Act
      const result = await connection["connect"]();

      // Assert
      expect(amqp.connect).toHaveBeenCalledTimes(1);
      expect(amqp.connect).toHaveBeenCalledWith({
        logger,
      });

      expect(result).toBe(client);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it("Should connect to amqp only once", async () => {
      // Arrange
      const connection = new AMQPConnection({
        logger,
      } as any);

      const client = { on: jest.fn() };
      (amqp.connect as any as jest.SpyInstance).mockResolvedValue(
        client as any
      );

      // Act
      const result = await Promise.all(
        new Array(5).fill(0).map(() => connection["connect"]())
      );

      // Assert
      expect(amqp.connect).toHaveBeenCalledTimes(1);
      expect(amqp.connect).toHaveBeenCalledWith({
        logger,
      });

      expect(result).toHaveLength(5);
      expect(result.every((r: any) => r === client)).toBeTruthy();
    });

    it("Should throw error when definitely fail in an irrecuperable way", async () => {
      // Arrange
      const logger = { error: jest.fn(), info: jest.fn() };
      const connection = new AMQPConnection({
        logger,
        retryAttempts: 1,
        retryInterval: 1000,
      } as any);

      (amqp.connect as any as jest.SpyInstance).mockRejectedValueOnce(
        "test error"
      );

      // Act
      const promise = connection["connect"]();

      // Assert
      await expect(promise).rejects.toThrow(
        "Max attempts reached while connecting to rabbitmq"
      );

      expect(logger.error).toHaveBeenCalledTimes(2);
      expect(logger.error).toHaveBeenNthCalledWith(
        1,
        "AMQP Connection - Error while trying to connect (1/1)",
        {
          details: {
            error: {
              message: "test error",
            },
          },
          message: "Unexpected error while connecting to rabbitmq",
          name: "unexpected",
        }
      );
      expect(logger.error).toHaveBeenNthCalledWith(
        2,
        "AMQP Connection - Irrecuperable error",
        {
          details: {},
          message: "Max attempts reached while connecting to rabbitmq",
          name: "unexpected",
        }
      );

      expect(connection["irrecuperableError"]).toBeTruthy();
    });

    it("Should retry connection when connect fails", async () => {
      const logger = { error: jest.fn(), info: jest.fn() };
      const connection = new AMQPConnection({
        logger,
        retryAttempts: 2,
        retryInterval: 0,
      } as any);

      const client = { on: jest.fn() };
      (amqp.connect as any as jest.SpyInstance)
        .mockRejectedValueOnce("test error")
        .mockResolvedValueOnce(client);

      const clientPromise = connection["connect"]();

      await jest.advanceTimersToNextTimerAsync();

      await expect(clientPromise).resolves.toBe(client);
      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        "AMQP Connection - Error while trying to connect (1/2)",
        {
          details: {
            error: {
              message: "test error",
            },
          },
          message: "Unexpected error while connecting to rabbitmq",
          name: "unexpected",
        }
      );
    });

    it("Should reset client when connection closes", async () => {
      const connection = new AMQPConnection({
        logger,
      } as any);

      const client = { on: jest.fn(), removeAllListeners: jest.fn() };
      const client2 = { on: jest.fn() };
      (amqp.connect as any as jest.SpyInstance)
        .mockResolvedValueOnce(client as any)
        .mockResolvedValue(client2);

      const result = await connection["connect"]();

      expect(result).toBe(client);

      client.on.mock.calls[0][1]();

      const result2 = await connection["connect"]();

      expect(result2).toBe(client2);
    });

    it("Should log error when connection emit error", async () => {
      const connection = new AMQPConnection({
        logger,
      } as any);

      const client = { on: jest.fn(), removeAllListeners: jest.fn() };
      const client2 = { on: jest.fn() };
      (amqp.connect as any as jest.SpyInstance)
        .mockResolvedValueOnce(client as any)
        .mockResolvedValue(client2);

      const result = await connection["connect"]();

      expect(result).toBe(client);

      client.on.mock.calls[1][1]("test error");

      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        "AMQP Connection - Connection error",
        {
          details: {},
          message: "test error",
          name: "unexpected",
        }
      );
    });

    it("Should return client when already connected", async () => {
      const connection = new AMQPConnection({
        logger,
      } as any);

      const client = { on: jest.fn() };
      (amqp.connect as any as jest.SpyInstance).mockResolvedValue(
        client as any
      );

      connection["client"] = client as any;

      const result = await connection["connect"]();

      expect(result).toBe(client);
      expect(amqp.connect).toHaveBeenCalledTimes(0);
    });

    it("Should throw when connection is irrecuperable", async () => {
      const connection = new AMQPConnection({
        logger,
      } as any);

      connection["irrecuperableError"] = true;

      await expect(connection["connect"]()).rejects.toThrow(
        "Irrecuperable error have been raised. Aborting connection attempt"
      );
    });
  });

  describe("createChannel", () => {
    it("Should create channel", async () => {
      const connection = new AMQPConnection({
        logger,
      } as any);

      const channel = { channel: "test", on: jest.fn() };
      const client = {
        on: jest.fn(),
        createChannel: jest.fn().mockResolvedValue(channel),
      };

      const connect = jest.fn().mockResolvedValue(client);
      connection["connect"] = connect;

      const result = await connection["createChannel"]();

      expect(result).toBe(channel);
      expect(connect).toHaveBeenCalledTimes(1);
      expect(client.createChannel).toHaveBeenCalledTimes(1);

      expect(channel.on).toHaveBeenCalledTimes(2);
      expect(channel.on).toHaveBeenNthCalledWith(
        1,
        "close",
        expect.any(Function)
      );
      expect(channel.on).toHaveBeenNthCalledWith(
        2,
        "error",
        expect.any(Function)
      );
    });

    it("Should throw when client fails to connect", async () => {
      const connection = new AMQPConnection({
        logger,
      } as any);
      const client = {
        on: jest.fn(),
        createChannel: jest.fn().mockRejectedValue("test error"),
      };

      const connect = jest.fn().mockResolvedValue(client);
      connection["connect"] = connect;

      await expect(connection["createChannel"]()).rejects.toThrow("test error");
    });

    it("Should return channel when already connected", async () => {
      const connection = new AMQPConnection({
        logger,
      } as any);

      const channel = { channel: "test", on: jest.fn() };
      connection["channel"] = channel as any;

      const result = await connection["createChannel"]();

      expect(result).toBe(channel);
    });

    it("Should log error when channel emit error", async () => {
      const logger = { error: jest.fn(), info: jest.fn(), debug: jest.fn() };
      const connection = new AMQPConnection({
        logger,
      } as any);

      const channel = { channel: "test", on: jest.fn() };
      const client = {
        on: jest.fn(),
        createChannel: jest.fn().mockResolvedValue(channel),
      };

      const connect = jest.fn().mockResolvedValue(client);
      connection["connect"] = connect;

      await connection["createChannel"]();

      channel.on.mock.calls[1][1]("test error");

      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        "AMQP Connection - Channel error",
        {
          details: {},
          message: "test error",
          name: "unexpected",
        }
      );
    });

    it("Should reset channel when channel closes", async () => {
      const connection = new AMQPConnection({
        logger,
      } as any);

      const channel = {
        channel: "test",
        on: jest.fn(),
        removeAllListeners: jest.fn(),
      };
      const channel2 = { channel: "test2", on: jest.fn() };
      const client = {
        on: jest.fn(),
        createChannel: jest
          .fn()
          .mockResolvedValueOnce(channel)
          .mockResolvedValue(channel2),
      };

      const connect = jest.fn().mockResolvedValue(client);
      connection["connect"] = connect;

      const result = await connection["createChannel"]();

      expect(result).toBe(channel);

      channel.on.mock.calls[0][1]();

      const result2 = await connection["createChannel"]();

      expect(result2).toBe(channel2);
    });

    it("Should create channel only once", async () => {
      const connection = new AMQPConnection({
        logger,
      } as any);

      const channel = { on: jest.fn() };
      const client = {
        createChannel: jest.fn().mockResolvedValueOnce(channel),
      };

      connection["connect"] = () => Promise.resolve(client as any);

      const result = await Promise.all(
        new Array(5).fill(0).map(() => connection["createChannel"]())
      );

      expect(client.createChannel).toHaveBeenCalledTimes(1);
      expect(client.createChannel).toHaveBeenCalledWith();

      expect(result).toHaveLength(5);
      expect(result.every((r: any) => r === channel)).toBeTruthy();
    });
  });

  describe("cleanup", () => {
    it("Should close channel and client", async () => {
      const connection = new AMQPConnection({
        logger,
      } as any);

      const channel = { close: jest.fn(), removeAllListeners: jest.fn() };
      const client = {
        close: jest.fn(),
        removeAllListeners: jest.fn(),
      };

      connection["client"] = client as any;
      connection["channel"] = channel as any;

      await connection.cleanup();

      expect(channel.removeAllListeners).toHaveBeenCalledTimes(1);
      expect(client.removeAllListeners).toHaveBeenCalledTimes(1);
      expect(channel.close).toHaveBeenCalledTimes(1);
      expect(client.close).toHaveBeenCalledTimes(1);
    });

    it("Should not try to reconnect when irrecoverable error", async () => {
      const connection = new AMQPConnection({
        logger,
      } as any);

      const channel = { close: jest.fn(), removeAllListeners: jest.fn() };
      connection["irrecuperableError"] = true;
      connection["channel"] = channel as any;

      await connection.cleanup();

      expect(channel.removeAllListeners).toHaveBeenCalledTimes(0);
    });

    it("Should log error when channel fails to close", async () => {
      const connection = new AMQPConnection({
        logger,
      } as any);

      const channel = {
        close: jest.fn().mockRejectedValue("test error"),
        removeAllListeners: jest.fn(),
      };
      const client = {
        close: jest.fn(),
        removeAllListeners: jest.fn(),
      };

      connection["client"] = client as any;
      connection["channel"] = channel as any;

      await connection.cleanup();

      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        "Error while closing AMQP channel",
        {
          details: {},
          message: "test error",
          name: "unexpected",
        }
      );
    });

    it("Should log error when client fails to close", async () => {
      const logger = { error: jest.fn(), info: jest.fn() };
      const connection = new AMQPConnection({
        logger,
      } as any);

      const channel = { close: jest.fn(), removeAllListeners: jest.fn() };
      const client = {
        close: jest.fn().mockRejectedValue("test error"),
        removeAllListeners: jest.fn(),
      };

      connection["client"] = client as any;
      connection["channel"] = channel as any;

      await connection.cleanup();

      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        "Error while closing the AMQP connection",
        {
          details: {},
          message: "test error",
          name: "unexpected",
        }
      );
    });
  });

  describe("getClient", () => {
    it("Should call connect", async () => {
      const connection = new AMQPConnection({
        logger,
      } as any);

      const client = { on: jest.fn() };
      const connect = jest.fn().mockResolvedValue(client);
      connection["connect"] = connect;

      const result = await connection.getClient();

      expect(result).toBe(client);
      expect(connect).toHaveBeenCalledTimes(1);
    });
  });

  describe("getChannel", () => {
    it("Should call createChannel", async () => {
      const connection = new AMQPConnection({
        logger,
      } as any);

      const channel = { on: jest.fn() };
      const createChannel = jest.fn().mockResolvedValue(channel);
      connection["createChannel"] = createChannel;

      const result = await connection.getChannel();

      expect(result).toBe(channel);
      expect(createChannel).toHaveBeenCalledTimes(1);
    });
  });
});
