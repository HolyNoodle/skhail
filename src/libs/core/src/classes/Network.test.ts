/**
 * @group unit
 */

import { SkhailClient } from "./Client";
import * as proxyUtils from "./Client/utils";
import { SkhailNetwork } from "./Network";
import { SkhailService } from "./Service";

class TestService extends SkhailService {
  static identifier = "TestService";
}

describe("SkhailNetwork", () => {
  let network: SkhailNetwork<any, any>;
  let owner: SkhailService<any, any>;
  let client: SkhailClient<any>;
  let queue: any;
  let pubsub: any;
  let logger: any;

  beforeEach(() => {
    logger = {
      trace: jest.fn(),
      warning: jest.fn(),
      setTransactionId: jest.fn(),
      clone: jest.fn().mockReturnValue({ ...logger, option: "cloned" }),
    } as any;
    owner = new TestService();
    owner.setLogger(logger);
    queue = { props: "queue" };
    client = {} as any;
    pubsub = {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    };

    network = new SkhailNetwork(owner, logger, client, queue, pubsub);
  });

  describe("on", () => {
    it("should warn if pubsub is not configured", async () => {
      network = new SkhailNetwork(owner, logger, client, queue);

      await network.on(TestService, "test", () => {});

      expect(logger.warning).toHaveBeenCalledTimes(1);
      expect(logger.warning).toHaveBeenCalledWith(
        "Event emitter not configured",
        {
          service: "TestService",
          event: "test",
        }
      );
    });

    it("should register the listener to the pubsub", async () => {
      const listener = jest.fn();

      await network.on(TestService, "test", listener);

      expect(pubsub.on).toHaveBeenCalledTimes(1);
      expect(pubsub.on).toHaveBeenCalledWith(
        TestService.identifier,
        "TestService:test",
        listener
      );
    });
  });

  describe("off", () => {
    it("should throw an error if pubsub is not configured", async () => {
      network = new SkhailNetwork(owner, logger, client, queue);

      await network.off(TestService, "test", () => {});

      expect(logger.warning).toHaveBeenCalledTimes(1);
      expect(logger.warning).toHaveBeenCalledWith(
        "Event emitter not configured",
        {
          service: "TestService",
          event: "test",
        }
      );
    });

    it("should unregister the listener from the pubsub", async () => {
      const listener = jest.fn();

      await network.off(TestService, "test", listener);

      expect(pubsub.off).toHaveBeenCalledTimes(1);
      expect(pubsub.off).toHaveBeenCalledWith(
        TestService.identifier,
        "TestService:test",
        listener
      );
    });
  });

  describe("emit", () => {
    it("should warn if pubsub is not configured", async () => {
      network = new SkhailNetwork(owner, logger, client, queue);

      await network.emit("test", {});

      expect(logger.warning).toHaveBeenCalledTimes(1);
      expect(logger.warning).toHaveBeenCalledWith(
        "Event emitter not configured",
        {
          service: "TestService",
          event: "test",
        }
      );
    });

    it("should emit the event to the pubsub", async () => {
      const args = {};

      await network.emit("test", args);

      expect(pubsub.emit).toHaveBeenCalledTimes(1);
      expect(pubsub.emit).toHaveBeenCalledWith("TestService:test", args);
    });
  });

  describe("get", () => {
    it("should create a service procy with the correct arguments", () => {
      const context = { prop: "context" };
      const forwardedContext = { propx: "forwardedContext" };
      network = new SkhailNetwork(
        owner,
        logger,
        client,
        queue,
        pubsub,
        forwardedContext
      );

      jest
        .spyOn(proxyUtils, "createServiceProxy")
        .mockReturnValue({ props: "proxy" });

      const result = network.get(TestService, context);

      expect(logger.clone).toHaveBeenCalledTimes(1);

      expect(proxyUtils.createServiceProxy).toHaveBeenCalledTimes(1);
      expect(proxyUtils.createServiceProxy).toHaveBeenCalledWith(
        TestService,
        expect.objectContaining({ option: "cloned" }),
        queue,
        context,
        forwardedContext
      );
      expect(result).toEqual({
        props: "proxy",
      });
    });
  });

  describe("getClient", () => {
    it("should return the client", () => {
      expect(network.getClient()).toBe(client);
    });
  });
});
