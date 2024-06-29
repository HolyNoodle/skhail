/**
 * @group unit
 */
import { createServiceProxy } from "./utils";
import { SkhailService } from "../Service";
import { ConsoleLogger } from "../Logger/ConsoleLogger";
import { InMemoryQueue } from "../Queue";
import { SkhailError } from "../Error";
import { LogLevel } from "../../types";
import * as uuid from "uuid";

jest.mock("uuid");

jest.mock("../Logger/ConsoleLogger");
jest.mock("../Queue");
jest.mock("../Event");

interface AppContext {
  contextProperty: string;
}

type ServiceEvent = { eventName: [string] };

class TestService extends SkhailService<AppContext, ServiceEvent> {
  static identifier: string = "TestService";

  async testMethod(params: string) {
    return Promise.resolve("test");
  }

  async testEvent() {
    this.network.emit("eventName", ["test event"]);
  }
}

describe("createServiceProxy", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("Should call queue", async () => {
    const expectedResult = "test mock";
    (
      InMemoryQueue.prototype.enqueue as any as jest.SpyInstance
    ).mockResolvedValue({
      success: true,
      response: expectedResult,
    });

    (uuid.v4 as any as jest.SpyInstance).mockReturnValue("test transaction id");

    const proxy = createServiceProxy<TestService, AppContext>(
      TestService,
      new ConsoleLogger([LogLevel.ERROR]),
      new InMemoryQueue(),
      {
        contextProperty: "yay",
      }
    );

    const result = await proxy.testMethod("parameter");

    expect(result).toBe(expectedResult);
    expect(InMemoryQueue.prototype.enqueue).toHaveBeenCalledTimes(1);
    expect(InMemoryQueue.prototype.enqueue).toHaveBeenCalledWith({
      args: ["parameter"],
      context: {
        tid: "test transaction id",
        data: { contextProperty: "yay" },
        parent: undefined,
      },
      method: "testMethod",
      service: "TestService",
    });
  });

  it("Should throw error when queue rejects", async () => {
    (
      InMemoryQueue.prototype.enqueue as any as jest.SpyInstance
    ).mockResolvedValue({
      success: false,
      error: { message: "test call error", name: "unexpected" },
    });

    const proxy = createServiceProxy<TestService, AppContext>(
      TestService,
      new ConsoleLogger([LogLevel.ERROR]),
      new InMemoryQueue()
    );

    await expect(proxy.testMethod("parameter")).rejects.toThrow(
      "test call error"
    );
  });

  it("Should throw error when queue response failed", async () => {
    (
      InMemoryQueue.prototype.enqueue as any as jest.SpyInstance
    ).mockRejectedValue(
      new SkhailError({
        message: "test message",
        name: "unexpected",
        details: { test: "property" },
      })
    );

    const proxy = createServiceProxy<TestService, AppContext>(
      TestService,
      new ConsoleLogger([LogLevel.ERROR]),
      new InMemoryQueue()
    );

    await expect(proxy.testMethod("parameter")).rejects.toThrow("test message");
  });
});
