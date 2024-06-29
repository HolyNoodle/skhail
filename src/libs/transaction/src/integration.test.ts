/**
 * @group integration
 */
import {
  ConsoleLogger,
  InMemoryQueue,
  LogLevel,
  SkhailServer,
  SkhailService,
} from "@skhail/core";

import { Transaction, TransactionClient } from ".";

import { TransactionService } from "./server";

class TestService extends SkhailService {
  static identifier = "Test";

  async create(name: string, age: number) {
    if (name === "error") {
      throw new Error("name error");
    }

    return { name, age, id: name !== "compensate" ? "1" : "error" };
  }
  async delete(id: string) {
    if (id === "error") {
      throw new Error("compensate error");
    }

    return true;
  }
  async register(code: string) {
    if (code === "error") {
      throw new Error("code error");
    }

    return false;
  }
}

describe("Transaction", () => {
  const txCreate = new Transaction<
    [string, number, string],
    [{ name: string; age: number; id: string }, boolean]
  >("createTest");

  txCreate.step({
    service: TestService,
    method: "create",
    func: (name, age) => [name, age] as any,
    compensate: {
      service: TestService,
      method: "delete",
      func: ({ id }) => [id] as any,
    },
  });

  txCreate.step({
    service: TestService,
    method: "register",
    func: (_, _1, code) => [code] as any,
  });

  const testService = new TestService();
  let server: SkhailServer;

  beforeEach(async () => {
    server = new SkhailServer({
      services: [testService, new TransactionService()],
      logger: new ConsoleLogger([LogLevel.ERROR]),
      queue: new InMemoryQueue(),
    });

    await server.start();
  });

  it("Should execute create without compensating", async () => {
    const client = new TransactionClient(server);

    const result = await client.run(txCreate, "test name", 12, "code test");

    expect(result).toStrictEqual([
      { name: "test name", age: 12, id: "1" },
      false,
    ]);
  });

  it("Should execute create but fail", async () => {
    const client = new TransactionClient(server);

    let error;
    try {
      await client.run(txCreate, "error", 12, "code test");
    } catch (e: any) {
      error = e;
    }

    expect(error).toBeDefined();
    expect(error.toObject()).toStrictEqual({
      name: "unexpected",
      details: {
        errors: [
          {
            name: "unexpected",
            details: {
              error: {
                message: "name error",
              },
              method: "create",
              service: "Test",
            },
            message: "An unexpected error occured",
          },
        ],
        method: "run",
        service: "SkhailTransactionService",
      },
      message: "Transaction failed, compensation success",
    });
  });

  it("Should compensate create when register fails", async () => {
    const client = new TransactionClient(server);

    let error;
    try {
      await client.run(txCreate, "test name", 12, "error");
    } catch (e: any) {
      error = e;
    }

    expect(error).toBeDefined();
    expect(error.toObject()).toStrictEqual({
      name: "unexpected",
      details: {
        errors: [
          {
            name: "unexpected",
            details: {
              error: {
                message: "code error",
              },
              method: "register",
              service: "Test",
            },
            message: "An unexpected error occured",
          },
        ],
        method: "run",
        service: "SkhailTransactionService",
      },
      message: "Transaction failed, compensation success",
    });
  });

  it("Should fail compensate create when register fails and delete fails", async () => {
    const client = new TransactionClient(server);

    let error;
    try {
      await client.run(txCreate, "compensate", 12, "error");
    } catch (e: any) {
      error = e;
    }

    expect(error).toBeDefined();
    expect(error.toObject()).toStrictEqual({
      name: "unexpected",
      details: {
        compensationErrors: [
          {
            name: "unexpected",
            details: {
              error: {
                message: "compensate error",
              },
              method: "delete",
              service: "Test",
            },
            message: "An unexpected error occured",
          },
        ],
        errors: [
          {
            name: "unexpected",
            details: {
              error: {
                message: "code error",
              },
              method: "register",
              service: "Test",
            },
            message: "An unexpected error occured",
          },
        ],
        method: "run",
        service: "SkhailTransactionService",
      },
      message: "Transaction failed, compensation failed",
    });
  });
});
