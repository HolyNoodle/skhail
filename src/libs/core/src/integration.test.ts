/**
 * @group integration
 */
import { v4 } from "uuid";
import {
  ContextOptions,
  EventOptions,
  ILogger,
  LogLevel,
  Middleware,
} from "./types";
import { SkhailError, getAppError } from "./classes/Error";
import { InMemoryEventEmitter } from "./classes/Event";
import { InMemoryQueue } from "./classes/Queue";
import { SkhailServer } from "./classes/Server";
import { EventConsumerService, SkhailService } from "./classes/Service";
import { ConsoleLogger } from "./classes/Logger/ConsoleLogger";

jest.mock("uuid");

(v4 as any as jest.SpyInstance).mockReturnValue("test transaction id");

type AppErrorCode = "test" | "test2";
const AppError = getAppError<AppErrorCode>();

interface AppContext extends ContextOptions {
  granted?: boolean;
}
interface Events extends EventOptions {
  eventName: [string, number];
}

const middlewareObject: Middleware<any> = {
  id: "testMid",
  process: async (enveloppe) => {
    if (enveloppe.method === "middlewareMethod") {
      throw new AppError({ message: "error middleware" });
    }

    return {
      new: "context",
    };
  },
};

class TestService extends SkhailService<AppContext, Events> {
  static identifier = "TestService";
  static middlewares: Middleware<any, any>[] = [middlewareObject];

  async prepare() {
    this.logger.info("init");
  }

  async testMethod(name: string) {
    await this.network.emit("eventName", [name, 12]);

    return { name };
  }

  async otherServiceMethod(name: string) {
    return this.network.get(OtherTestService).testMethod(name);
  }

  async failMethod() {
    throw new AppError({ message: "error message" });
  }

  async nestedFailMethod() {
    return this.network.get(OtherTestService).failMethod("nested");
  }

  async middlewareMethod() {
    return { test: "middleware" };
  }

  async middlewareAllowedMethod() {
    return this.context;
  }

  notServiceMethod(name: string): string {
    return name;
  }

  async nestedContextMethod() {
    return this.network.get(OtherTestService).contextMethod();
  }

  async contextMethod() {
    return this.context.data;
  }

  spy: any;
  async listen() {
    await this.network.on(TestService, "eventName", this.spy);
  }

  async stopListen() {
    await this.network.off(TestService, "eventName", this.spy);
  }

  async otherListen() {
    await this.network.on(OtherTestService, "eventName", this.spy);
  }

  async otherStopListen() {
    await this.network.off(OtherTestService, "eventName", this.spy);
  }

  async functionSpy() {
    this.spy();
  }
}

class OtherTestService extends SkhailService<AppContext, Events> {
  static identifier = "OtherTestService";
  spy: any;

  async testMethod(name: string) {
    await this.network.emit("eventName", [name, 12]);

    return { name };
  }

  async failMethod(name: string) {
    throw new AppError({
      name: "test",
      message: "nested error message, " + name,
    });
  }

  async contextMethod() {
    return this.context.data;
  }
}

