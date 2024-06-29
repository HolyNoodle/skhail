/**
 * @group unit
 */
import OpenAPIClientAxios from "openapi-client-axios";
import { HTTPClientQueue } from "./Queue";

jest.mock("openapi-client-axios");

describe("HTTPClientQueue", () => {
  const logger = { trace: jest.fn() };

  let fetchOriginal = globalThis.fetch;
  beforeEach(() => {
    globalThis.fetch = jest.fn();
    jest.clearAllMocks();
  });
  afterEach(() => {
    globalThis.fetch = fetchOriginal;
  });

  it("Should instantiate HTTPClientQueue", () => {
    const queue = new HTTPClientQueue({
      url: "testurl",
    });

    expect(queue).toBeInstanceOf(HTTPClientQueue);
    expect(queue["options"]).toStrictEqual({ url: "testurl" });
  });
  describe("prepare", () => {
    it("Should fetch definition", async () => {
      (globalThis["fetch"] as any).mockResolvedValue({
        json: jest.fn().mockResolvedValue({}),
      });
      (OpenAPIClientAxios as any).mockReturnValue({
        init: jest.fn().mockResolvedValue({}),
      });

      const queue = new HTTPClientQueue({
        url: "testurl",
      });

      await queue.prepare();

      expect(fetch).toHaveBeenCalledWith("testurl/definition", {
        headers: {
          accept: "application/json",
        },
        method: "get",
      });
    });
    it("Should use definition to initialize open api client", async () => {
      (globalThis["fetch"] as any).mockResolvedValue({
        json: jest.fn().mockResolvedValue({
          paths: {
            "/test": {
              get: {
                operationId: "test",
              },
            },
          },
        }),
      });
      const expectedClient = { test: "client" };
      (OpenAPIClientAxios as any).mockReturnValue({
        init: jest.fn().mockResolvedValue(expectedClient),
      });

      const queue = new HTTPClientQueue({
        url: "testurl",
      });

      await queue.prepare();

      expect(queue["openApiClientDefinition"]).toStrictEqual({
        paths: {
          "/test": {
            get: {
              operationId: "test",
            },
          },
        },
      });
      expect(queue["openApiClient"]).toBe(expectedClient);
    });
  });

  describe("findMethodDefinition", () => {
    it("Should return undefined if no definition", () => {
      const queue = new HTTPClientQueue({
        url: "testurl",
      });

      const result = queue["findMethodDefinition"]("test");

      expect(result).toBeUndefined();
    });
    it("Should return undefined if no matching definition", () => {
      const queue = new HTTPClientQueue({
        url: "testurl",
      });
      queue["openApiClientDefinition"] = {
        paths: {
          "/test": {
            get: {
              operationId: "test",
            },
          },
        },
      } as any;

      const result = queue["findMethodDefinition"]("test2");

      expect(result).toBeUndefined();
    });

    it("Should return definition", () => {
      const queue = new HTTPClientQueue({
        url: "testurl",
      });
      queue["openApiClientDefinition"] = {
        paths: {
          "/test": {
            get: {
              operationId: "test",
            },
          },
        },
      } as any;

      const result = queue["findMethodDefinition"]("test");

      expect(result).toStrictEqual({
        operationId: "test",
      });
    });
    it("Should return definition with params", () => {
      const queue = new HTTPClientQueue({
        url: "testurl",
      });
      queue["openApiClientDefinition"] = {
        paths: {
          "/test/{id}": {
            post: {
              operationId: "test",
            },
          },
        },
      } as any;

      const result = queue["findMethodDefinition"]("test");

      expect(result).toStrictEqual({
        operationId: "test",
      });
    });
    it("Should return definition when delete", () => {
      const queue = new HTTPClientQueue({
        url: "testurl",
      });
      queue["openApiClientDefinition"] = {
        paths: {
          "/test": {
            delete: {
              operationId: "test",
            },
          },
        },
      } as any;

      const result = queue["findMethodDefinition"]("test");

      expect(result).toStrictEqual({
        operationId: "test",
      });
    });
    it("Should return definition when put", () => {
      const queue = new HTTPClientQueue({
        url: "testurl",
      });
      queue["openApiClientDefinition"] = {
        paths: {
          "/test": {
            put: {
              operationId: "test",
            },
          },
        },
      } as any;

      const result = queue["findMethodDefinition"]("test");

      expect(result).toStrictEqual({
        operationId: "test",
      });
    });
    it("Should stop at first matching definition", () => {
      const queue = new HTTPClientQueue({
        url: "testurl",
      });
      queue["openApiClientDefinition"] = {
        paths: {
          "/test": {
            get: {
              operationId: "test",
            },
          },
          "/test2": {
            get: {
              operationId: "test2",
            },
          },
        },
      } as any;

      const result = queue["findMethodDefinition"]("test");

      expect(result).toStrictEqual({
        operationId: "test",
      });
    });
  });

  describe("setHandler", () => {
    it("Should throw", async () => {
      const queue = new HTTPClientQueue({
        url: "testurl",
      });

      await expect(queue.setHandler()).rejects.toThrow(
        "Method not implemented"
      );
    });
  });

  describe("setLogger", () => {
    it("Should set logger", async () => {
      const queue = new HTTPClientQueue({
        url: "testurl",
      });

      const logger = {} as any;
      queue.setLogger(logger);

      expect(queue["logger"]).toBe(logger);
    });
  });

  // TODO: For some reasons this does not work anymore (no changes should have impacted this)
  describe("enqueue", () => {
    it("Should call fetch", async () => {
      const jsonResult = { result: "test result" } as any;
      const queue = new HTTPClientQueue({
        url: "testurl",
      });
      queue["openApiClient"] = {
        "testService:testMethod": jest
          .fn()
          .mockResolvedValue({ data: jsonResult }),
      } as any;
      queue["openApiClientDefinition"] = {
        paths: {
          "/api": {
            post: {},
          },
        },
      } as any;
      queue.setLogger(logger as any);

      const enveloppe = {
        service: "testService",
        method: "testMethod",
        args: [{ name: "value", truc: "muche" }],
        context: { tid: "test" },
      };
      const result = await queue.enqueue(enveloppe);

      expect(
        (queue["openApiClient"]! as any)["testService:testMethod"]!
      ).toHaveBeenCalledTimes(1);
      expect(
        (queue["openApiClient"]! as any)["testService:testMethod"]!
      ).toHaveBeenCalledWith(
        {},
        { name: "value", truc: "muche" },
        { headers: { context: JSON.stringify({ tid: "test" }) } }
      );

      expect(result).toBe(jsonResult);
    });

    it("Should throw error when fetch fails", async () => {
      const queue = new HTTPClientQueue({
        url: "testurl",
      });
      queue["openApiClient"] = {
        "testService:testMethod": jest
          .fn()
          .mockRejectedValue(new Error("test error")),
      } as any;
      queue["openApiClientDefinition"] = {
        paths: {
          "/api": {
            post: {},
          },
        },
      } as any;
      queue.setLogger(logger as any);

      const enveloppe = {
        service: "testService",
        method: "testMethod",
        args: ["value", "muche"],
        context: { tid: "test" },
      };
      const result = await queue.enqueue(enveloppe);

      expect(result).toStrictEqual({
        tid: "test",
        success: false,
        error: {
          name: "unexpected",
          message: "An unexpected error occured",
          details: {
            path: undefined,
            error: { message: "test error" },
          },
        },
      });
    });

    it("Should throw error when fetch fails with error code", async () => {
      const queue = new HTTPClientQueue({
        url: "testurl",
      });
      queue["openApiClient"] = {
        "testService:testMethod": jest.fn().mockRejectedValue({
          response: { status: 404, data: { error: "This is an error" } },
        }),
      } as any;
      queue["openApiClientDefinition"] = {
        paths: {
          "/api": {
            post: {},
          },
        },
      } as any;
      queue.setLogger(logger as any);

      const enveloppe = {
        service: "testService",
        method: "testMethod",
        args: ["value", "muche"],
        context: { tid: "test" },
      };
      const result = await queue.enqueue(enveloppe);

      expect(result).toStrictEqual({
        tid: "test",
        success: false,
        error: {
          name: "unexpected",
          message: "This is an error",
          details: {
            path: undefined,
          },
        },
      });
    });
    it("Should throw an error when the method is not defined", async () => {
      const queue = new HTTPClientQueue({
        url: "testurl",
      });
      queue["openApiClient"] = {
        "testService:testMethod": jest.fn(),
      } as any;
      queue["openApiClientDefinition"] = {
        paths: {
          "/api": {
            post: {},
          },
        },
      } as any;
      queue.setLogger(logger as any);

      const enveloppe = {
        service: "testService",
        method: "testMethod2",
        args: ["value", "muche"],
        context: { tid: "test" },
      };
      const result = await queue.enqueue(enveloppe);

      expect(result).toStrictEqual({
        tid: "test",
        success: false,
        error: {
          name: "not_found",
          message: "Method not found in api definition",
          details: {
            operationId: "testService:testMethod2",
            path: undefined,
          },
        },
      });
    });
    it("Should parse body params", async () => {
      const jsonResult = { result: "test result" } as any;
      const queue = new HTTPClientQueue({
        url: "testurl",
      });
      queue["openApiClient"] = {
        "testService:testMethod": jest
          .fn()
          .mockResolvedValue({ data: jsonResult }),
      } as any;
      queue["openApiClientDefinition"] = {
        paths: {
          "/api": {
            post: {},
          },
        },
      } as any;
      queue.setLogger(logger as any);

      const enveloppe = {
        service: "testService",
        method: "testMethod",
        args: [{ name: "value", truc: "muche" }],
        context: { tid: "test" },
      };
      const result = await queue.enqueue(enveloppe);

      expect(
        (queue["openApiClient"] as any)["testService:testMethod"]
      ).toHaveBeenCalledTimes(1);
      expect(
        (queue["openApiClient"] as any)["testService:testMethod"]
      ).toHaveBeenCalledWith(
        {},
        { name: "value", truc: "muche" },
        { headers: { context: JSON.stringify({ tid: "test" }) } }
      );

      expect(result).toBe(jsonResult);
    });

    it("Should parse defintion parameters from url params", async () => {
      const jsonResult = { result: "test result" } as any;
      const queue = new HTTPClientQueue({
        url: "testurl",
      });
      queue["openApiClient"] = {
        "testService:testMethod": jest
          .fn()
          .mockResolvedValue({ data: jsonResult }),
      } as any;
      queue["openApiClientDefinition"] = {
        paths: {
          "/api/{id}/test{other}": {
            post: {
              operationId: "testService:testMethod",
              parameters: [
                {
                  name: "id",
                  in: "path",
                },
                {
                  name: "other",
                  in: "query",
                },
              ],
            },
          },
        },
      } as any;
      queue.setLogger(logger as any);

      const enveloppe = {
        service: "testService",
        method: "testMethod",
        args: [{ id: "value", truc: "muche", other: "yay" }],
        context: { tid: "test" },
      };
      const result = await queue.enqueue(enveloppe);

      expect(
        (queue["openApiClient"] as any)["testService:testMethod"]
      ).toHaveBeenCalledTimes(1);
      expect(
        (queue["openApiClient"] as any)["testService:testMethod"]
      ).toHaveBeenCalledWith(
        { id: "value", other: "yay" },
        { truc: "muche" },
        { headers: { context: JSON.stringify({ tid: "test" }) } }
      );

      expect(result).toBe(jsonResult);
    });

    it("Should intercept response data", async () => {
      const jsonResult = { result: "test result" } as any;
      const interceptor = jest.fn();
      const queue = new HTTPClientQueue({
        url: "testurl",
        interceptor,
      });
      queue["openApiClient"] = {
        "testService:testMethod": jest
          .fn()
          .mockResolvedValue({ data: jsonResult }),
      } as any;
      queue["openApiClientDefinition"] = {
        paths: {
          "/api": {
            post: {},
          },
        },
      } as any;
      queue.setLogger(logger as any);

      const enveloppe = {
        service: "testService",
        method: "testMethod",
        args: ["value", "muche"],
        context: { tid: "test" },
      };

      await queue.enqueue(enveloppe);

      expect(interceptor).toHaveBeenCalledTimes(1);
      expect(interceptor).toHaveBeenCalledWith(jsonResult);
    });
  });
});
