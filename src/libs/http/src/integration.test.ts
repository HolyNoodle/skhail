/**
 * @group integration
 */
import fetch from "node-fetch";

import {
  ConsoleLogger,
  InMemoryEventEmitter,
  InMemoryQueue,
  LogLevel,
  SkhailServer,
  EventOptions,
  ISkhailClient,
  SkhailError,
  SkhailService,
} from "@skhail/core";

import {
  HTTPService,
  WebSocketService,
  APIService,
  Expose,
  ExposeMethod,
} from "./server";
import {
  HTTPInterface,
  HTTPProtocols,
  WebSocketFunctionArgs,
  WebSocketFunctions,
} from "./client";

import { join as pathJoin } from "path";
import { readFileSync } from "fs";
import { Agent } from "https";
import * as ws from "ws";
import { v4 } from "uuid";

jest.mock("uuid");
(v4 as any as jest.SpyInstance).mockReturnValue("testTransactionId");

const httpsAgent = new Agent({
  rejectUnauthorized: false,
});

interface AppContext {
  access?: boolean;
  user?: string;
}
interface Events extends EventOptions {
  eventName: [string, number];
}

SkhailError.stack = false;

jest.mock("./utils", () => {
  const ws = require("ws");

  class FakeWebSocket {
    constructor(url: string, options = {}) {
      return new ws.WebSocket(url, {
        ...options,
        rejectUnauthorized: false,
      });
    }
  }

  return {
    WebSocketGetter: () => FakeWebSocket,
  };
});

if (!globalThis["fetch"]) {
  globalThis["fetch"] = ((url: string, options = {}) => {
    return fetch(url, {
      ...options,
      agent: url.startsWith("https") ? httpsAgent : undefined,
    });
  }) as any;
}

@Expose("test")
class TestService extends SkhailService<AppContext, Events> {
  static identifier: string = "TestService";

  async testMethod(name: string) {
    this.network.emit("eventName", [name, 12]);

    return { name };
  }

  async guardedMethod(name: string) {
    throw new SkhailError({ message: "test", name: "denied" });
  }

  async failMethod(name: string) {
    throw new Error("test error");
  }

  async routeMethod({ name, num }: { name: string; num: number }) {
    return {
      name,
      num,
    };
  }
  async routeFailMethod({ name, num }: { name: string; num: number }) {
    throw new Error("test error");
  }
}

