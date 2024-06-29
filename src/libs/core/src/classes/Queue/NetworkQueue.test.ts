/**
 * @group unit
 */
import { NetworkQueue } from "./NetworkQueue";

describe("NetworkQueue", () => {
  it("Should instanciate NetworkQueue", () => {
    // Arrange
    const mainQueue = {};

    // Act
    const queue = new NetworkQueue([
      {
        default: true,
        queue: mainQueue as any,
        services: ["test"],
      },
    ]);

    // Assert
    expect(queue).toBeInstanceOf(NetworkQueue);
  });

  describe("prepare", () => {
    it("Should prepare NetworkQueue", async () => {
      // Arrange
      const mainQueue = {
        prepare: jest.fn(),
      };
      const queue = new NetworkQueue([
        {
          default: true,
          queue: mainQueue as any,
          services: ["test"],
        },
      ]);

      // Act
      await queue.prepare();

      // Assert
      expect(mainQueue.prepare).toHaveBeenCalled();
    });

    it("Should throw if service already registered", async () => {
      // Arrange
      const mainQueue = {
        prepare: jest.fn(),
      };
      const queue = new NetworkQueue([
        {
          default: true,
          queue: mainQueue as any,
          services: ["test"],
        },
        {
          queue: mainQueue as any,
          services: ["test"],
        },
      ]);

      // Act
      // Assert
      await expect(queue.prepare()).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Service test already registered with other network"`
      );
    });

    it("Should throw if default network already set", async () => {
      // Arrange
      const mainQueue = {
        prepare: jest.fn(),
      };
      const queue = new NetworkQueue([
        {
          default: true,
          queue: mainQueue as any,
          services: ["test"],
        },
        {
          default: true,
          queue: mainQueue as any,
          services: ["test2"],
        },
      ]);

      // Act
      // Assert
      await expect(queue.prepare()).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Default network already set"`
      );
    });
  });

  describe("cleanup", () => {
    it("Should cleanup NetworkQueue", async () => {
      // Arrange
      const mainQueue = {
        cleanup: jest.fn(),
      };
      const queue = new NetworkQueue([
        {
          default: true,
          queue: mainQueue as any,
          services: ["test"],
        },
      ]);

      // Act
      await queue.cleanup();

      // Assert
      expect(mainQueue.cleanup).toHaveBeenCalled();
    });
  });

  describe("setLogger", () => {
    it("Should set logger", () => {
      // Arrange
      const mainQueue = {
        setLogger: jest.fn(),
      };
      const queue = new NetworkQueue([
        {
          default: true,
          queue: mainQueue as any,
          services: ["test"],
        },
      ]);
      const logger = {} as any;

      // Act
      queue.setLogger(logger);

      // Assert
      expect(mainQueue.setLogger).toHaveBeenCalledWith(logger);
    });
  });

  describe("setHandler", () => {
    it("Should set handler", async () => {
      // Arrange
      const mainQueue = {
        setHandler: jest.fn(),
      };
      const queue = new NetworkQueue([
        {
          default: true,
          queue: mainQueue as any,
          services: ["test"],
        },
      ]);

      const handler = jest.fn();

      // Act
      await queue.prepare();
      await queue.setHandler("test", handler);

      // Assert
      expect(mainQueue.setHandler).toHaveBeenCalledWith("test", handler);
    });

    it("Should throw if service has no network associated", async () => {
      // Arrange
      const mainQueue = {
        setHandler: jest.fn(),
      };
      const queue = new NetworkQueue([
        {
          default: true,
          queue: mainQueue as any,
          services: ["test"],
        },
      ]);
      const handler = jest.fn();

      // Act
      await queue.prepare();

      // Assert
      await expect(queue.setHandler("test2", handler)).rejects.toThrow(
        "Service test2 has no network associated"
      );
    });
  });

  describe("enqueue", () => {
    it("Should enqueue to default queue", async () => {
      // Arrange
      const mainQueue = {
        enqueue: jest.fn(),
      };
      const queue = new NetworkQueue([
        {
          default: true,
          queue: mainQueue as any,
          services: ["test"],
        },
      ]);
      const enveloppe = {};

      // Act
      await queue.prepare();
      await queue.enqueue(enveloppe as any);

      // Assert
      expect(mainQueue.enqueue).toHaveBeenCalledWith(enveloppe);
    });

    it("Should enqueue to service queue", async () => {
      // Arrange
      const mainQueue = {
        enqueue: jest.fn(),
      };
      const subQueue = {
        enqueue: jest.fn(),
      };
      const queue = new NetworkQueue([
        {
          default: true,
          queue: mainQueue as any,
          services: ["test"],
        },
        {
          queue: subQueue as any,
          services: ["test2"],
        },
      ]);
      const enveloppe = {
        service: "test2",
      };

      // Act
      await queue.prepare();
      await queue.enqueue(enveloppe as any);

      // Assert
      expect(subQueue.enqueue).toHaveBeenCalledWith(enveloppe);
    });

    it("Should throw if service has no network associated", async () => {
      // Arrange
      const mainQueue = {
        enqueue: jest.fn(),
      };
      const queue = new NetworkQueue([
        {
          queue: mainQueue as any,
          services: ["test"],
        },
      ]);
      const enveloppe = {};

      // Act
      await queue.prepare();

      // Assert
      await expect(queue.enqueue(enveloppe as any)).rejects.toThrow(
        "No network found for sending message. Consider adding a default network"
      );
    });
  });
});
