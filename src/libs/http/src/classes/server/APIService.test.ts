/**
 * @group unit
 */
import { createServer } from "http";
import {
  APIService,
  Expose,
  ExposeMethod,
  ExposeMethodOptions,
} from "./APIService";
import { APIHandler } from "./Handlers/APIHandler";
import { Constructor, SkhailService } from "@skhail/core";

jest.mock("http");
jest.mock("https");

describe("APIService", () => {
  it("Should instantiate APIService", () => {
    const service = new APIService({ log: false });

    expect(service).toBeInstanceOf(APIService);
    expect(service["apiOptions"]).toStrictEqual({ log: false });
  });

  it("Should instantiate APIService with default options", () => {
    const service = new APIService();

    expect(service).toBeInstanceOf(APIService);
    expect(service["apiOptions"]).toStrictEqual({ log: true });
  });

  describe("prepare", () => {
    it("Should set api handler", async () => {
      const logger = { debug: jest.fn(), info: jest.fn() };
      const service = new APIService({ log: false });

      service.setLogger(logger as any);

      const httpServer = {
        on: jest.fn(),
        listen: jest.fn().mockImplementation((_1, _2, cb) => cb()),
      };
      (createServer as any as jest.SpyInstance).mockReturnValue(httpServer);

      await service.prepare();

      expect(service["handlers"]).toHaveLength(1);
      expect(service["handlers"][0]).toBeInstanceOf(APIHandler);
    });

    it("Should set api handler with get context", async () => {
      const logger = { debug: jest.fn(), info: jest.fn() };
      const service = new APIService({ log: false });

      service.setLogger(logger as any);

      const httpServer = {
        on: jest.fn(),
        listen: jest.fn().mockImplementation((_1, _2, cb) => cb()),
      };
      (createServer as any as jest.SpyInstance).mockReturnValue(httpServer);

      await service.prepare();

      expect(service["handlers"]).toHaveLength(1);
      expect(service["handlers"][0]).toBeInstanceOf(APIHandler);
    });

    it("Should set log handler", async () => {
      const logger = { debug: jest.fn(), info: jest.fn() };
      const service = new APIService({ log: true });

      service.setLogger(logger as any);

      const httpServer = {
        on: jest.fn(),
        listen: jest.fn().mockImplementation((_1, _2, cb) => cb()),
      };
      (createServer as any as jest.SpyInstance).mockReturnValue(httpServer);

      await service.prepare();

      expect(service["handlers"]).toHaveLength(1);
      expect(service["handlers"][0]).toBeInstanceOf(APIHandler);
    });
  });

  describe("cleanup", () => {
    it("Should set api handler", async () => {
      const logger = { debug: jest.fn(), info: jest.fn() };
      const service = new APIService({});

      service.setLogger(logger as any);
      service["httpServer"] = {
        close: jest.fn().mockImplementation((cb) => cb()),
      } as any;

      await service.cleanup();

      expect(service["handlers"]).toHaveLength(0);
    });
  });
});

describe("Expose", () => {
  let target: Constructor<SkhailService<any>>;

  beforeEach(() => {
    APIService.openApiServices = {};
    APIService.openApiBuilder = {
      service: jest.fn().mockReturnValue({
        name: jest.fn(),
      }),
    } as any;
    target = class TestService extends SkhailService<any> {
      static identifier = "TestService";
    } as Constructor<SkhailService<any>>;
  });

  it("should set the service name", () => {
    Expose("Test")(target);

    expect(APIService.openApiServices[target.identifier]).toBeDefined();
    expect(APIService.openApiBuilder.service).toHaveBeenCalledWith(
      target,
      target.identifier
    );
    expect(
      APIService.openApiServices[target.identifier].name
    ).toHaveBeenCalledWith("Test");
  });

  it("should use the default service name if not provided", () => {
    Expose()(target);

    expect(APIService.openApiServices[target.identifier]).toBeDefined();
    expect(APIService.openApiBuilder.service).toHaveBeenCalledWith(
      target,
      target.identifier
    );
    expect(
      APIService.openApiServices[target.identifier].name
    ).toHaveBeenCalledWith("TestService");
  });
});

describe("ExposeMethod", () => {
  class TestServiceExpose extends SkhailService<any> {
    public static readonly identifier = "TestServiceIdentifier";

    public testMethod() {}
  }

  const methodBuilder = {
    description: jest.fn().mockReturnThis(),
    summary: jest.fn().mockReturnThis(),
    success: jest.fn().mockReturnThis(),
    parameter: jest.fn().mockReturnThis(),
    mode: jest.fn().mockReturnThis(),
  };
  const serviceBuilder = {
    expose: jest.fn().mockReturnValue(methodBuilder),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    APIService.openApiServices = {};
    APIService.openApiBuilder = {
      service: jest.fn().mockReturnValue(serviceBuilder),
    } as any;
  });

  it("should add OpenAPI metadata for the decorated method to APIService.openApiServices", () => {
    const options: ExposeMethodOptions = {
      mode: "post",
      path: "/test",
      description: "Test description",
      summary: "Test summary",
      success: "Test success",
      parameters: [
        {
          name: "param1",
          in: "path",
          description: "Test parameter 1",
        },
      ],
    };

    ExposeMethod(options)(new TestServiceExpose() as any, "testMethod");

    expect(Object.keys(APIService.openApiServices)).toHaveLength(1);

    expect(serviceBuilder.expose).toHaveBeenCalledTimes(1);
    expect(serviceBuilder.expose).toHaveBeenCalledWith(
      "testMethod",
      options.path
    );

    expect(methodBuilder.mode).toHaveBeenCalledTimes(1);
    expect(methodBuilder.mode).toHaveBeenCalledWith(options.mode);

    expect(methodBuilder.description).toHaveBeenCalledTimes(1);
    expect(methodBuilder.description).toHaveBeenCalledWith(options.description);

    expect(methodBuilder.summary).toHaveBeenCalledTimes(1);
    expect(methodBuilder.summary).toHaveBeenCalledWith(options.summary);

    expect(methodBuilder.success).toHaveBeenCalledTimes(1);
    expect(methodBuilder.success).toHaveBeenCalledWith(options.success);

    expect(methodBuilder.parameter).toHaveBeenCalledTimes(1);
    expect(methodBuilder.parameter).toHaveBeenCalledWith(
      options.parameters![0]
    );
  });

  it("should use default options if none are provided", () => {
    ExposeMethod()(new TestServiceExpose() as any, "testMethod");

    expect(Object.keys(APIService.openApiServices)).toHaveLength(1);

    expect(serviceBuilder.expose).toHaveBeenCalledTimes(1);
    expect(serviceBuilder.expose).toHaveBeenCalledWith("testMethod", undefined);

    expect(methodBuilder.mode).toHaveBeenCalledTimes(1);
    expect(methodBuilder.mode).toHaveBeenCalledWith("get");

    expect(methodBuilder.description).toHaveBeenCalledTimes(1);
    expect(methodBuilder.description).toHaveBeenCalledWith(undefined);

    expect(methodBuilder.summary).toHaveBeenCalledTimes(1);
    expect(methodBuilder.summary).toHaveBeenCalledWith(undefined);

    expect(methodBuilder.success).toHaveBeenCalledTimes(1);
    expect(methodBuilder.success).toHaveBeenCalledWith("Success");

    expect(methodBuilder.parameter).toHaveBeenCalledTimes(0);
  });
});
