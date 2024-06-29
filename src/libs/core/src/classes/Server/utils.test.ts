/**
 * @group unit
 */
import { IEnveloppe } from "../../types";
import { SkhailNetwork } from "../Network";
import { SkhailService } from "../Service";
import { createLoggerCopy, handleServiceCall } from "./utils";

jest.mock("../Network");

class OtherTestService extends SkhailService {
  static identifier = "OtherTest";

  async other() {}
}

class TestService extends SkhailService {
  static identifier = "Test";

  spy: any;
  testMethod: any;
  internalTest() {
    (this as any)["spy"](this);
    return Promise.resolve();
  }

  nestedTest() {
    return this.get(OtherTestService).other();
  }
}

describe("handleServiceCall", () => {
  const queue = {
    props: "queue",
    enqueue: jest.fn().mockResolvedValue({
      success: true,
      response: undefined,
    }),
  } as any;
  const emitter = {
    props: "emitter",
  } as any;

  const server = {
    getQueue: jest.fn().mockReturnValue(queue),
    getEmitter: jest.fn().mockReturnValue(emitter),
    getClient: jest.fn().mockReturnValue({ prop: "client" }),
  } as any;

  const logger = {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    trace: jest.fn(),
    setTransactionId: jest.fn(),
    clone: jest.fn().mockReturnThis(),
    setScope: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("handleServiceCall", () => {
    it("Should call service method", async () => {
      const service = new TestService();
      const expectedResult = { object: "test" };
      const spy = jest.fn().mockReturnValue(expectedResult);
      service["logger"] = logger;

      (service as any)["testMethod"] = spy;

      const wrappedMethod = handleServiceCall(service, server, logger);

      const result = await wrappedMethod({
        service: TestService.identifier,
        method: "testMethod",
        args: ["truc", "muche"],
        context: { tid: "test transaction id" },
      });

      expect(result).toStrictEqual({
        tid: "test transaction id",
        success: true,
        response: expectedResult,
      });
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith("truc", "muche");
      expect(server.getQueue).toHaveBeenCalledTimes(1);
      expect(server.getEmitter).toHaveBeenCalledTimes(1);
      expect(SkhailNetwork).toHaveBeenCalledTimes(1);
      expect(SkhailNetwork).toHaveBeenCalledWith(
        expect.any(TestService),
        logger,
        { prop: "client" },
        queue,
        emitter,
        {
          tid: "test transaction id",
        }
      );
      expect(logger.trace).toHaveBeenCalledTimes(2);
      expect(logger.trace).toHaveBeenNthCalledWith(1, "Service execute");
      expect(logger.trace).toHaveBeenNthCalledWith(2, "Send service response");
    });

    it("Should forward context to server call", async () => {
      const service = new TestService();
      service.setLogger(logger);

      (SkhailNetwork.prototype.get as any).mockReturnValue({
        other: jest.fn().mockResolvedValue("other response"),
      });

      const wrappedMethod = handleServiceCall(service, server, logger);

      const result = await wrappedMethod({
        service: TestService.identifier,
        method: "nestedTest",
        args: [],
        context: { tid: "test transaction id" },
      });

      expect(result).toStrictEqual({
        tid: "test transaction id",
        success: true,
        response: "other response",
      });
      expect(SkhailNetwork.prototype.get).toHaveBeenCalledTimes(1);
      expect(SkhailNetwork.prototype.get).toHaveBeenCalledWith(
        OtherTestService,
        undefined
      );
    });

    it("Should copy context on service", async () => {
      const network = {
        queue: {
          enqueue: jest.fn(),
        },
      } as any;
      const server = {
        get: jest.fn().mockReturnValue({ other: jest.fn() }),
        getQueue: jest.fn(),
        getEmitter: jest.fn(),
        getClient: jest.fn().mockReturnValue({}),
      } as any;
      const logger = {
        error: jest.fn(),
        info: jest.fn(),
        trace: jest.fn(),
        setTransactionId: jest.fn(),
        clone: jest.fn().mockReturnThis(),
        setScope: jest.fn(),
      } as any;
      const service = new TestService();
      const expectedResult = { object: "test" };
      const spy = jest.fn().mockReturnValue(expectedResult);
      service["network"] = network;
      service["logger"] = logger;

      (service as any)["testMethod"] = spy;

      const wrappedMethod = handleServiceCall(service, server, logger);

      const result = await wrappedMethod({
        service: TestService.identifier,
        method: "testMethod",
        args: ["truc", "muche"],
        context: { tid: "test transaction id" },
      });

      expect(result).toStrictEqual({
        tid: "test transaction id",
        success: true,
        response: expectedResult,
      });
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith("truc", "muche");
    });

    it("Should not call service method when method does not exist", async () => {
      const network = {
        queue: {
          enqueue: jest.fn(),
        },
      } as any;
      const server = {
        get: jest.fn().mockReturnValue({ other: jest.fn() }),
        getQueue: jest.fn(),
        getEmitter: jest.fn(),
        getClient: jest.fn().mockReturnValue({}),
      } as any;
      const logger = {
        error: jest.fn(),
        info: jest.fn(),
        trace: jest.fn(),
        setTransactionId: jest.fn(),
        clone: jest.fn().mockReturnThis(),
        setScope: jest.fn(),
      } as any;
      const service = new TestService();
      const spy = jest.fn();
      service["network"] = network;
      service["logger"] = logger;

      (service as any)["testMethod"] = spy;

      const wrappedMethod = handleServiceCall(service, server, logger);

      const result = await wrappedMethod({
        service: TestService.identifier,
        method: "testMethodNotExist",
        args: ["truc", "muche"],
        context: { tid: "test transaction id" },
      });

      expect(result).toStrictEqual({
        tid: "test transaction id",
        success: false,
        error: {
          details: {
            method: "testMethodNotExist",
            service: "Test",
          },
          message: "Method not found",
          name: "not_found",
        },
      });
    });

    it("Should copy the service", async () => {
      const network = {
        server: "test",
        getQueue: jest.fn(),
        getEmitter: jest.fn(),
      } as any;
      const server = {
        get: jest.fn().mockReturnValue({ other: jest.fn() }),
        getQueue: jest.fn(),
        getEmitter: jest.fn(),
        getClient: jest.fn().mockReturnValue({}),
      } as any;
      const logger = {
        error: jest.fn(),
        info: jest.fn(),
        trace: jest.fn(),
        setTransactionId: jest.fn(),
        clone: jest.fn().mockReturnThis(),
        setScope: jest.fn(),
      } as any;
      const service = new TestService();
      const spy = jest.fn();
      service["network"] = network;
      service["logger"] = logger;

      (service as any)["spy"] = spy;

      const wrappedMethod = handleServiceCall(service, server, logger);

      await wrappedMethod({
        service: TestService.identifier,
        method: "internalTest",
        args: ["truc", "muche"],
        context: { tid: "test transaction id" },
      });

      expect(spy).toHaveBeenCalledTimes(1);

      const serviceCopy = spy.mock.calls[0][0];

      expect(serviceCopy).not.toBe(service);
      expect(serviceCopy).toBeInstanceOf(TestService);
      expect(serviceCopy.logger).toBe((service as any).logger);
      expect(serviceCopy.context).toStrictEqual({ tid: "test transaction id" });
      expect(serviceCopy.server).toStrictEqual((service as any).server);
    });

    it("Should run middlewares in chain", async () => {
      const network = {
        server: "test",
        getQueue: jest.fn(),
        getEmitter: jest.fn(),
      } as any;
      const server = {
        server: "test",
        get: jest.fn(),
        getQueue: jest.fn(),
        getEmitter: jest.fn(),
        getClient: jest.fn().mockReturnValue({}),
      } as any;
      const logger = {
        error: jest.fn(),
        info: jest.fn(),
        trace: jest.fn(),
        setTransactionId: jest.fn(),
        clone: jest.fn().mockReturnThis(),
        setScope: jest.fn(),
      } as any;
      const enveloppe: IEnveloppe<any> = {
        service: TestService.identifier,
        method: "internalTest",
        args: ["truc", "muche"],
        context: {} as any,
      };
      const middlewares = [
        {
          id: "mid1",
          process: jest.fn().mockResolvedValue({ id: "test", env: "1" }),
        },
        {
          id: "mid2",
          process: jest.fn().mockResolvedValue({ env: "2" }),
        },
        {
          id: "mid3",
          process: jest.fn().mockResolvedValue(undefined),
        },
      ];

      const service = new TestService();
      TestService["middlewares"] = middlewares;

      service["network"] = network;
      service["logger"] = logger;
      (service as any)["spy"] = jest.fn();

      const wrappedMethod = handleServiceCall(service, server, logger);

      await wrappedMethod(enveloppe);

      expect(middlewares[0].process).toHaveBeenCalledTimes(1);
      expect(middlewares[0].process).toHaveBeenCalledWith(
        {
          ...enveloppe,
          context: {},
        },
        service
      );
      expect(middlewares[1].process).toHaveBeenCalledTimes(1);
      expect(middlewares[1].process).toHaveBeenCalledWith(
        {
          ...enveloppe,
          context: {
            data: {
              env: "1",
              id: "test",
            },
          },
        },
        service
      );
      expect(middlewares[2].process).toHaveBeenCalledTimes(1);
      expect(middlewares[2].process).toHaveBeenCalledWith(
        {
          ...enveloppe,
          context: {
            data: {
              env: "2",
              id: "test",
            },
          },
        },
        service
      );
    });

    it("Should stop calling middle when one fails", async () => {
      const network = {
        server: "test",
        getQueue: jest.fn(),
        getEmitter: jest.fn(),
      } as any;
      const server = {
        server: "test",
        get: jest.fn(),
        getQueue: jest.fn(),
        getEmitter: jest.fn(),
        getClient: jest.fn().mockReturnValue({}),
      } as any;
      const logger = {
        error: jest.fn(),
        info: jest.fn(),
        trace: jest.fn(),
        setTransactionId: jest.fn(),
        clone: jest.fn().mockReturnThis(),
        setScope: jest.fn(),
      } as any;
      const enveloppe: IEnveloppe<any> = {
        service: TestService.identifier,
        method: "internalTest",
        args: ["truc", "muche"],
        context: { context: "test" } as any,
      };
      const middlewares = [
        {
          id: "mid1",
          process: jest.fn().mockRejectedValue("Error test"),
        },
        {
          id: "mid2",
          process: jest.fn().mockResolvedValue({ env: "2" }),
        },
      ];

      const service = new TestService();
      TestService["middlewares"] = middlewares;
      service["network"] = network;
      service["logger"] = logger;
      (service as any)["spy"] = jest.fn();

      const wrappedMethod = handleServiceCall(service, server, logger);
      const result = await wrappedMethod(enveloppe);

      expect(middlewares[0].process).toHaveBeenCalledTimes(1);
      expect(middlewares[1].process).toHaveBeenCalledTimes(0);

      expect(result.success).toBeFalsy();
      expect((result as any).error).toMatchSnapshot();
    });

    it("Should not fail if middlewares are undefined", async () => {
      const network = {
        server: "test",
        getQueue: jest.fn(),
        getEmitter: jest.fn(),
      } as any;
      const server = {
        server: "test",
        get: jest.fn(),
        getQueue: jest.fn(),
        getEmitter: jest.fn(),
        getClient: jest.fn().mockReturnValue({}),
      } as any;
      const logger = {
        error: jest.fn(),
        info: jest.fn(),
        trace: jest.fn(),
        setTransactionId: jest.fn(),
        clone: jest.fn().mockReturnThis(),
        setScope: jest.fn(),
      } as any;
      const enveloppe: IEnveloppe<any> = {
        service: TestService.identifier,
        method: "internalTest",
        args: ["truc", "muche"],
        context: { context: "test" } as any,
      };

      const service = new TestService();
      TestService["middlewares"] = undefined as any;
      service["network"] = network;
      service["logger"] = logger;
      (service as any)["spy"] = jest.fn();

      const wrappedMethod = handleServiceCall(service, server, logger);
      await wrappedMethod(enveloppe);

      expect((service as any)["spy"]).toHaveBeenCalledTimes(1);
      expect(logger.setScope).toHaveBeenCalledTimes(1);
      expect(logger.setScope).toHaveBeenCalledWith("Test:internalTest");
    });
  });

  describe("createLoggerCopy", () => {
    it("Should clone and set service on logger", () => {
      const logger = {
        error: jest.fn(),
        info: jest.fn(),
        trace: jest.fn(),
        setTransactionId: jest.fn(),
        setService: jest.fn(),
        clone: jest.fn().mockReturnThis(),
        setScope: jest.fn(),
      } as any;
      const loggerCopy = createLoggerCopy(logger, TestService);

      expect(loggerCopy).toBe(logger);
      expect(logger.setScope).toHaveBeenCalledTimes(1);
      expect(logger.setScope).toHaveBeenCalledWith(TestService.identifier);
    });
  });
});
