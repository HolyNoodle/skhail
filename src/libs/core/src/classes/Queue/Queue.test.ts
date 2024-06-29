/**
 * @group unit
 */

import { InMemoryQueue } from "./Queue";

describe("InMemoryQueue", () => {
  describe("setLogger", () => {
    it("Should set logger", () => {
      const queue = new InMemoryQueue();
      const logger = {} as any;
      queue.setLogger(logger);

      expect(queue["logger"]).toBe(logger);
    });
  });

  describe("prepare", () => {
    it("Should set handlers", async () => {
      const queue = new InMemoryQueue();

      await queue.prepare();

      expect(queue["handlers"]).toBeDefined();
    });
  });

  describe("cleanup", () => {
    it("Should unset handlers", async () => {
      const queue = new InMemoryQueue();

      await queue.cleanup();

      expect(queue["handlers"]).toBeUndefined();
    });
  });

  describe("setHandler", () => {
    it("Should set handler", async () => {
      const queue = new InMemoryQueue();
      const logger = { info: jest.fn(), debug: jest.fn() } as any;
      const spy = jest.fn();

      queue.setLogger(logger);
      await queue.prepare();

      queue.setHandler("serviceName", spy);

      expect(queue["handlers"]?.get("serviceName")).toStrictEqual(spy);
    });
  });

  describe("enqueue", () => {
    it("Should call handler", async () => {
      const queue = new InMemoryQueue();
      const logger = { info: jest.fn(), debug: jest.fn() } as any;
      const spy = jest.fn();

      queue.setLogger(logger);
      await queue.prepare();

      queue.setHandler("serviceName", spy);

      queue.enqueue({
        service: "serviceName",
        method: "testMethod",
        args: ["parameters", "other"],
        context: {
          tid: "test transaction id",
          data: { test: "data" },
        },
      });

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith({
        service: "serviceName",
        method: "testMethod",
        args: ["parameters", "other"],
        context: {
          tid: "test transaction id",
          data: { test: "data" },
        },
      });
    });

    it("Should not call handler when message service is not handled", async () => {
      const queue = new InMemoryQueue();
      const logger = {
        info: jest.fn(),
        warning: jest.fn(),
        debug: jest.fn(),
      } as any;
      const spy = jest.fn();

      queue.setLogger(logger);
      await queue.prepare();

      queue.setHandler("serviceName", spy);

      queue.enqueue({
        service: "otherService",
        method: "testMethod",
        args: ["parameters", "other"],
        context: {} as any,
      });

      expect(spy).toHaveBeenCalledTimes(0);
    });
  });
});
