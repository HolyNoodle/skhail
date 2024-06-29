/**
 * @group unit
 */
import { BatchService } from "./BatchService";

import { SkhailService } from "../Service/Service";

describe("BatchService", () => {
  type TestEvents = {
    testEvent: [number];
  };
  const logger = {
    info: jest.fn(),
    error: jest.fn(),
    trace: jest.fn(),
    warning: jest.fn(),
  };

  it("should create a new instance of SkhailService with the correct identifier", () => {
    // Arrange
    const identifier = "my-service";
    const handler = jest.fn();

    // Act
    const BatchServiceInstance = BatchService<TestEvents>(identifier)(
      { type: "CHAIN", timing: 1000 },
      (context, [s, s1]: [string, string]) => handler(context, s, s1)
    );
    const service = new BatchServiceInstance("test", "test1");

    // Assert
    expect(service).toBeInstanceOf(SkhailService);
    expect(BatchServiceInstance.identifier).toBe(identifier);
  });

  describe("CHAIN", () => {
    describe("ready", () => {
      let setTimeoutSpy: jest.SpyInstance;

      beforeEach(() => {
        jest.clearAllMocks();
        setTimeoutSpy = jest
          .spyOn(global, "setTimeout")
          .mockReturnValue(123 as any);
      });

      it("should execute handler at ready", async () => {
        // Arrange
        const identifier = "my-service";
        const handler = jest.fn().mockResolvedValue(undefined);
        const BatchServiceInstance = BatchService<TestEvents>(identifier)(
          { type: "CHAIN", timing: 1000 },
          (context, [s, s1]: [string, string]) => handler(context, s, s1)
        );
        const service = new BatchServiceInstance("test", "test1");
        service["network"] = "network" as any;
        service["logger"] = logger as any;
        service["serviceReady"] = true;

        // Act
        await service.ready?.();
        await jest.runAllTimersAsync();

        // Assert
        expect((service as any)["timerId"]).toBe(123);
        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith(
          { network: "network", logger },
          "test",
          "test1"
        );
        expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
        expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1000);
      });

      it("should not execute handler at ready when execute at ready is false", async () => {
        // Arrange
        const identifier = "my-service";
        const handler = jest.fn();
        const BatchServiceInstance = BatchService<TestEvents>(identifier)(
          { type: "CHAIN", timing: 0, executeAtReady: false },
          (context, [s, s1]: [string, string]) => handler(context, s, s1)
        );
        const service = new BatchServiceInstance("test", "test1");
        service["network"] = "network" as any;
        service["logger"] = logger as any;
        service["serviceReady"] = true;

        // Act
        await service.ready?.();

        // Assert
        expect(handler).toHaveBeenCalledTimes(0);
        expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
      });

      it("should execute handler after ", async () => {
        // Arrange
        const identifier = "my-service";
        const handler = jest.fn();
        const BatchServiceInstance = BatchService<TestEvents>(identifier)(
          { type: "CHAIN", timing: 1000, executeAtReady: false },
          (context, [s, s1]: [string, string]) => handler(context, s, s1)
        );
        const service = new BatchServiceInstance("test", "test1");
        service["network"] = "network" as any;
        service["logger"] = logger as any;
        service["serviceReady"] = true;

        // Act
        await service.ready?.();

        const execute = setTimeoutSpy.mock.calls[0][0] as () => void;
        execute();

        // Assert
        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith(
          { network: "network", logger },
          "test",
          "test1"
        );
      });
    });

    describe("cleanup", () => {
      let clearTimeoutSpy: jest.SpyInstance;
      beforeEach(() => {
        jest.useFakeTimers();

        clearTimeoutSpy = jest.spyOn(global, "clearTimeout");
      });
      it("Should cleanup the service", async () => {
        // Arrange
        const identifier = "my-service";
        const clearTimeout = jest.spyOn(global, "clearTimeout");
        const handler = jest.fn();
        const BatchServiceInstance = BatchService<TestEvents>(identifier)(
          { type: "CHAIN", timing: 1000 },
          (context, [s, s1]: [string, string]) => handler(context, s, s1)
        );
        const service: any = new BatchServiceInstance("test", "test1");
        service["timerId"] = 123;

        // Act
        const promise = service.cleanup();

        await jest.advanceTimersToNextTimerAsync();

        await promise;

        // Assert
        expect(service["timerId"]).toBeNull();
        expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
        expect(clearTimeoutSpy).toHaveBeenCalledWith(123);
      });
    });

    describe("run", () => {
      it("Should run handler", async () => {
        const identifier = "my-service";
        const handler = jest.fn();
        const BatchServiceInstance = BatchService<TestEvents>(identifier)(
          { type: "CHAIN", timing: 1000 },
          (context, [s, s1]: [string, string]) => handler(context, s, s1)
        );
        const service = new BatchServiceInstance("test", "test1");
        service["network"] = "network" as any;
        service["logger"] = logger as any;

        // Act
        await service.run();

        // Assert
        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith(
          {
            network: "network",
            logger,
          },
          "test",
          "test1"
        );
      });
    });
  });

  describe("FIXED", () => {
    describe("ready", () => {
      let setIntervalSpy: jest.SpyInstance;

      beforeEach(() => {
        jest.clearAllMocks();
        setIntervalSpy = jest
          .spyOn(global, "setInterval")
          .mockReturnValue(123 as any);
      });

      it("should execute handler at ready", async () => {
        // Arrange
        const identifier = "my-service";
        const handler = jest.fn().mockResolvedValue(undefined);
        const BatchServiceInstance = BatchService<TestEvents>(identifier)(
          { type: "FIXED", timing: 1000 },
          (context, [s, s1]: [string, string]) => handler(context, s, s1)
        );
        const service = new BatchServiceInstance("test", "test1");
        service["network"] = "network" as any;
        service["logger"] = logger as any;
        service["serviceReady"] = true;

        // Act
        await service.ready?.();

        // Assert
        expect((service as any)["timerId"]).toBe(123);
        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith(
          { network: "network", logger },
          "test",
          "test1"
        );
        expect(setIntervalSpy).toHaveBeenCalledTimes(1);
        expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 1000);
      });

      it("should not execute handler at ready when execute at ready is false", async () => {
        // Arrange
        const identifier = "my-service";
        const handler = jest.fn();
        const BatchServiceInstance = BatchService<TestEvents>(identifier)(
          { type: "FIXED", timing: 0, executeAtReady: false },
          (context, [s, s1]: [string, string]) => handler(context, s, s1)
        );
        const service = new BatchServiceInstance("test", "test1");
        service["network"] = "network" as any;
        service["logger"] = logger as any;
        service["serviceReady"] = true;

        // Act
        await service.ready?.();

        // Assert
        expect(handler).toHaveBeenCalledTimes(0);
        expect(setIntervalSpy).toHaveBeenCalledTimes(1);
      });

      it("should execute handler after ", async () => {
        // Arrange
        const identifier = "my-service";
        const handler = jest.fn();
        const BatchServiceInstance = BatchService<TestEvents>(identifier)(
          { type: "FIXED", timing: 1000, executeAtReady: false },
          (context, [s, s1]: [string, string]) => handler(context, s, s1)
        );
        const service = new BatchServiceInstance("test", "test1");
        service["network"] = "network" as any;
        service["logger"] = logger as any;
        service["serviceReady"] = true;

        // Act
        await service.ready?.();
        const execute = setIntervalSpy.mock.calls[0][0] as () => void;
        execute();

        // Assert
        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith(
          { network: "network", logger },
          "test",
          "test1"
        );
      });
    });

    describe("cleanup", () => {
      let clearIntervalSpy: jest.SpyInstance;
      beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();

        clearIntervalSpy = jest.spyOn(global, "clearInterval");
      });
      it("Should cleanup the service", async () => {
        // Arrange
        const identifier = "my-service";
        const handler = jest.fn();
        const BatchServiceInstance = BatchService<TestEvents>(identifier)(
          { type: "FIXED", timing: 1000 },
          (context, [s, s1]: [string, string]) => handler(context, s, s1)
        );
        const service: any = new BatchServiceInstance("test", "test1");
        service["timerId"] = 123;

        // Act
        const promise = service.cleanup();
        await jest.advanceTimersToNextTimerAsync();
        await promise;

        // Assert
        expect(service["timerId"]).toBeNull();
        expect(clearIntervalSpy).toHaveBeenCalledTimes(2); // because underlying super.cleanup also triggers clearInterval
        expect(clearIntervalSpy).toHaveBeenNthCalledWith(1, 123);
      });
    });

    describe("run", () => {
      it("Should run handler", async () => {
        const identifier = "my-service";
        const handler = jest.fn();
        const BatchServiceInstance = BatchService<TestEvents>(identifier)(
          { type: "FIXED", timing: 1000 },
          (context, [s, s1]: [string, string]) => handler(context, s, s1)
        );
        const service = new BatchServiceInstance("test", "test1");
        service["network"] = "network" as any;
        service["logger"] = logger as any;

        // Act
        await service.run();

        // Assert
        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith(
          {
            network: "network",
            logger,
          },
          "test",
          "test1"
        );
      });

      it("Should skip run handler when execution is already in progress and option is skip", async () => {
        const identifier = "my-service";
        const handler = jest.fn();
        const BatchServiceInstance = BatchService<TestEvents>(identifier)(
          { type: "FIXED", timing: 1000, overlap: "SKIP" },
          (context, [s, s1]: [string, string]) => handler(context, s, s1)
        );
        const service = new BatchServiceInstance("test", "test1");
        service["network"] = "network" as any;
        service["logger"] = logger as any;
        service["processing"].add("test");

        // Act
        await service.run();

        // Assert
        expect(handler).toHaveBeenCalledTimes(0);
      });

      it("Should wait run handler when execution is already in progress and option is wait", async () => {
        const identifier = "my-service";
        const handler = jest.fn();
        const BatchServiceInstance = BatchService<TestEvents>(identifier)(
          { type: "FIXED", timing: 1000, overlap: "WAIT" },
          (context, [s, s1]: [string, string]) => handler(context, s, s1)
        );
        const service = new BatchServiceInstance("test", "test1");
        service["network"] = "network" as any;
        service["logger"] = logger as any;
        service["processing"].add("test");

        // Act
        const promise = service.run();
        await jest.advanceTimersToNextTimerAsync();

        service["processing"].delete("test");

        await jest.advanceTimersToNextTimerAsync();

        // Assert
        expect(handler).toHaveBeenCalledTimes(1);
      });
    });
  });
});
