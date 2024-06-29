/**
 * @group unit
 */
import { SkhailClient } from ".";
import { LogLevel } from "../../types";
import { InMemoryEventEmitter } from "../Event";
import { ConsoleLogger } from "../Logger/ConsoleLogger";
import { InMemoryQueue } from "../Queue";
import { SkhailService } from "../Service";
import * as utils from "./utils";

jest.mock("../Logger/ConsoleLogger");
jest.mock("../Queue");
jest.mock("../Event");

class TestService extends SkhailService<any> {
  static identifier: string = "TestService";
}

describe("SkhailClient", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("Should instantiate the client", () => {
    const client = new SkhailClient({
      logger: new ConsoleLogger([LogLevel.ERROR]),
      queue: new InMemoryQueue(),
    });

    expect(client).toBeInstanceOf(SkhailClient);
  });

  it("Should start the client", async () => {
    let logger = new ConsoleLogger([LogLevel.ERROR]);
    (logger as any).prepare = jest.fn();
    (
      InMemoryQueue.prototype.prepare as any as jest.SpyInstance
    ).mockResolvedValue("");
    (
      InMemoryEventEmitter.prototype.prepare as any as jest.SpyInstance
    ).mockResolvedValue("");
    const client = new SkhailClient({
      logger,
      queue: new InMemoryQueue(),
      event: new InMemoryEventEmitter(),
    });

    await client.start();

    expect((logger as any).prepare).toHaveBeenCalledTimes(1);
    expect((logger as any).prepare).toHaveBeenCalledWith();
    expect(InMemoryQueue.prototype.prepare).toHaveBeenCalledTimes(1);
    expect(InMemoryQueue.prototype.prepare).toHaveBeenCalledWith();
    expect(InMemoryEventEmitter.prototype.prepare).toHaveBeenCalledTimes(1);
    expect(InMemoryEventEmitter.prototype.prepare).toHaveBeenCalledWith();
  });

  it("Should stop the client", async () => {
    let logger = new ConsoleLogger([LogLevel.ERROR]);
    (logger as any).cleanup = jest.fn();
    (
      InMemoryQueue.prototype.cleanup as any as jest.SpyInstance
    ).mockResolvedValue("");
    (
      InMemoryEventEmitter.prototype.cleanup as any as jest.SpyInstance
    ).mockResolvedValue("");
    const client = new SkhailClient({
      logger,
      queue: new InMemoryQueue(),
      event: new InMemoryEventEmitter(),
    });

    await client.stop();

    expect((logger as any).cleanup).toHaveBeenCalledTimes(1);
    expect((logger as any).cleanup).toHaveBeenCalledWith();
    expect(InMemoryQueue.prototype.cleanup).toHaveBeenCalledTimes(1);
    expect(InMemoryQueue.prototype.cleanup).toHaveBeenCalledWith();
    expect(InMemoryEventEmitter.prototype.cleanup).toHaveBeenCalledTimes(1);
    expect(InMemoryEventEmitter.prototype.cleanup).toHaveBeenCalledWith();
  });

  it("Should not prepare the queue", async () => {
    let queue = new InMemoryQueue();
    (queue as any).prepare = undefined;
    (
      InMemoryEventEmitter.prototype.prepare as any as jest.SpyInstance
    ).mockResolvedValue("");
    const client = new SkhailClient({
      logger: new ConsoleLogger([LogLevel.ERROR]),
      queue: queue,
    });

    await client.start();
  });

  it("Should not cleanup the queue", async () => {
    let queue = new InMemoryQueue();
    (queue as any).cleanup = undefined;
    (
      InMemoryEventEmitter.prototype.cleanup as any as jest.SpyInstance
    ).mockResolvedValue("");
    const client = new SkhailClient({
      logger: new ConsoleLogger([LogLevel.ERROR]),
      queue: queue,
    });

    await client.stop();
  });

  it("Should start the client when event emitter is undefined", async () => {
    (
      InMemoryQueue.prototype.prepare as any as jest.SpyInstance
    ).mockResolvedValue("");
    (
      InMemoryEventEmitter.prototype.prepare as any as jest.SpyInstance
    ).mockResolvedValue("");
    const client = new SkhailClient({
      logger: new ConsoleLogger([LogLevel.ERROR]),
      queue: new InMemoryQueue(),
    });

    await client.start();

    expect(InMemoryQueue.prototype.prepare).toHaveBeenCalledTimes(1);
    expect(InMemoryQueue.prototype.prepare).toHaveBeenCalledWith();
    expect(InMemoryEventEmitter.prototype.prepare).toHaveBeenCalledTimes(0);
  });

  it("Should stop the client when event emitter is undefined", async () => {
    (
      InMemoryQueue.prototype.cleanup as any as jest.SpyInstance
    ).mockResolvedValue("");
    (
      InMemoryEventEmitter.prototype.cleanup as any as jest.SpyInstance
    ).mockResolvedValue("");
    const client = new SkhailClient({
      logger: new ConsoleLogger([LogLevel.ERROR]),
      queue: new InMemoryQueue(),
    });

    await client.stop();

    expect(InMemoryQueue.prototype.cleanup).toHaveBeenCalledTimes(1);
    expect(InMemoryQueue.prototype.cleanup).toHaveBeenCalledWith();
    expect(InMemoryEventEmitter.prototype.cleanup).toHaveBeenCalledTimes(0);
  });

  it("Should return service proxy", () => {
    const expectedProxy = {};
    const logger = new ConsoleLogger([LogLevel.ERROR]);
    const queue = new InMemoryQueue();
    const event = new InMemoryEventEmitter();
    const createProxySpy = jest
      .spyOn(utils, "createServiceProxy")
      .mockReturnValue(expectedProxy as any);
    const client = new SkhailClient({
      logger,
      queue,
      event,
    });

    const proxy = client.get(TestService);

    expect(createProxySpy).toHaveBeenCalledTimes(1);
    expect(createProxySpy).toHaveBeenCalledWith(
      TestService,
      logger,
      queue,
      undefined,
      undefined
    );
    expect(proxy).toBe(expectedProxy);
  });

  it("Should return service proxy with context", () => {
    const expectedProxy = {};
    const logger = new ConsoleLogger([LogLevel.ERROR]);
    const queue = new InMemoryQueue();
    const event = new InMemoryEventEmitter();
    const createProxySpy = jest
      .spyOn(utils, "createServiceProxy")
      .mockReturnValue(expectedProxy as any);
    const client = new SkhailClient({
      logger,
      queue,
      event,
    });

    const proxy = client.get(TestService, { test: "Context" });

    expect(createProxySpy).toHaveBeenCalledTimes(1);
    expect(createProxySpy).toHaveBeenCalledWith(
      TestService,
      logger,
      queue,
      { test: "Context" },
      undefined
    );
    expect(proxy).toBe(expectedProxy);
  });

  it("Should return service proxy with context and forwarded", () => {
    const expectedProxy = {};
    const logger = new ConsoleLogger([LogLevel.ERROR]);
    const queue = new InMemoryQueue();
    const event = new InMemoryEventEmitter();
    const createProxySpy = jest
      .spyOn(utils, "createServiceProxy")
      .mockReturnValue(expectedProxy as any);
    const client = new SkhailClient({
      logger,
      queue,
      event,
    });

    const proxy = client.get(TestService, { test: "Context" }, {
      forwarded: true,
    } as any);

    expect(createProxySpy).toHaveBeenCalledTimes(1);
    expect(createProxySpy).toHaveBeenCalledWith(
      TestService,
      logger,
      queue,
      { test: "Context" },
      { forwarded: true }
    );
    expect(proxy).toBe(expectedProxy);
  });
});
