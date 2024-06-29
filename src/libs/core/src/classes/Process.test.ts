/**
 * @group unit
 */

import { SkhailError } from "./Error";
import { InMemoryEventEmitter } from "./Event";
import { ConsoleLogger } from "./Logger/ConsoleLogger";
import { NodeProcess } from "./Process";
import { InMemoryQueue } from "./Queue";
import { SkhailServer } from "./Server";

jest.mock("./Server");
jest.mock("./Queue");
jest.mock("./Event");
jest.mock("./Logger/ConsoleLogger");

describe("NodeProcess", () => {
  const logger = new ConsoleLogger();
  const queue = new InMemoryQueue();
  const event = new InMemoryEventEmitter();

  beforeEach(() => {
    jest.clearAllMocks();

    jest.useFakeTimers();
    jest.setSystemTime(new Date(2023, 0, 1, 5, 0, 0, 0));

    (ConsoleLogger as any).mockReturnValue(logger);
    (InMemoryQueue as any).mockReturnValue(queue);
    (InMemoryEventEmitter as any).mockReturnValue(event);
  });

  it("Should return server", async () => {
    const nodeProcess = new NodeProcess(process, []);

    await nodeProcess.start();

    const server = nodeProcess.getServer();

    expect(server).toBeInstanceOf(SkhailServer);
  });

  it("Should listen to nodejs process exit events", () => {
    const process = { on: jest.fn(), exit: jest.fn(), env: {} } as any;
    const exitProcessSpy = jest.spyOn(
      NodeProcess.prototype,
      "exitProcess" as any
    );
    const nodeProcess = new NodeProcess(process, []);

    expect(nodeProcess).toBeInstanceOf(NodeProcess);
    expect(process.on).toHaveBeenCalledTimes(3);
    expect(process.on.mock.calls[0][0]).toBe("SIGTERM");
    expect(process.on.mock.calls[1][0]).toBe("SIGINT");
    expect(process.on.mock.calls[2][0]).toBe("uncaughtException");

    (nodeProcess["exitProcess"] as any as jest.SpyInstance).mockReset();
    process.on.mock.calls[0][1](2);
    expect(nodeProcess["exitProcess"]).toHaveBeenCalledTimes(1);
    expect(nodeProcess["exitProcess"]).toHaveBeenCalledWith(2);

    (nodeProcess["exitProcess"] as any as jest.SpyInstance).mockReset();
    process.on.mock.calls[1][1](3);
    expect(nodeProcess["exitProcess"]).toHaveBeenCalledTimes(1);
    expect(nodeProcess["exitProcess"]).toHaveBeenCalledWith(3);

    (nodeProcess["exitProcess"] as any as jest.SpyInstance).mockReset();
    process.on.mock.calls[2][1](
      new SkhailError({ message: "test", name: "denied" })
    );
    expect(nodeProcess["exitProcess"]).toHaveBeenCalledTimes(0);

    (nodeProcess["exitProcess"] as any as jest.SpyInstance).mockReset();
    process.on.mock.calls[2][1]("error message");
    expect(nodeProcess["exitProcess"]).toHaveBeenCalledTimes(0);

    exitProcessSpy.mockRestore();
  });

  describe("start", () => {
    it("Should start the server", async () => {
      const process = { on: jest.fn(), env: {} } as any;
      const nodeProcess = new NodeProcess(process, [
        { test: "service" } as any,
      ]);

      await nodeProcess.start();

      expect(SkhailServer).toHaveBeenCalledTimes(1);
      expect((SkhailServer as any).mock.calls[0][0]).toMatchObject({
        manage: undefined,
        services: [{ test: "service" }],
      });

      expect(SkhailServer.prototype.start).toHaveBeenCalledTimes(1);
      expect(SkhailServer.prototype.start).toHaveBeenCalledWith();
    });

    it("Should start the server with default event system", async () => {
      const process = { on: jest.fn(), env: {} } as any;
      const nodeProcess = new NodeProcess(
        process,
        [{ test: "service" } as any],
        {
          event: true,
        }
      );

      await nodeProcess.start();

      expect(SkhailServer).toHaveBeenCalledTimes(1);
      expect((SkhailServer as any).mock.calls[0][0]).toMatchObject({
        manage: undefined,
        event,
        services: [{ test: "service" }],
      });

      expect(InMemoryEventEmitter).toHaveBeenCalledTimes(1);
      expect(InMemoryEventEmitter).toHaveBeenCalledWith();
    });

    it("Should start the server with event system", async () => {
      const process = { on: jest.fn(), env: {} } as any;
      const nodeProcess = new NodeProcess(
        process,
        [{ test: "service" } as any],
        {
          event: { event: "system" } as any,
        }
      );

      await nodeProcess.start();

      expect(SkhailServer).toHaveBeenCalledTimes(1);
      expect((SkhailServer as any).mock.calls[0][0]).toMatchObject({
        manage: undefined,
        event: { event: "system" },
        services: [{ test: "service" }],
      });

      expect(InMemoryEventEmitter).toHaveBeenCalledTimes(0);
    });

    it("Should start the server with managed services", async () => {
      const process = {
        on: jest.fn(),
        env: { SKHAIL_SERVICES: "Test1,Test2, Test3 ,Test4" },
      } as any;
      const nodeProcess = new NodeProcess(process, [
        { test: "service" } as any,
      ]);

      await nodeProcess.start();

      expect(SkhailServer).toHaveBeenCalledTimes(1);
      expect((SkhailServer as any).mock.calls[0][0]).toMatchObject({
        manage: ["Test1", "Test2", "Test3", "Test4"],
        services: [{ test: "service" }],
      });
    });

    it("Should set the instance on the logger", async () => {
      const process = {
        on: jest.fn(),
        env: { SKHAIL_INSTANCE: "I am a test instance" },
      } as any;
      const nodeProcess = new NodeProcess(process, [
        { test: "service" } as any,
      ]);

      await nodeProcess.start();

      expect(ConsoleLogger.prototype.setInstance).toHaveBeenCalledTimes(1);
      expect(ConsoleLogger.prototype.setInstance).toHaveBeenCalledWith(
        "I am a test instance"
      );

      expect(SkhailServer).toHaveBeenCalledTimes(1);
      expect((SkhailServer as any).mock.calls[0][0]).toMatchObject({
        services: [{ test: "service" }],
      });
    });

    it("Should prepare dependencies", async () => {
      const dependency = { prepare: jest.fn() } as any;
      const process = { on: jest.fn(), env: {} } as any;
      const nodeProcess = new NodeProcess(process, []);

      nodeProcess.registerDependency(dependency);

      await nodeProcess.start();

      expect(dependency.prepare).toHaveBeenCalledTimes(1);
      expect(dependency.prepare).toHaveBeenCalledWith();

      expect(SkhailServer.prototype.start).toHaveBeenCalledTimes(1);
      expect(SkhailServer.prototype.start).toHaveBeenCalledWith();
    });

    it("Should throw error when dependency preparation fails", async () => {
      const dependency = {
        prepare: jest.fn().mockRejectedValue(new Error("test error")),
      };
      const process = { on: jest.fn(), env: {} } as any;
      const nodeProcess = new NodeProcess(process, []);

      nodeProcess.registerDependency(dependency);

      await expect(nodeProcess.start()).rejects.toThrow("test error");

      expect(dependency.prepare).toHaveBeenCalledTimes(1);
      expect(dependency.prepare).toHaveBeenCalledWith();

      expect(SkhailServer.prototype.start).toHaveBeenCalledTimes(0);
    });

    it("Should not cleanup dependency", async () => {
      const dependency = {} as any;
      const process = { on: jest.fn(), env: {} } as any;
      const nodeProcess = new NodeProcess(process, []);

      nodeProcess.registerDependency(dependency);

      await nodeProcess.start();

      expect(SkhailServer.prototype.start).toHaveBeenCalledTimes(1);
      expect(SkhailServer.prototype.start).toHaveBeenCalledWith();
    });

    it("Should cleanup all dependencies even if failure", async () => {
      const dependency1 = { cleanup: jest.fn() };
      const dependency2 = {
        cleanup: jest.fn().mockRejectedValue("test error"),
      };
      const process = { on: jest.fn(), env: {} } as any;
      const nodeProcess = new NodeProcess(process, []);

      nodeProcess.registerDependency(dependency1);
      nodeProcess.registerDependency(dependency2);

      await nodeProcess.stop();

      expect(dependency1.cleanup).toHaveBeenCalledTimes(1);
      expect(dependency1.cleanup).toHaveBeenCalledWith();

      expect(dependency2.cleanup).toHaveBeenCalledTimes(1);
      expect(dependency2.cleanup).toHaveBeenCalledWith();

      expect(SkhailServer.prototype.stop).toHaveBeenCalledTimes(1);
    });
  });

  describe("stop", () => {
    it("Should start the server", async () => {
      const process = { on: jest.fn(), env: {} } as any;
      const nodeProcess = new NodeProcess(process, []);

      await nodeProcess.stop();

      expect(SkhailServer.prototype.stop).toHaveBeenCalledTimes(1);
      expect(SkhailServer.prototype.stop).toHaveBeenCalledWith();
    });

    it("Should cleanup dependencies", async () => {
      const dependency = { cleanup: jest.fn() } as any;
      const process = { on: jest.fn(), env: {} } as any;
      const nodeProcess = new NodeProcess(process, []);

      nodeProcess.registerDependency(dependency);

      await nodeProcess.stop();

      expect(dependency.cleanup).toHaveBeenCalledTimes(1);
      expect(dependency.cleanup).toHaveBeenCalledWith();

      expect(SkhailServer.prototype.stop).toHaveBeenCalledTimes(1);
      expect(SkhailServer.prototype.stop).toHaveBeenCalledWith();
    });

    it("Should not cleanup dependency", async () => {
      const dependency = {} as any;
      const process = { on: jest.fn(), env: {} } as any;
      const nodeProcess = new NodeProcess(process, []);

      nodeProcess.registerDependency(dependency);

      await nodeProcess.stop();

      expect(SkhailServer.prototype.stop).toHaveBeenCalledTimes(1);
      expect(SkhailServer.prototype.stop).toHaveBeenCalledWith();
    });
  });

  describe("exitProcess", () => {
    it("Should setTimeout", async () => {
      jest.spyOn(globalThis, "setTimeout").mockReturnValue("123" as any);

      const process = { on: jest.fn(), exit: jest.fn(), env: {} } as any;
      const nodeProcess = new NodeProcess(process, []);

      await nodeProcess["exitProcess"]();

      expect(SkhailServer.prototype.stop).toHaveBeenCalledTimes(1);
      expect(process.exit).toHaveBeenCalledTimes(1);
      expect(setTimeout).toHaveBeenCalledTimes(1);
      expect((setTimeout as any).mock.calls[0][1]).toBe(5000);
    });

    it("Should continue terminating even when server stop throw error", async () => {
      (SkhailServer.prototype.stop as any).mockRejectedValue(
        new Error("test error")
      );
      jest.spyOn(globalThis, "setTimeout").mockReturnValue("123" as any);

      const process = { on: jest.fn(), exit: jest.fn(), env: {} } as any;
      const nodeProcess = new NodeProcess(process, []);

      await nodeProcess["exitProcess"]();

      expect(SkhailServer.prototype.stop).toHaveBeenCalledTimes(1);
      expect(process.exit).toHaveBeenCalledTimes(1);
      expect(setTimeout).toHaveBeenCalledTimes(1);
      expect((setTimeout as any).mock.calls[0][1]).toBe(5000);
    });

    it("Should not setTimeout when timeoutId is already present", async () => {
      jest.spyOn(globalThis, "setTimeout").mockReturnValue("123" as any);

      const process = { on: jest.fn(), exit: jest.fn(), env: {} } as any;
      const nodeProcess = new NodeProcess(process, []);

      nodeProcess["timeoutId"] = "235" as any;
      await nodeProcess["exitProcess"]();

      expect(nodeProcess["timeoutId"]).toBe("235");

      await jest.advanceTimersToNextTimer();

      expect(SkhailServer.prototype.stop).toHaveBeenCalledTimes(0);
      expect(process.exit).toHaveBeenCalledTimes(0);
      expect(setTimeout).toHaveBeenCalledTimes(0);
    });

    it("Should exit process when process times out", async () => {
      jest.spyOn(globalThis, "setTimeout").mockReturnValue("123" as any);

      const process = { on: jest.fn(), exit: jest.fn(), env: {} } as any;
      const nodeProcess = new NodeProcess(process, []);

      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      nodeProcess["exitProcess"]();

      expect(nodeProcess["timeoutId"]).toBe("123");

      await jest.advanceTimersToNextTimer();

      expect(SkhailServer.prototype.stop).toHaveBeenCalledTimes(1);
      expect(process.exit).toHaveBeenCalledTimes(0);

      const timeoutFunction = (setTimeout as any).mock.calls[0][0];
      timeoutFunction();

      expect(process.exit).toHaveBeenCalledTimes(1);
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it("Should exit process when process times out with code", async () => {
      jest.spyOn(globalThis, "setTimeout").mockReturnValue("123" as any);

      const process = { on: jest.fn(), exit: jest.fn(), env: {} } as any;
      const nodeProcess = new NodeProcess(process, []);

      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      nodeProcess["exitProcess"](1);

      expect(nodeProcess["timeoutId"]).toBe("123");

      await jest.advanceTimersToNextTimer();

      expect(SkhailServer.prototype.stop).toHaveBeenCalledTimes(1);
      expect(process.exit).toHaveBeenCalledTimes(0);

      const timeoutFunction = (setTimeout as any).mock.calls[0][0];
      timeoutFunction();

      expect(process.exit).toHaveBeenCalledTimes(1);
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});
