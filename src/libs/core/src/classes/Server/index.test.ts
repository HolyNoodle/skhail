/**
 * @group unit
 */
import { SkhailServer } from ".";
import { SkhailClient } from "../Client";
import { SkhailService } from "../Service";
import * as utils from "./utils";

jest.mock("../Client");

class TestService extends SkhailService {
  static identifier = "Test";

  spy: any;
  internalTest() {
    (this["spy"] as any)(this);
    return Promise.resolve();
  }
}

describe("SkhailServer", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    TestService["alwaysManaged"] = false;
  });

  it("Should instantiate server", () => {
    const logger = {
      clone: jest.fn().mockReturnThis(),
    } as any;
    const queue = {} as any;
    const server = new SkhailServer({
      logger,
      queue,
      services: [new TestService()],
    });

    expect(SkhailClient).toHaveBeenCalledTimes(1);
    expect(SkhailClient).toHaveBeenCalledWith({
      logger,
      queue,
    });
    expect(server).toBeInstanceOf(SkhailServer);
    expect(server["client"]).toBeInstanceOf(SkhailClient);
  });

  describe("start", () => {
    it("Should call logger prepare", async () => {
      const logger = {
        setScope: jest.fn(),
        clone: jest.fn().mockReturnThis(),
        prepare: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
        setService: jest.fn(),
      } as any;
      const queue = { setLogger: jest.fn(), setHandler: jest.fn() } as any;
      const server = new SkhailServer({
        logger,
        queue,
        services: [new TestService()],
      });

      await server.start();

      expect(logger.prepare).toHaveBeenCalledTimes(1);
      expect(logger.prepare).toHaveBeenCalledWith();
    });

    it("Should call queue prepare", async () => {
      const logger = {
        setScope: jest.fn(),
        clone: jest.fn().mockReturnThis(),
        info: jest.fn(),
        debug: jest.fn(),
        setService: jest.fn(),
      } as any;
      const queue = {
        prepare: jest.fn(),
        setLogger: jest.fn(),
        setHandler: jest.fn(),
      } as any;
      const server = new SkhailServer({
        logger,
        queue,
        services: [new TestService()],
      });

      await server.start();

      expect(queue.prepare).toHaveBeenCalledTimes(1);
      expect(queue.prepare).toHaveBeenCalledWith();
    });

    it("Should call event prepare", async () => {
      const logger = {
        setScope: jest.fn(),
        clone: jest.fn().mockReturnThis(),
        info: jest.fn(),
        debug: jest.fn(),
        setService: jest.fn(),
      } as any;
      const queue = {
        setLogger: jest.fn(),
        setHandler: jest.fn(),
      } as any;
      const event = {
        prepare: jest.fn(),
        setLogger: jest.fn(),
        setHandler: jest.fn(),
      } as any;
      const server = new SkhailServer({
        logger,
        queue,
        event,
        services: [new TestService()],
      });

      await server.start();

      expect(event.prepare).toHaveBeenCalledTimes(1);
      expect(event.prepare).toHaveBeenCalledWith();
    });

    it("Should call service prepare", async () => {
      const logger = {
        setScope: jest.fn(),
        clone: jest.fn().mockReturnThis(),
        info: jest.fn(),
        debug: jest.fn(),
        setService: jest.fn(),
      } as any;
      const queue = {
        setLogger: jest.fn(),
        setHandler: jest.fn(),
      } as any;
      const service = new TestService();
      service["prepare"] = jest.fn();
      const server = new SkhailServer({
        logger,
        queue,
        services: [service],
      });

      await server.start();

      expect(service.prepare).toHaveBeenCalledTimes(1);
      expect(service.prepare).toHaveBeenCalledWith();
    });

    it("Should call service ready", async () => {
      const logger = {
        setScope: jest.fn(),
        clone: jest.fn().mockReturnThis(),
        info: jest.fn(),
        debug: jest.fn(),
        setService: jest.fn(),
      } as any;
      const queue = {
        setLogger: jest.fn(),
        setHandler: jest.fn(),
      } as any;
      const service = new TestService();
      service["ready"] = jest.fn();
      const server = new SkhailServer({
        logger,
        queue,
        services: [service],
      });

      await server.start();

      expect(service.ready).toHaveBeenCalledTimes(1);
      expect(service.ready).toHaveBeenCalledWith();
    });

    it("Should not call service prepare when service is not managed", async () => {
      const logger = {
        setScope: jest.fn(),
        clone: jest.fn().mockReturnThis(),
        info: jest.fn(),
        debug: jest.fn(),
        setService: jest.fn(),
      } as any;
      const queue = {
        setLogger: jest.fn(),
        setHandler: jest.fn(),
      } as any;
      const service = new TestService();
      service["prepare"] = jest.fn();
      const server = new SkhailServer({
        logger,
        queue,
        services: [service],
        manage: [],
      });

      await server.start();

      expect(service.prepare).toHaveBeenCalledTimes(0);
    });

    it("Should call service prepare when service is always managed", async () => {
      const logger = {
        setScope: jest.fn(),
        clone: jest.fn().mockReturnThis(),
        info: jest.fn(),
        debug: jest.fn(),
        setService: jest.fn(),
      } as any;
      const queue = {
        setLogger: jest.fn(),
        setHandler: jest.fn(),
      } as any;
      const service = new TestService();
      TestService["alwaysManaged"] = true;
      service["prepare"] = jest.fn();
      const server = new SkhailServer({
        logger,
        queue,
        services: [service],
        manage: [],
      });

      await server.start();

      expect(service.prepare).toHaveBeenCalledTimes(1);
    });

    it("Should call middleware prepare", async () => {
      const handler = jest.fn();

      const logger = {
        setScope: jest.fn(),
        clone: jest.fn().mockReturnThis(),
        info: jest.fn(),
        debug: jest.fn(),
        setService: jest.fn(),
      } as any;
      const queue = {
        setLogger: jest.fn(),
        setHandler: jest.fn(),
      } as any;

      const service = new TestService();
      const middleware = {
        id: "test",
        process: jest.fn(),
        prepare: jest.fn(),
      };
      TestService["middlewares"] = [middleware];

      const server = new SkhailServer({
        logger,
        queue,
        services: [service],
      });

      await server.start();

      expect(middleware.prepare).toHaveBeenCalledTimes(1);
      expect(middleware.prepare).toHaveBeenCalledWith(service);
    });

    it("Should call queue setHandler", async () => {
      const handler = jest.fn();
      const wrapSpy = jest
        .spyOn(utils, "handleServiceCall")
        .mockReturnValue(handler);

      const logger = {
        setScope: jest.fn(),
        clone: jest.fn().mockReturnThis(),
        info: jest.fn(),
        debug: jest.fn(),
        setService: jest.fn(),
      } as any;
      const queue = {
        setLogger: jest.fn(),
        setHandler: jest.fn(),
      } as any;
      const server = new SkhailServer({
        logger,
        queue,
        services: [new TestService()],
      });

      await server.start();

      expect(queue.setHandler).toHaveBeenCalledTimes(1);
      expect(queue.setHandler).toHaveBeenCalledWith(
        TestService.identifier,
        handler
      );
    });
  });

  describe("stop", () => {
    it("Should call logger cleanup", async () => {
      const logger = {
        setScope: jest.fn(),
        clone: jest.fn().mockReturnThis(),
        cleanup: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
        setService: jest.fn(),
      } as any;
      const queue = { setLogger: jest.fn(), setHandler: jest.fn() } as any;
      const server = new SkhailServer({
        logger,
        queue,
        services: [new TestService()],
      });

      await server.stop();

      expect(logger.cleanup).toHaveBeenCalledTimes(1);
      expect(logger.cleanup).toHaveBeenCalledWith();
    });

    it("Should call queue cleanup", async () => {
      const logger = {
        setScope: jest.fn(),
        clone: jest.fn().mockReturnThis(),
        info: jest.fn(),
        debug: jest.fn(),
        setService: jest.fn(),
      } as any;
      const queue = {
        cleanup: jest.fn(),
        setLogger: jest.fn(),
        setHandler: jest.fn(),
      } as any;
      const server = new SkhailServer({
        logger,
        queue,
        services: [new TestService()],
      });

      await server.stop();

      expect(queue.cleanup).toHaveBeenCalledTimes(1);
      expect(queue.cleanup).toHaveBeenCalledWith();
    });

    it("Should call event cleanup", async () => {
      const logger = {
        setScope: jest.fn(),
        clone: jest.fn().mockReturnThis(),
        info: jest.fn(),
        debug: jest.fn(),
        setService: jest.fn(),
      } as any;
      const queue = {
        setLogger: jest.fn(),
        setHandler: jest.fn(),
      } as any;
      const event = {
        cleanup: jest.fn(),
        setLogger: jest.fn(),
        setHandler: jest.fn(),
      } as any;
      const server = new SkhailServer({
        logger,
        queue,
        event,
        services: [new TestService()],
      });

      await server.stop();

      expect(event.cleanup).toHaveBeenCalledTimes(1);
      expect(event.cleanup).toHaveBeenCalledWith();
    });

    it("Should call service cleanup", async () => {
      const logger = {
        setScope: jest.fn(),
        clone: jest.fn().mockReturnThis(),
        info: jest.fn(),
        debug: jest.fn(),
        setService: jest.fn(),
      } as any;
      const queue = {
        setLogger: jest.fn(),
        setHandler: jest.fn(),
      } as any;
      const service = new TestService();
      service["cleanup"] = jest.fn().mockResolvedValue(undefined);
      const server = new SkhailServer({
        logger,
        queue,
        services: [service],
      });

      await server.stop();

      expect(service.cleanup).toHaveBeenCalledTimes(1);
      expect(service.cleanup).toHaveBeenCalledWith();
    });

    it("Should  log error and continue service cleanup when cleanup fails", async () => {
      const logger = {
        setScope: jest.fn(),
        clone: jest.fn().mockReturnThis(),
        info: jest.fn(),
        debug: jest.fn(),
        setService: jest.fn(),
        error: jest.fn(),
      } as any;
      const queue = {
        setLogger: jest.fn(),
        setHandler: jest.fn(),
      } as any;
      const service = new TestService();
      service["cleanup"] = jest.fn().mockRejectedValue("test error");
      const server = new SkhailServer({
        logger,
        queue,
        services: [service],
      });

      await server.stop();

      expect(service.cleanup).toHaveBeenCalledTimes(1);
      expect(service.cleanup).toHaveBeenCalledWith();
      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith("Error while cleanup service", {
        error: {
          details: {},
          message: "test error",
          name: "unexpected",
        },
        service: "Test",
      });
    });

    it("Should not call service cleanup when service is not managed", async () => {
      const logger = {
        setScope: jest.fn(),
        clone: jest.fn().mockReturnThis(),
        info: jest.fn(),
        debug: jest.fn(),
        setService: jest.fn(),
      } as any;
      const queue = {
        setLogger: jest.fn(),
        setHandler: jest.fn(),
      } as any;
      const service = new TestService();
      service["cleanup"] = jest.fn();
      const server = new SkhailServer({
        logger,
        queue,
        services: [service],
        manage: [],
      });

      await server.stop();

      expect(service.cleanup).toHaveBeenCalledTimes(0);
    });

    it("Should call service cleanup when service is always managed", async () => {
      const logger = {
        setScope: jest.fn(),
        clone: jest.fn().mockReturnThis(),
        info: jest.fn(),
        debug: jest.fn(),
        setService: jest.fn(),
      } as any;
      const queue = {
        setLogger: jest.fn(),
        setHandler: jest.fn(),
      } as any;
      const service = new TestService();
      TestService["alwaysManaged"] = true;
      service["cleanup"] = jest.fn().mockResolvedValue(undefined);
      const server = new SkhailServer({
        logger,
        queue,
        services: [service],
        manage: [],
      });

      await server.stop();

      expect(service.cleanup).toHaveBeenCalledTimes(1);
    });

    it("Should call middleware cleanup", async () => {
      const logger = {
        setScope: jest.fn(),
        clone: jest.fn().mockReturnThis(),
        info: jest.fn(),
        debug: jest.fn(),
        setService: jest.fn(),
      } as any;
      const queue = {
        setLogger: jest.fn(),
        setHandler: jest.fn(),
      } as any;
      const service = new TestService();

      const middleware = {
        id: "test",
        process: jest.fn(),
        cleanup: jest.fn(),
      };
      TestService["middlewares"] = [middleware];

      const server = new SkhailServer({
        logger,
        queue,
        services: [service],
      });

      await server.stop();

      expect(middleware.cleanup).toHaveBeenCalledTimes(1);
      expect(middleware.cleanup).toHaveBeenCalledWith(service);
    });
  });

  describe("get", () => {
    it("Should call client get", () => {
      const logger = {
        setScope: jest.fn(),
        clone: jest.fn().mockReturnThis(),
        info: jest.fn(),
        debug: jest.fn(),
        setService: jest.fn(),
      } as any;
      const queue = { setLogger: jest.fn(), setHandler: jest.fn() } as any;
      const server = new SkhailServer({
        logger,
        queue,
        services: [new TestService()],
      });

      const expectedProxy = {};
      const spy = jest.fn().mockReturnValue(expectedProxy);
      server["client"]["get"] = spy;

      const proxy = server.get(TestService);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(TestService, undefined, undefined);
      expect(proxy).toBe(expectedProxy);
    });

    it("Should call client get with context", () => {
      const logger = {
        setScope: jest.fn(),
        clone: jest.fn().mockReturnThis(),
        info: jest.fn(),
        debug: jest.fn(),
        setService: jest.fn(),
      } as any;
      const queue = { setLogger: jest.fn(), setHandler: jest.fn() } as any;
      const server = new SkhailServer({
        logger,
        queue,
        services: [new TestService()],
      });

      const expectedProxy = {};
      const spy = jest.fn().mockReturnValue(expectedProxy);
      server["client"]["get"] = spy;

      const proxy = server.get(TestService, { context: "test" });

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(
        TestService,
        { context: "test" },
        undefined
      );
      expect(proxy).toBe(expectedProxy);
    });

    it("Should call client get with context and forwarded context", () => {
      const logger = {
        setScope: jest.fn(),
        clone: jest.fn().mockReturnThis(),
        info: jest.fn(),
        debug: jest.fn(),
        setService: jest.fn(),
      } as any;
      const queue = { setLogger: jest.fn(), setHandler: jest.fn() } as any;
      const server = new SkhailServer({
        logger,
        queue,
        services: [new TestService()],
      });

      const expectedProxy = {};
      const spy = jest.fn().mockReturnValue(expectedProxy);
      server["client"]["get"] = spy;

      const proxy = server.get(TestService, { context: "test" }, {
        forwarded: "context",
      } as any);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(
        TestService,
        { context: "test" },
        { forwarded: "context" }
      );
      expect(proxy).toBe(expectedProxy);
    });
  });

  describe("getQueue", () => {
    it("Should return queue", () => {
      const logger = {
        setScope: jest.fn(),
        clone: jest.fn().mockReturnThis(),
        info: jest.fn(),
        debug: jest.fn(),
        setService: jest.fn(),
      } as any;
      const queue = { setLogger: jest.fn(), setHandler: jest.fn() } as any;
      const server = new SkhailServer({
        logger,
        queue,
        services: [new TestService()],
      });

      const result = server.getQueue();

      expect(result).toBe(queue);
    });
  });

  describe("getEmitter", () => {
    it("Should return emitter", () => {
      const logger = {
        setScope: jest.fn(),
        clone: jest.fn().mockReturnThis(),
        info: jest.fn(),
        debug: jest.fn(),
        setService: jest.fn(),
      } as any;
      const event = { setLogger: jest.fn(), setHandler: jest.fn() } as any;
      const queue = { setLogger: jest.fn(), setHandler: jest.fn() } as any;
      const server = new SkhailServer({
        logger,
        queue,
        event,
        services: [new TestService()],
      });

      const result = server.getEmitter();

      expect(result).toBe(event);
    });

    it("Should return undefined", () => {
      const logger = {
        setScope: jest.fn(),
        clone: jest.fn().mockReturnThis(),
        info: jest.fn(),
        debug: jest.fn(),
        setService: jest.fn(),
      } as any;
      const queue = { setLogger: jest.fn(), setHandler: jest.fn() } as any;
      const server = new SkhailServer({
        logger,
        queue,
        services: [new TestService()],
      });

      const result = server.getEmitter();

      expect(result).toBeUndefined();
    });
  });

  describe("getClient", () => {
    it("Should return client", () => {
      const logger = {
        setScope: jest.fn(),
        clone: jest.fn().mockReturnThis(),
        info: jest.fn(),
        debug: jest.fn(),
        setService: jest.fn(),
      } as any;
      const queue = { setLogger: jest.fn(), setHandler: jest.fn() } as any;
      const server = new SkhailServer({
        logger,
        queue,
        services: [new TestService()],
      });

      const result = server.getClient();

      expect(result).toBeInstanceOf(SkhailClient);
    });
  });

  describe("matchServiceWithWildCard", () => {
    it("Should return true when service exactly matches", () => {
      const result = SkhailServer.prototype["matchServiceWithWildCard"](
        "test",
        "test"
      );

      expect(result).toBe(true);
    });

    it("Should return true when service matches wildcard", () => {
      const result = SkhailServer.prototype["matchServiceWithWildCard"](
        "test*",
        "test:something"
      );

      expect(result).toBe(true);
    });

    it("Should return true when service match wildcard", () => {
      const result = SkhailServer.prototype["matchServiceWithWildCard"](
        "test*",
        "test"
      );

      expect(result).toBe(true);
    });

    it("Should return false when service doesn't match wildcard", () => {
      const result = SkhailServer.prototype["matchServiceWithWildCard"](
        "test*",
        "tast:something"
      );

      expect(result).toBe(false);
    });
    it("Should return false when service doesn't match", () => {
      const result = SkhailServer.prototype["matchServiceWithWildCard"](
        "test",
        "other"
      );

      expect(result).toBe(false);
    });

    it("Should return true when service matches using suffix", () => {
      const result = SkhailServer.prototype["matchServiceWithWildCard"](
        "test*other",
        "test:Yay:other"
      );

      expect(result).toBe(true);
    });

    it("Should return false when service doesn't match suffix", () => {
      const result = SkhailServer.prototype["matchServiceWithWildCard"](
        "test*other",
        "test:Yay:true"
      );

      expect(result).toBe(false);
    });

    it("Should return false when wildcard isn't simple enough", () => {
      const result = SkhailServer.prototype["matchServiceWithWildCard"](
        "test*other*",
        "test:Yay:other"
      );

      expect(result).toBe(false);
    });
  });

  describe("getManagedServices", () => {
    class TestService2 extends SkhailService {
      static identifier = "Test2";
    }
    class TestService3 extends SkhailService {
      static identifier = "Test3";
      static alwaysManaged = true;
    }

    it("Should return all services when matchServiceWithWildCard returns true", () => {
      const logger = {
        setScope: jest.fn(),
        clone: jest.fn().mockReturnThis(),
        info: jest.fn(),
        debug: jest.fn(),
        setService: jest.fn(),
      } as any;
      const queue = { setLogger: jest.fn(), setHandler: jest.fn() } as any;
      const server = new SkhailServer({
        logger,
        queue,
        services: [new TestService(), new TestService2()],
        manage: ["Yo"],
      });
      server["matchServiceWithWildCard"] = jest.fn().mockReturnValue(true);

      const result = server["getManagedServices"]();

      expect(result).toStrictEqual([new TestService(), new TestService2()]);

      expect(server["matchServiceWithWildCard"]).toHaveBeenCalledTimes(2);
      expect(server["matchServiceWithWildCard"]).toHaveBeenNthCalledWith(
        1,
        "Yo",
        "Test"
      );
      expect(server["matchServiceWithWildCard"]).toHaveBeenNthCalledWith(
        2,
        "Yo",
        "Test2"
      );
    });

    it("Should return no service when matchServiceWithWildCard returns false", () => {
      const logger = {
        setScope: jest.fn(),
        clone: jest.fn().mockReturnThis(),
        info: jest.fn(),
        debug: jest.fn(),
        setService: jest.fn(),
      } as any;
      const queue = { setLogger: jest.fn(), setHandler: jest.fn() } as any;
      const server = new SkhailServer({
        logger,
        queue,
        services: [new TestService(), new TestService2()],
        manage: ["Yo"],
      });
      server["matchServiceWithWildCard"] = jest.fn().mockReturnValue(false);

      const result = server["getManagedServices"]();

      expect(result).toStrictEqual([]);

      expect(server["matchServiceWithWildCard"]).toHaveBeenCalledTimes(2);
      expect(server["matchServiceWithWildCard"]).toHaveBeenNthCalledWith(
        1,
        "Yo",
        "Test"
      );
      expect(server["matchServiceWithWildCard"]).toHaveBeenNthCalledWith(
        2,
        "Yo",
        "Test2"
      );
    });

    it("Should return only managed services", () => {
      const logger = {
        setScope: jest.fn(),
        clone: jest.fn().mockReturnThis(),
        info: jest.fn(),
        debug: jest.fn(),
        setService: jest.fn(),
      } as any;
      const queue = { setLogger: jest.fn(), setHandler: jest.fn() } as any;
      const server = new SkhailServer({
        logger,
        queue,
        services: [new TestService(), new TestService2(), new TestService3()],
        manage: ["Yo"],
      });
      server["matchServiceWithWildCard"] = jest.fn().mockReturnValue(false);

      const result = server["getManagedServices"]();

      expect(result).toStrictEqual([new TestService3()]);

      expect(server["matchServiceWithWildCard"]).toHaveBeenCalledTimes(2);
      expect(server["matchServiceWithWildCard"]).toHaveBeenNthCalledWith(
        1,
        "Yo",
        "Test"
      );
      expect(server["matchServiceWithWildCard"]).toHaveBeenNthCalledWith(
        2,
        "Yo",
        "Test2"
      );
    });
  });
});
