/**
 * @group unit
 */
import {
  EventConsumerExecutionContext,
  EventConsumerService,
} from "./EventConsumerService";

import { SkhailService } from "../Service/Service";

describe("EventConsumerService", () => {
  type TestEvents = {
    testEvent: [number];
  };
  class MyService extends SkhailService<any, TestEvents> {
    static identifier = "Test";
  }
  class MyAbstractService extends SkhailService<any, TestEvents> {
    static identifier = "Test";
  }

  it("should create a new instance of SkhailService with the correct identifier", () => {
    // Arrange
    const identifier = "my-service";
    const handler = jest.fn();

    // Act
    const EventConsumerServiceInstance = EventConsumerService(identifier)(
      MyService,
      "testEvent",
      (
        {}: EventConsumerExecutionContext<TestEvents>,
        [s, s1]: [string, string],
        ...args: [number]
      ) => handler(s, s1, args)
    );
    const service = new EventConsumerServiceInstance("test", "test1");

    // Assert
    expect(service).toBeInstanceOf(SkhailService);
    expect(EventConsumerServiceInstance.identifier).toBe(identifier);
  });

  it("should create a new instance of SkhailService with the correct identifier", () => {
    // Arrange
    const identifier = "my-service";
    const handler = jest.fn();

    // Act
    const EventConsumerServiceInstance = EventConsumerService(identifier)(
      MyAbstractService,
      "testEvent",
      (
        {}: EventConsumerExecutionContext<TestEvents>,
        [s, s1]: [string, string],
        ...args: [number]
      ) => handler(s, s1, args)
    );
    const service = new EventConsumerServiceInstance("test", "test1");

    // Assert
    expect(service).toBeInstanceOf(SkhailService);
    expect(EventConsumerServiceInstance.identifier).toBe(identifier);
  });

  describe("prepare", () => {
    const network = {
      on: jest.fn(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("Should prepare the service", async () => {
      // Arrange
      const identifier = "my-service";
      const handler = jest.fn();
      const EventConsumerServiceInstance = EventConsumerService<TestEvents>(
        identifier
      )(MyService, "testEvent", ({}, [s, s1]: [string, string], ...args) =>
        handler(s, s1, args)
      );
      const service = new EventConsumerServiceInstance("test", "test1");
      service["network"] = network as any;

      // Act
      await service.prepare();

      // Assert
      expect(network.on).toHaveBeenCalledTimes(1);
      expect(network.on).toHaveBeenCalledWith(
        MyService,
        "testEvent",
        expect.any(Function)
      );
    });
  });

  describe("cleanup", () => {
    const network = {
      off: jest.fn(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("Should cleanup the service", async () => {
      // Arrange
      const identifier = "my-service";
      const handler = jest.fn();
      const EventConsumerServiceInstance = EventConsumerService<TestEvents>(
        identifier
      )(MyService, "testEvent", ({}, [s, s1]: [string, string], ...args) =>
        handler(s, s1, args)
      );
      const service = new EventConsumerServiceInstance("test", "test1");
      service["network"] = network as any;

      // Act
      await service.cleanup();

      // Assert
      expect(network.off).toHaveBeenCalledTimes(1);
      expect(network.off).toHaveBeenCalledWith(
        MyService,
        "testEvent",
        expect.any(Function)
      );
    });
  });

  describe("run", () => {
    it("Should run handler", async () => {
      const identifier = "my-service";
      const handler = jest.fn();
      const EventConsumerServiceInstance = EventConsumerService<TestEvents>(
        identifier
      )(MyService, "testEvent", (context, [s, s1]: [string, string], ...args) =>
        handler(context, s, s1, args)
      );
      const service = new EventConsumerServiceInstance("test", "test1");
      service["network"] = "network" as any;
      service["logger"] = "logger" as any;

      // Act
      await service.run([12]);

      // Assert
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        {
          network: "network",
          logger: "logger",
        },
        "test",
        "test1",
        [12]
      );
    });
  });
});