const handler = jest.fn();
const ConsumerService = EventConsumerService("ConsumerService")(
  TestService,
  "eventName",
  handler
);
describe("Integration", () => {
  let server: SkhailServer<AppContext>;
  let logger: ILogger;
  const infoLog: jest.SpyInstance = jest.fn();
  const testService = new TestService();

  beforeEach(async () => {
    logger = new ConsoleLogger([LogLevel.ERROR]);

    logger["info"] = infoLog as any;
    server = new SkhailServer({
      services: [testService, new OtherTestService(), new ConsumerService()],
      logger,
      queue: new InMemoryQueue(),
      event: new InMemoryEventEmitter(),
    });

    await server.start();
  });

  afterEach(async () => {
    await server?.stop();
  });

  it("Should prepare service", async () => {
    expect(infoLog).toHaveBeenCalledTimes(4);
    expect(infoLog).toHaveBeenNthCalledWith(1, "Starting skhail server", {
      services: ["TestService", "OtherTestService", "ConsumerService"],
    });
    expect(infoLog).toHaveBeenNthCalledWith(2, "Preparing services");
    expect(infoLog).toHaveBeenNthCalledWith(3, "init");
    expect(infoLog).toHaveBeenNthCalledWith(4, "Server is ready");
  });

  it("Should call service", async () => {
    const result = await server.get(TestService).testMethod("test name");

    expect(result).toStrictEqual({ name: "test name" });
  });

  it("Should call other service method", async () => {
    const result = await server
      .get(TestService)
      .otherServiceMethod("test name");

    expect(result).toStrictEqual({ name: "test name" });
  });
  it("Should trigger event", async () => {
    const spy = jest.fn();
    handler.mockReset();

    testService.spy = spy;

    await server.get(TestService).listen();

    await server.get(TestService).testMethod("test name");

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("test name", 12);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.any(Object),
      [],
      "test name",
      12
    );
  });
  it("Should handle error when consumer service fails", async () => {
    const spy = jest.fn();
    handler.mockReset();

    handler.mockRejectedValueOnce(new Error("error"));
    handler.mockResolvedValue(undefined);

    testService.spy = spy;

    await server.get(TestService).listen();

    await server.get(TestService).testMethod("test name");
    await server.get(TestService).testMethod("test name 2");

    expect(handler).toHaveBeenCalledTimes(2);
  });
  it("Should trigger event on other service", async () => {
    const spy = jest.fn();

    testService.spy = spy;

    await server.get(TestService).otherListen();

    await server.get(OtherTestService).testMethod("test name");

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("test name", 12);
  });
  it("Should not trigger event", async () => {
    const spy = jest.fn();

    testService.spy = spy;

    await server.get(TestService).listen();
    await server.get(TestService).stopListen();

    await server.get(TestService).testMethod("test name");

    expect(spy).toHaveBeenCalledTimes(0);
  });
  it("Should fail on call", async () => {
    let error;
    try {
      await server.get(TestService).failMethod();
    } catch (e: any) {
      error = e;
    }

    expect(error).toBeInstanceOf(SkhailError);
    expect(error.toObject()).toStrictEqual({
      name: "unexpected",
      message: "error message",
      details: {
        service: "TestService",
        method: "failMethod",
      },
    });
  });
  it("Should fail on nested call", async () => {
    let error;
    try {
      await server.get(TestService).nestedFailMethod();
    } catch (e: any) {
      error = e;
    }

    expect(error).toBeInstanceOf(SkhailError);
    expect(error.toObject()).toStrictEqual({
      name: "test",
      message: "nested error message, nested",
      details: {
        service: "TestService",
        method: "nestedFailMethod",
      },
    });
  });

  it("Should fail on not found method", async () => {
    let error;
    try {
      await (server.get(OtherTestService) as any)["testNotFound"](12);
    } catch (e: any) {
      error = e;
    }

    expect(error).toBeInstanceOf(SkhailError);
    expect(error.toObject()).toStrictEqual({
      name: "not_found",
      message: "Method not found",
      details: {
        service: "OtherTestService",
        method: "testNotFound",
      },
    });
  });
  it("Should fail on not found service", async () => {
    let error;
    const notFoundService: any = server.get(
      class TestNotFound extends SkhailService {
        static identifier = "NotFoundService";
      }
    );
    try {
      await notFoundService["testNotFound"](12);
    } catch (e: any) {
      error = e;
    }

    expect(error).toBeInstanceOf(SkhailError);
    expect(error.toObject()).toStrictEqual({
      name: "not_found",
      message: "Service not found",
      details: {
        service: "NotFoundService",
        method: "testNotFound",
        queue: "InMemoryQueue",
      },
    });
  });
  it("Should fail when calling middleware method", async () => {
    await expect(server.get(TestService).middlewareMethod()).rejects.toThrow(
      "error middleware"
    );
  });
  it("Should update enveloppe context when middleware returns context data", async () => {
    await expect(
      server.get(TestService).middlewareAllowedMethod()
    ).resolves.toStrictEqual({
      tid: "test transaction id",
      parent: undefined,
      data: {
        new: "context",
      },
    });
  });

  it("Should use client to get service", async () => {
    await expect(
      server.getClient().get(TestService).testMethod("eventName")
    ).resolves.toStrictEqual({
      name: "eventName",
    });
  });

  it("Should set context on service", async () => {
    const result = await server
      .getClient()
      .get(TestService, {
        prop: "context",
      })
      .contextMethod();

    expect(result).toMatchObject({
      prop: "context",
    });
  });

  it("Should set context on nested service", async () => {
    const result = await server
      .getClient()
      .get(TestService, {
        prop: "context",
      })
      .nestedContextMethod();

    expect(result).toMatchObject({
      prop: "context",
    });
  });

  it("Should call function spy only once", async () => {
    const spy = jest.fn();

    testService.spy = spy;

    await server.getClient().get(TestService).functionSpy();

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
