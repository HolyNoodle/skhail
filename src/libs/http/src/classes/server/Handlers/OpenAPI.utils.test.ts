/**
 * @group unit
 */
import {
  APIMethodBuilder,
  APIServiceBuilder,
  OpenAPIBuilder,
} from "./OpenAPI.utils";

describe("APIMethodBuilder", () => {
  describe("constructor", () => {
    it("should create an instance of the class", () => {
      const methodBuilder = new APIMethodBuilder("get");

      expect(methodBuilder).toBeInstanceOf(APIMethodBuilder);
    });
  });

  describe("mode", () => {
    it("should set the mode of the method builder", () => {
      const methodBuilder = new APIMethodBuilder("get").mode("post");

      expect(methodBuilder["_mode"]).toEqual("post");
    });
  });

  describe("parameter", () => {
    it("should add a parameter to the method builder", () => {
      const methodBuilder = new APIMethodBuilder("get").parameter({
        name: "id",
        description: "The id of the resource",
        in: "query",
        required: true,
        type: "string",
      });

      expect(methodBuilder["_parameters"]).toContainEqual({
        name: "id",
        in: "query",
        description: "The id of the resource",
        required: true,
        schema: { type: "string" },
      });
    });

    it("Should use default values for the parameter", () => {
      const methodBuilder = new APIMethodBuilder("get").parameter({
        name: "id",
      });

      expect(methodBuilder["_parameters"]).toContainEqual({
        name: "id",
        in: "path",
        required: true,
        schema: { type: "string" },
      });
    });
  });

  describe("description", () => {
    it("should set the description of the method builder", () => {
      const methodBuilder = new APIMethodBuilder("get").description(
        "Get a resource"
      );

      expect(methodBuilder["_description"]).toEqual("Get a resource");
    });
  });

  describe("summary", () => {
    it("should set the summary of the method builder", () => {
      const methodBuilder = new APIMethodBuilder("get").summary(
        "Get a resource by id"
      );

      expect(methodBuilder["_summary"]).toEqual("Get a resource by id");
    });
  });

  describe("tags", () => {
    it("should set the tags of the method builder", () => {
      const methodBuilder = new APIMethodBuilder("get").tags(["resource"]);

      expect(methodBuilder["_tags"]).toEqual(["resource"]);
    });
  });

  describe("success", () => {
    it("should set the success message of the method builder", () => {
      const methodBuilder = new APIMethodBuilder("get").success(
        "Resource retrieved successfully"
      );

      expect(methodBuilder["_success"]).toEqual(
        "Resource retrieved successfully"
      );
    });
  });

  describe("getOperationId", () => {
    it("should return the operation id of the method builder", () => {
      const methodBuilder = new APIMethodBuilder("get");

      expect(methodBuilder.getOperationId()).toEqual("get");
    });
  });

  describe("buildDoc", () => {
    it("should return an object conforming to the OpenAPI specification for documenting the API endpoint", () => {
      const methodBuilder = new APIMethodBuilder("get")
        .description("Get a resource")
        .summary("Get a resource by id")
        .tags(["resource"])
        .parameter({
          name: "id",
          description: "The id of the resource",
          in: "query",
          required: true,
          type: "string",
        })
        .success("Resource retrieved successfully");

      const expectedOutput = {
        get: {
          operationId: "get",
          summary: "Get a resource by id",
          description: "Get a resource",
          tags: ["resource"],
          parameters: [
            {
              name: "id",
              in: "query",
              description: "The id of the resource",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: {
              description: "Resource retrieved successfully",
            },
            default: {
              description: "An error occured",
            },
          },
        },
      };

      expect(methodBuilder.buildDoc()).toEqual(expectedOutput);
    });
  });
});

describe("APIServiceBuilder", () => {
  const serviceMock: any = {
    identifier: "mockService",
  };

  describe("constructor", () => {
    it("should create an instance of the class", () => {
      const serviceBuilder = new APIServiceBuilder(serviceMock);

      expect(serviceBuilder).toBeInstanceOf(APIServiceBuilder);
    });
  });

  describe("name", () => {
    it("should set the name of the service builder", () => {
      const serviceBuilder = new APIServiceBuilder(
        serviceMock,
        "mockName"
      ).name("newName");

      expect(serviceBuilder["_name"]).toEqual("newName");
    });
  });

  describe("expose", () => {
    it("should add a new method to the service builder with the specified path", () => {
      const serviceBuilder = new APIServiceBuilder(serviceMock, "mockName");

      serviceBuilder.expose("getById" as never, "resource");
      serviceBuilder.expose("delete" as never, "resource");

      expect(serviceBuilder["methods"]).toEqual({
        resource: [
          new APIMethodBuilder("mockService:getById"),
          new APIMethodBuilder("mockService:delete"),
        ],
      });
    });

    it("should add a new method to the service builder without a path", () => {
      const serviceBuilder = new APIServiceBuilder(serviceMock, "mockName");
      serviceBuilder.expose("getAll" as never);

      expect(serviceBuilder["methods"]).toEqual({
        "": [new APIMethodBuilder("mockService:getAll")],
      });
    });
  });

  describe("buildDoc", () => {
    it("should return an object conforming to the OpenAPI specification for documenting the API service", () => {
      const serviceBuilder = new APIServiceBuilder(serviceMock, "mockName");

      serviceBuilder.expose("getById" as never, "resource");
      serviceBuilder.expose("delete" as never, "resource").mode("delete");
      serviceBuilder.expose("getAll" as never);

      const expectedOutput = {
        "/mockName": {
          get: {
            operationId: "mockService:getAll",
            summary: undefined,
            description: undefined,
            tags: [],
            parameters: [],
            responses: {
              200: { description: undefined },
              default: { description: "An error occured" },
            },
          },
        },
        "/mockName/resource": {
          get: {
            operationId: "mockService:getById",
            summary: undefined,
            description: undefined,
            tags: [],
            parameters: [],
            responses: {
              200: { description: undefined },
              default: { description: "An error occured" },
            },
          },
          delete: {
            operationId: "mockService:delete",
            summary: undefined,
            description: undefined,
            tags: [],
            parameters: [],
            responses: {
              200: { description: undefined },
              default: { description: "An error occured" },
            },
          },
        },
      };

      expect(serviceBuilder.buildDoc()).toEqual(expectedOutput);
    });
  });

  describe("buildHandlers", () => {
    it("should return an object containing the API handlers for the service", () => {
      const serviceBuilder = new APIServiceBuilder(serviceMock, "mockName");
      serviceBuilder.expose("getById" as never);

      const expectedOutput = {
        "mockService:getById": expect.any(Function),
      };

      expect(serviceBuilder.buildHandlers()).toEqual(expectedOutput);
    });
  });
});

describe("APIServiceBuilder", () => {
  const serviceMock: any = {
    identifier: "mockService",
  };

  describe("constructor", () => {
    it("should create an instance of the class", () => {
      const serviceBuilder = new APIServiceBuilder(serviceMock);

      expect(serviceBuilder).toBeInstanceOf(APIServiceBuilder);
    });
  });

  describe("name", () => {
    it("should set the name of the service builder", () => {
      const serviceBuilder = new APIServiceBuilder(
        serviceMock,
        "mockName"
      ).name("newName");

      expect(serviceBuilder["_name"]).toEqual("newName");
    });
  });

  describe("expose", () => {
    it("should add a new method to the service builder with the specified path", () => {
      const serviceBuilder = new APIServiceBuilder(serviceMock, "mockName");

      serviceBuilder.expose("getById" as never, "resource");
      serviceBuilder.expose("delete" as never, "resource");

      expect(serviceBuilder["methods"]).toEqual({
        resource: [
          new APIMethodBuilder("mockService:getById"),
          new APIMethodBuilder("mockService:delete"),
        ],
      });
    });

    it("should add a new method to the service builder without a path", () => {
      const serviceBuilder = new APIServiceBuilder(serviceMock, "mockName");
      serviceBuilder.expose("getAll" as never);

      expect(serviceBuilder["methods"]).toEqual({
        "": [new APIMethodBuilder("mockService:getAll")],
      });
    });
  });

  describe("buildDoc", () => {
    it("should return an object conforming to the OpenAPI specification for documenting the API service", () => {
      const serviceBuilder = new APIServiceBuilder(serviceMock, "mockName");

      serviceBuilder.expose("getById" as never, "resource");
      serviceBuilder.expose("delete" as never, "resource").mode("delete");
      serviceBuilder.expose("getAll" as never);

      const expectedOutput = {
        "/mockName": {
          get: {
            operationId: "mockService:getAll",
            summary: undefined,
            description: undefined,
            tags: [],
            parameters: [],
            responses: {
              200: { description: undefined },
              default: { description: "An error occured" },
            },
          },
        },
        "/mockName/resource": {
          get: {
            operationId: "mockService:getById",
            summary: undefined,
            description: undefined,
            tags: [],
            parameters: [],
            responses: {
              200: { description: undefined },
              default: { description: "An error occured" },
            },
          },
          delete: {
            operationId: "mockService:delete",
            summary: undefined,
            description: undefined,
            tags: [],
            parameters: [],
            responses: {
              200: { description: undefined },
              default: { description: "An error occured" },
            },
          },
        },
      };

      expect(serviceBuilder.buildDoc()).toEqual(expectedOutput);
    });
  });

  describe("buildHandlers", () => {
    it("should return an object containing the API handlers for the service", () => {
      const serviceBuilder = new APIServiceBuilder(serviceMock, "mockName");
      serviceBuilder.expose("getById" as never);

      const expectedOutput = {
        "mockService:getById": expect.any(Function),
      };

      expect(serviceBuilder.buildHandlers()).toEqual(expectedOutput);
    });

    it("should enqueue message when calling handler", async () => {
      const serviceBuilder = new APIServiceBuilder(serviceMock, "mockName");
      serviceBuilder.expose("getById" as never);

      const expectedMessage = { messgage: "test" };
      const queue = { enqueue: jest.fn().mockResolvedValue(expectedMessage) };
      const network = { queue };
      const response = {
        write: jest.fn(),
        writeHead: jest.fn().mockReturnThis(),
        end: jest.fn(),
      };

      const { ["mockService:getById"]: handler } =
        serviceBuilder.buildHandlers() as any;

      await handler(
        {
          request: {
            params: {},
            query: {},
            body: {},
          },
        } as any,
        network,
        { tid: "FDSFEZ" } as any, // context
        { debug: jest.fn() } as any, // logger
        response
      );

      expect(queue.enqueue).toHaveBeenCalledTimes(1);
      expect(queue.enqueue).toHaveBeenCalledWith({
        args: [{}],
        context: { tid: "FDSFEZ" },
        method: "getById",
        service: "mockService",
      });

      expect(response.writeHead).toHaveBeenCalledTimes(1);
      expect(response.writeHead).toHaveBeenCalledWith(200);
      expect(response.write).toHaveBeenCalledTimes(1);
      expect(response.write).toHaveBeenCalledWith(
        JSON.stringify(expectedMessage)
      );
    });
  });
});

describe("OpenAPIBuilder", () => {
  it("should correctly build doc when services are added", () => {
    const builder = new OpenAPIBuilder();

    const service1 = builder.service(TestService1 as any);
    const service2 = builder.service(TestService2 as any);

    // expose methods
    service1
      .expose("get" as never)
      .description("Retrieve test1 data using query parameters");
    service1.expose("post" as never).mode("post");
    service2.expose("get" as never);

    const expectedPaths = {
      "/test1": {
        get: {
          summary: undefined,
          operationId: "test1:get",
          parameters: [],
          tags: [],
          description: "Retrieve test1 data using query parameters",
          responses: {
            "200": {
              description: undefined,
            },
            default: {
              description: "An error occured",
            },
          },
        },
        post: {
          summary: undefined,
          operationId: "test1:post",
          parameters: [],
          tags: [],
          description: undefined,
          responses: {
            "200": {
              description: undefined,
            },
            default: {
              description: "An error occured",
            },
          },
        },
      },
      "/test2": {
        get: {
          summary: undefined,
          operationId: "test2:get",
          parameters: [],
          tags: [],
          description: undefined,
          responses: {
            "200": {
              description: undefined,
            },
            default: {
              description: "An error occured",
            },
          },
        },
      },
    };

    expect(builder.buildDoc().paths).toEqual(expectedPaths);
  });

  it("should correctly build handlers when services are added", () => {
    const builder = new OpenAPIBuilder();

    const service1 = builder.service(TestService1 as any);
    const service2 = builder.service(TestService2 as any);

    // expose methods
    service1.expose("get" as never);
    service1.expose("post" as never);
    service2.expose("get" as never);

    const expectedHandlers = {
      "test1:get": expect.any(Function),
      "test1:post": expect.any(Function),
      "test2:get": expect.any(Function),
    };

    expect(builder.buildHandlers()).toEqual(expectedHandlers);
  });
});

class TestService1 {
  static identifier = "test1";

  get() {}
  post() {}
}

class TestService2 {
  static identifier = "test2";

  get() {}
}
