/**
 * @group integration
 */
import {
  ConsoleLogger,
  LogLevel,
  SkhailError,
  SkhailService,
  SkhailServer,
  EventConsumerService,
  DefinedConstructor,
  BaseHelperService,
  getError,
} from "@skhail/core";

import { AMQPConnection, AMQPEventEmitter, AMQPQueue } from "./src/index";
import * as child_process from "child_process";

process.on("uncaughtException", (e: any) => {
  console.log(getError(e).toObject());
});

abstract class ITestService extends SkhailService<any, { "test-event": any }> {
  static identifier = "TestService";

  abstract testMethod(name: string): Promise<{ name: string }>;
}

class TestService extends ITestService {
  async testMethod(name: string) {
    return { name };
  }
  async testEvent(name: string) {
    await this.network.emit("test-event", [name]);
  }
}
class TestCallService extends SkhailService {
  static identifier = "TestCallService";
  async testMethod(name: string) {
    return this.get(TestService).testMethod("nested_" + name);
  }
}

SkhailError.stack = true;

const getPath = () => {
  const path = process.cwd();

  if (path.endsWith("seed")) {
    return path + "/src/libs/amqp";
  }

  return path;
};

describe("Integration", () => {
  let server: SkhailServer;
  let connection: AMQPConnection;
  let TestService2: DefinedConstructor<BaseHelperService<any>, any[]>;
  let event: jest.Mock;

  beforeEach(async () => {
    child_process.execSync("docker compose start skhail-test-rmq", {
      cwd: getPath(),
    });

    await new Promise((resolve) => setTimeout(resolve, 10000));

    const logger = new ConsoleLogger([
      // LogLevel.DEBUG,
      // LogLevel.TRACE,
      // LogLevel.INFO,
      LogLevel.ERROR,
    ]);
    connection = new AMQPConnection({
      hostname: "localhost",
      port: 5673,
      retryInterval: 5,
      retryAttempts: 2,
      logger,
    });

    event = jest.fn().mockResolvedValue(undefined);

    TestService2 = EventConsumerService("TestService2")(
      TestService,
      "test-event",
      async (...args) => event(...args)
    );

    server = new SkhailServer({
      services: [new TestService(), new TestService2(), new TestCallService()],
      logger,
      queue: new AMQPQueue(connection),
      event: new AMQPEventEmitter(connection),
    });

    await server.start();
  }, 60000);

  afterEach(async () => {
    try {
      await server?.stop();
    } catch (e) {
      console.error(e);
    }

    try {
      await connection?.cleanup();
    } catch (e) {
      console.error(e);
    }
  }, 60000);

  it("should call a service method", async () => {
    const result = await server.get(TestService).testMethod("test");

    expect(result).toEqual({ name: "test" });
  });

  it("should call a nested service method", async () => {
    const result = await server.get(TestCallService).testMethod("test");

    expect(result).toEqual({ name: "nested_test" });
  });

  it("should call a nested service method a lot of times", async () => {
    const num = 1000;
    const result = await Promise.all(
      new Array(num)
        .fill(0)
        .map(() => server.get(TestCallService).testMethod("test"))
    );

    expect(result).toHaveLength(num);
    expect(result.every((i) => i?.name === "nested_test")).toBeTruthy();
  }, 20000);

  it("should emit event", async () => {
    await server.get(TestService).testEvent("test");

    await new Promise((resolve) => {
      let timer: any = null;
      timer = setInterval(() => {
        if (event.mock.calls.length > 0) {
          expect(event).toHaveBeenCalledTimes(1);
          expect(event).toHaveBeenCalledWith(expect.any(Object), [], "test");

          resolve(undefined);
          clearInterval(timer!);
        }
      }, 10);
    });
  });

  it("Should fail call when rmq is totally down", async () => {
    await server.get(TestService).testMethod("test");

    child_process.execSync("docker compose stop skhail-test-rmq", {
      cwd: getPath(),
    });

    await new Promise((resolve) => setTimeout(resolve, 5000));

    await expect(server.get(TestService).testMethod("test")).rejects.toThrow(
      "Max attempts reached while connecting to rabbitmq"
    );
  }, 40000);

  it("Should reconnect when rmq is down", async () => {
    await server.get(TestService).testMethod("test");

    child_process.execSync("docker compose stop skhail-test-rmq", {
      cwd: getPath(),
    });

    child_process.execSync("docker compose start skhail-test-rmq", {
      cwd: getPath(),
    });

    await new Promise((resolve) => setTimeout(resolve, 15000));

    const result = await server.get(TestService).testMethod("test");

    expect(result).toStrictEqual({ name: "test" });
  }, 40000);

  it("Should should fail call when rmq is down at the time of calling", async () => {
    const promise = server.get(TestService).testMethod("test");

    child_process.execSync("docker compose stop skhail-test-rmq", {
      cwd: getPath(),
    });

    await expect(promise).rejects.toThrow("An unexpected error occured");
  }, 40000);
});
