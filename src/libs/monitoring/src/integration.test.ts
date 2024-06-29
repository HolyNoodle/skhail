/**
 * @group integration
 */

import {
  InMemoryEventEmitter,
  InMemoryQueue,
  LogLevel,
  SkhailServer,
  SkhailService,
} from "@skhail/core";
import { LokiLogger, PromotheusClient } from ".";

import fetch from "node-fetch";

describe("Loki logger integration", () => {
  let logger: LokiLogger;
  beforeAll(async () => {
    logger = new LokiLogger({
      app: "skhail-test",
      batchSize: 5,
      sendBatchTime: 100,
      url: process.env.LOKI_URL || "http://localhost:3100",
      env: "test",
      levels: [LogLevel.TRACE, LogLevel.INFO, LogLevel.ERROR, LogLevel.WARNING],
    });

    jest.spyOn(console, "error").mockImplementation(console.log);
  });

  it("Should send logs to loki", async () => {
    logger.info("test message", { test: "test" });

    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(console.error).not.toHaveBeenCalled();
  });

  describe("Architecture", () => {
    class TestService extends SkhailService {
      static identifier = "TestService";
      async testMethod(name: string) {
        return "test_" + name;
      }

      async errorMethod() {
        throw new Error("test error");
      }

      async longMethod() {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }

    class TestNestedService extends SkhailService {
      static identifier = "TestNestedService";
      async testNestedMethod(name: string) {
        return this.get(TestService).testMethod("nested_" + name);
      }
    }

    let server: SkhailServer;
    let prometheus: PromotheusClient;
    beforeEach(async () => {
      prometheus = new PromotheusClient("test-app", "test-instance");
      server = new SkhailServer({
        services: [new TestNestedService(), new TestService()],
        logger,
        queue: new InMemoryQueue(),
        event: new InMemoryEventEmitter(),
      });

      await prometheus.prepare();
      await server.start();
    });

    afterEach(async () => {
      await server.stop();
      await prometheus.cleanup();
    });

    it("Should call a nested service method", async () => {
      const result = await server
        .getClient()
        .get(TestNestedService)
        .testNestedMethod("test");

      expect(result).toEqual("test_nested_test");
    });

    it("Should log error", async () => {
      await expect(
        server.getClient().get(TestService).errorMethod()
      ).rejects.toThrow();
    });

    it("Should log performances", async () => {
      await expect(
        server.getClient().get(TestService).longMethod()
      ).resolves.toBeUndefined();
    });

    it("Should expose metrics", async () => {
      await expect(fetch("http://localhost:8080")).resolves.toBeDefined();
    });
  });
});