describe("HTTPService", () => {
  describe("Global", () => {
    let server: SkhailServer<AppContext>;
    let httpService: HTTPService<AppContext>;

    beforeAll(async () => {
      httpService = new HTTPService({
        protocol: HTTPProtocols.HTTP,
        port: 4444,
      });

      httpService.registerRoute(
        "/route-method/:name/:num",
        TestService,
        "routeMethod"
      );
      httpService.registerRoute(
        "/route-fail-method",
        TestService,
        "routeFailMethod"
      );

      const logger = new ConsoleLogger([LogLevel.ERROR]);
      logger.setInstance("server");
      logger["log"] = jest.fn();
      server = new SkhailServer({
        services: [httpService, new TestService()],
        logger,
        queue: new InMemoryQueue(),
        event: new InMemoryEventEmitter(),
      });

      await server.start();
    });

    afterAll(async () => {
      await server?.stop();
    });

    it("Should call service", async () => {
      const url = "http://localhost:4444/route-method/kevin/123";
      const response = await fetch(url, {
        method: "get",
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toStrictEqual({
        response: { name: "kevin", num: "123" },
        success: true,
        tid: "testTransactionId",
      });
    });
    it("Should fail with 404 when service not found", async () => {
      const url = "http://localhost:4444/test-route";
      const response = await fetch(url, {
        method: "get",
      });

      expect(response.status).toBe(404);
      expect(await response.json()).toStrictEqual({
        error: {
          message: "No request handler registered for this route",
          name: "not_found",
          details: {
            url: "/test-route",
          },
        },
        success: false,
      });
    });
    it("Should fail with 500 when service method fails", async () => {
      const url = "http://localhost:4444/route-fail-method";
      const response = await fetch(url, {
        method: "get",
      });

      expect(response.status).toBe(500);
      expect(await response.json()).toStrictEqual({
        error: {
          name: "unexpected",
          details: {
            method: "routeFailMethod",
            service: "TestService",
            error: {
              message: "test error",
              stack: expect.any(String),
            },
          },
          message: "An unexpected error occured",
        },
        success: false,
      });
    });
  });

  describe("HTTPS", () => {
    let server: SkhailServer<AppContext>;
    let httpService: HTTPService<AppContext>;

    beforeAll(async () => {
      httpService = new HTTPService({
        protocol: HTTPProtocols.HTTPS,
        tls: {
          key: readFileSync(pathJoin(__dirname, "../assets/server.key")),
          cert: readFileSync(pathJoin(__dirname, "../assets/server.cert")),
        },
        port: 4444,
      });

      httpService.registerRoute(
        "/route-method/:name/:num",
        TestService,
        "routeMethod"
      );
      httpService.registerRoute(
        "/route-fail-method",
        TestService,
        "routeFailMethod"
      );

      const logger = new ConsoleLogger([LogLevel.ERROR]);
      logger.setInstance("server");
      logger["log"] = jest.fn();
      server = new SkhailServer({
        services: [httpService, new TestService()],
        logger,
        queue: new InMemoryQueue(),
        event: new InMemoryEventEmitter(),
      });

      await server.start();
    });

    afterAll(async () => {
      await server?.stop();
    });

    it("Should call service", async () => {
      const url = "https://localhost:4444/route-method/kevin/123";
      const response = await fetch(url, {
        method: "get",
        agent: httpsAgent,
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toStrictEqual({
        tid: "testTransactionId",
        response: { name: "kevin", num: "123" },
        success: true,
      });
    });
  });
});

describe("APIService", () => {
  describe("Global", () => {
    @Expose("test")
    class ExposedService extends SkhailService<any, Events> {
      static identifier: string = "ExposedService";

      @ExposeMethod()
      async list() {
        return { work: "ing" };
      }

      @ExposeMethod({
        mode: "post",
        path: "{id}",
        parameters: [
          { name: "id" },
          { name: "other", in: "query", type: "integer" },
        ],
      })
      async post({ id, other, test }: any) {
        this.network.emit("eventName", ["test", 123]);

        return { id, other, test };
      }
    }
    let server: SkhailServer<AppContext>;
    let service: SkhailService<AppContext>;
    let apiService: APIService<AppContext>;
    let client: ISkhailClient<AppContext>;
    const url = "http://localhost:4444";

    SkhailError.stack = true;

    beforeAll(async () => {
      apiService = new APIService<AppContext>(
        {},
        {
          protocol: HTTPProtocols.HTTP,
          port: 4444,
        }
      );

      const logger = new ConsoleLogger([LogLevel.ERROR]);
      logger.setInstance("server");
      logger["log"] = jest.fn();
      service = new ExposedService();
      server = new SkhailServer<AppContext>({
        services: [apiService, service],
        logger,
        queue: new InMemoryQueue(),
        event: new InMemoryEventEmitter(),
      });

      client = new HTTPInterface<AppContext>({
        logger,
        host: "localhost",
        port: 4444,
        protocol: HTTPProtocols.HTTP,
        event: true,
      });

      await server.start();
      await client.start();
    });

    afterAll(async () => {
      await client?.stop();
      await server?.stop();
    });

    describe("Client", () => {
      it("Should call service", async () => {
        await expect(client.get(ExposedService).list()).resolves.toMatchObject({
          work: "ing",
        });
      });
    });
  });

  // TODO: For some reason it does not pass anymore...
  describe.skip("HTTPS", () => {
    let server: SkhailServer<AppContext>;
    let apiService: APIService<AppContext>;
    let client: ISkhailClient<AppContext>;

    beforeAll(async () => {
      apiService = new APIService(
        {},
        {
          protocol: HTTPProtocols.HTTPS,
          tls: {
            key: readFileSync(pathJoin(__dirname, "../assets/server.key")),
            cert: readFileSync(pathJoin(__dirname, "../assets/server.cert")),
          },
          port: 4444,
        }
      );

      const logger = new ConsoleLogger([LogLevel.ERROR]);
      logger.setInstance("server");
      logger["log"] = jest.fn();
      server = new SkhailServer({
        services: [apiService, new TestService()],
        logger,
        queue: new InMemoryQueue(),
        event: new InMemoryEventEmitter(),
      });

      client = new HTTPInterface<AppContext>({
        logger,
        host: "localhost",
        port: 4444,
        protocol: HTTPProtocols.HTTPS,
        event: true,
      });

      await server.start();
      await client.start();
    });

    afterAll(async () => {
      await client?.stop();
      await server?.stop();
    });

    it("Should call service", async () => {
      const result = await client.get(TestService).testMethod("test name");

      expect(result).toStrictEqual({ name: "test name" });
    });
  });
});

describe("WebSocket", () => {
  @Expose("testws")
  class TestWebSocket extends WebSocketService<AppContext, {}> {
    static identifier = "ws-Service";

    testWs(socket: ws.WebSocket, name: string, num: number): void {
      socket.send(JSON.stringify({ name, num }));

      socket.close();
    }
    failWs(_socket: ws.WebSocket): void {
      throw new Error("test error");
    }

    @ExposeMethod({ path: "negociate" })
    negociate<
      Key extends keyof Service,
      Service extends WebSocketFunctions<Omit<any, "negociate">>,
      Function extends Service[Key],
      Params extends WebSocketFunctionArgs<Parameters<Function>>
    >({ method, args }: { method: Key; args: Params }): Promise<string> {
      return super.negociate({ method: method as any, args });
    }
  }

  let server: SkhailServer<AppContext>;
  let wsService: TestWebSocket;
  let client: ISkhailClient<AppContext>;

  beforeAll(async () => {
    wsService = new TestWebSocket(undefined, {
      port: 4444,
    });

    const logger = new ConsoleLogger([LogLevel.ERROR]);
    logger.setInstance("server");
    logger["log"] = jest.fn();
    server = new SkhailServer<AppContext>({
      services: [
        wsService,
        new APIService(
          {},
          {
            port: 4445,
          }
        ),
      ],
      logger,
      queue: new InMemoryQueue(),
      event: new InMemoryEventEmitter(),
    });

    client = new HTTPInterface<AppContext>({
      logger,
      host: "localhost",
      port: 4445,
      protocol: HTTPProtocols.HTTP,
    });

    await server.start();
    await client.start();
  });

  afterAll(async () => {
    await client?.stop();
    await server?.stop();
  });

  it("Should open websocket connection", async () => {
    const url = await client
      .get(TestWebSocket)
      .negociate({ method: "testWs", args: ["test name", 12] as any });

    const websocket = new ws.WebSocket("ws://localhost:4444" + url);

    await new Promise<void>((resolve) => {
      websocket.onmessage = (message) => {
        expect(JSON.parse(message.data.toString())).toStrictEqual({
          name: "test name",
          num: 12,
        });

        resolve();
      };
    });
  });
  it("Should propagate error", async () => {
    const url = await client
      .get(TestWebSocket)
      .negociate({ method: "failWs", args: [] as any });

    const websocket = new ws.WebSocket("ws://localhost:4444" + url);

    const spy = jest.fn();
    await new Promise<void>((resolve) => {
      websocket.on("close", (code, reason) => {
        if (code > 1005) {
          spy();
          expect(reason.toString()).toBe("test error");
        }

        resolve();
      });
    });

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
