/**
 * @group unit
 */

import { InMemoryEventEmitter } from "./Event";

describe("InMemoryEventEmitter", () => {
  describe("setLogger", () => {
    it("Should not set logger", () => {
      const event = new InMemoryEventEmitter();

      event.setLogger({} as any);

      expect(event["logger"]).toBeDefined();
    });
  });

  describe("prepare", () => {
    it("Should set listeners", async () => {
      const event = new InMemoryEventEmitter();

      await event.prepare();

      expect(event["listeners"]).toBeDefined();
    });
  });

  describe("cleanup", () => {
    it("Should unset listeners", async () => {
      const event = new InMemoryEventEmitter();

      await event.cleanup();

      expect(event["listeners"]?.size).toBe(0);
    });
  });

  describe("on", () => {
    it("Should set listener", async () => {
      const event = new InMemoryEventEmitter();

      await event.prepare();

      const spy = jest.fn();

      await event.on("group", "test", spy);

      expect(event["listeners"]?.has("test")).toBeTruthy();
      expect(event["listeners"]?.get("test")?.get("group")).toStrictEqual(spy);
    });

    it("Should replace listener", async () => {
      const event = new InMemoryEventEmitter();

      await event.prepare();

      const spy = jest.fn();
      const spy2 = jest.fn();

      await event.on("group", "test", spy);
      await event.on("group", "test", spy2);

      expect(event["listeners"].has("test")).toBeTruthy();
      expect(event["listeners"].get("test")?.get("group")).toStrictEqual(spy2);
    });
  });

  describe("off", () => {
    it("Should unset listener", async () => {
      const event = new InMemoryEventEmitter();

      await event.prepare();

      const spy = jest.fn();

      await event.on("group", "test", spy);

      expect(event["listeners"]?.has("test")).toBeTruthy();
      expect(event["listeners"]?.get("test")?.get("group")).toStrictEqual(spy);

      await event.off("group", "test", spy);

      expect(event["listeners"]?.has("test")).toBeTruthy();
      expect(event["listeners"]?.get("test")?.get("group")).toBeUndefined();
    });

    it("Should not unset listener when event does not exist", async () => {
      const event = new InMemoryEventEmitter();

      await event.prepare();

      const spy = jest.fn();

      await event.off("group", "test", spy);

      expect(event["listeners"].has("test")).toBeFalsy();
    });

    it("Should not unset listener when event already unset", async () => {
      const event = new InMemoryEventEmitter();

      await event.prepare();

      const spy = jest.fn();

      await event.on("group", "test", spy);

      await event.off("group", "test", spy);
      await event.off("group", "test", spy);

      expect(event["listeners"]?.has("test")).toBeTruthy();
      expect(event["listeners"]?.get("test")?.get("group")).toBeUndefined();
    });

    it("Should not unset listener when event already unset", async () => {
      const event = new InMemoryEventEmitter();

      await event.prepare();

      const spy = jest.fn();
      const spy2 = jest.fn();

      await event.on("group", "test", spy);

      await event.off("group", "test", spy2);

      expect(event["listeners"]?.has("test")).toBeTruthy();
      expect(event["listeners"]?.get("test")?.get("group")).toBe(spy);
    });
  });

  describe("emit", () => {
    it("Should call listener", async () => {
      const event = new InMemoryEventEmitter();

      await event.prepare();

      const spy = jest.fn();

      await event.on("groupId", "test", spy);

      expect(event["listeners"]?.has("test")).toBeTruthy();

      const groups = event["listeners"]!.get("test")!;
      expect(groups.get("groupId")).toStrictEqual(spy);

      await event.emit("test", ["value", "other"]);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith("value", "other");
    });

    it("Should not call listener when no listeners", async () => {
      const event = new InMemoryEventEmitter();

      await event.prepare();

      expect(() => event.emit("test", ["value", "other"])).not.toThrow();
    });

    it("Should log error and ot throw when listener fails", async () => {
      const event = new InMemoryEventEmitter();
      const logger = { error: jest.fn() };

      event.setLogger(logger as any);
      await event.prepare();

      const spy = jest.fn().mockRejectedValue(new Error("test error"));

      await event.on("groupId", "test", spy);

      expect(event["listeners"]?.has("test")).toBeTruthy();

      const groups = event["listeners"]!.get("test")!;
      expect(groups.get("groupId")).toStrictEqual(spy);

      await event.emit("test", ["value", "other"]);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith("value", "other");

      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        "Unexpected error in event listener",
        {
          details: {
            error: {
              message: "test error",
            },
            event: "test",
          },
          message: "An unexpected error occured",
          name: "unexpected",
        }
      );
    });
  });
});
