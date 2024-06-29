/**
 * @group integration
 */
import Joi from "joi";

import {
  ConsoleLogger,
  InMemoryQueue,
  LogLevel,
  Middleware,
  SkhailServer,
  SkhailService,
} from "@skhail/core";

import { ValidationMiddleware } from "./middleware";

import { ValidationError } from "./types";

class TestService extends SkhailService {
  static identifier = "Test";
  protected static middlewares: Middleware<any, any>[] = [
    new ValidationMiddleware<TestService>({
      create: [Joi.string().required(), Joi.number().required()],
      delete: (id) => {
        if (id === "error") {
          return Promise.resolve([new ValidationError("error validator", 0)]);
        }

        return Promise.resolve([]);
      },
    }),
  ];

  async create(name: string, age: number) {
    return true;
  }
  async delete(id: string) {
    return true;
  }
}

describe("Validation", () => {
  const testService = new TestService();
  let server: SkhailServer;

  beforeEach(async () => {
    server = new SkhailServer({
      services: [testService],
      logger: new ConsoleLogger([LogLevel.ERROR]),
      queue: new InMemoryQueue(),
    });

    await server.start();
  });

  it("Should succeed validate create", async () => {
    await expect(
      server.get(TestService).create("test", 12)
    ).resolves.toBeTruthy();
  });

  it("Should fail validate create", async () => {
    let error;
    try {
      await server.get(TestService).create(12 as any, 12);
    } catch (e: any) {
      error = e;
    }

    expect(error).toBeDefined();
    expect(error.toObject()).toStrictEqual({
      details: {
        errors: [
          {
            details: {
              index: 0,
            },
            message: '"value" must be a string',
            name: "invalid_params",
          },
        ],
        method: "create",
        service: "Test",
        tid: expect.any(String),
      },
      message: "Validation middleware error.",
      name: "validation_failed",
    });
  });

  it("Should succeed validate delete", async () => {
    await expect(server.get(TestService).delete("test")).resolves.toBeTruthy();
  });

  it("Should fail validate delete", async () => {
    let error: any;
    try {
      await server.get(TestService).delete("error");
    } catch (e: any) {
      error = e;
    }

    expect(error).toBeDefined();
    expect(error.toObject()).toStrictEqual({
      details: {
        errors: [
          {
            details: {
              index: 0,
            },
            message: "error validator",
            name: "invalid_params",
          },
        ],
        method: "delete",
        service: "Test",
        tid: expect.any(String),
      },
      message: "Validation middleware error.",
      name: "validation_failed",
    });
  });
});
