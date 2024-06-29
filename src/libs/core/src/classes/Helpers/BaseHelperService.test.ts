/**
 * @group unit
 */

import { BaseHelperService } from "./BaseHelperService";

describe("BaseHelperService", () => {
  class MyService extends BaseHelperService<[string]> {
    static identifier = "Test";

    async run(args: [string]) {}
  }

  describe("prepare", () => {
    const network = {
      on: jest.fn(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("Should prepare the service", async () => {
      // Arrange
      const service = new MyService();
      service["network"] = network as any;

      // Act
      await service.prepare();

      // Assert
      expect(service["serviceReady"]).toBe(true);
    });
  });

  describe("cleanup", () => {
    const network = {
      off: jest.fn(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
      jest.useFakeTimers();
    });

    it("Should cleanup the service", async () => {
      // Arrange
      const service = new MyService();
      service["network"] = network as any;

      // Act
      const promise = service.cleanup();
      await jest.advanceTimersToNextTimerAsync();
      await promise;

      // Assert
      expect(service["serviceReady"]).toBe(false);
    });

    it("Should wait for all tasks to be finished", async () => {
      // Arrange
      const service = new MyService();
      const spy = jest.fn();
      service["network"] = network as any;

      // Act
      service["processing"].add("test");
      const promise = service.cleanup().then(spy);

      await jest.advanceTimersToNextTimer();

      expect(spy).not.toHaveBeenCalled();

      service["processing"].delete("test");

      await jest.advanceTimersToNextTimer();

      await promise;

      // Assert
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe("wrapWithProcessing", () => {
    it("Should wrap the function with processing", async () => {
      // Arrange
      const service = new MyService();
      const logger = {
        trace: jest.fn(),
        error: jest.fn(),
      };
      service["serviceReady"] = true;
      service["logger"] = logger as any;
      const handler = jest.fn();

      service["run"] = handler;

      // Act
      await service["executeHandler"]("name");

      // Assert
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(["name"]);
    });

    it("Should not execute the function if service isn't ready", async () => {
      // Arrange
      const service = new MyService();
      const logger = {
        trace: jest.fn(),
        error: jest.fn(),
      };
      service["serviceReady"] = false;
      service["logger"] = logger as any;
      const handler = jest.fn();

      service["run"] = handler;

      // Act
      await service["executeHandler"]("name");

      // Assert
      expect(handler).toHaveBeenCalledTimes(0);
      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith("Service not ready", {
        identifier: "Test",
      });
    });

    it("Should log error when event handler throws", async () => {
      // Arrange
      const service = new MyService();
      const logger = {
        trace: jest.fn(),
        error: jest.fn(),
      };
      service["serviceReady"] = true;
      service["logger"] = logger as any;
      const handler = jest.fn().mockRejectedValue(new Error("Test error"));

      service["run"] = handler;

      // Act
      await service["executeHandler"]("name");

      // Assert
      expect(handler).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        "Event consumer processing error",
        {
          identifier: "Test",
          error: {
            details: {
              error: {
                message: "Test error",
              },
            },
            message: "An unexpected error occured",
            name: "unexpected",
          },
        }
      );
    });
  });
});
