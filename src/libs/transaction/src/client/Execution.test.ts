/**
 * @group unit
 */
import { SkhailService } from "@skhail/core";

import { TransactionExecution } from "./Execution";
import { TransactionExecutionCompensator } from "./ExecutionCompensator";

jest.mock("./ExecutionCompensator");

class TestService extends SkhailService {
  static identifier = "TestService";

  async create(name: string) {
    return { name };
  }
  async compensate(_: string) {}
}

describe("Execution", () => {
  it("Should execute method", async () => {
    // Arrange
    const argGenSpy = jest.fn(() => ["test name"]);
    const execution = new TransactionExecution(
      TestService,
      "create",
      argGenSpy as any
    );
    TestService.prototype.create = jest
      .fn()
      .mockResolvedValue({ name: "result" });
    const client = {
      get: jest.fn(() => new TestService()),
    } as any;

    // Act
    await execution.execute(client, "test arg");

    // Assert
    expect(argGenSpy).toBeCalledTimes(1);
    expect(argGenSpy).toBeCalledWith("test arg");

    expect(TestService.prototype.create).toBeCalledTimes(1);
    expect(TestService.prototype.create).toBeCalledWith("test name");

    expect(execution.getStatus()).toBe("success");
    expect(execution.getResult()).toStrictEqual({ name: "result" });
  });

  it("Should not execute method if already executed", async () => {
    // Arrange
    const argGenSpy = jest.fn(() => ["test name"]);
    const execution = new TransactionExecution(
      TestService,
      "create",
      argGenSpy as any
    );
    TestService.prototype.create = jest
      .fn()
      .mockResolvedValue({ name: "result" });
    const client = {
      get: jest.fn(() => new TestService()),
    } as any;

    // Act
    await expect(execution.execute(client, "test arg")).resolves;
    await expect(execution.execute(client, "test arg")).rejects.toThrow(
      "Transaction execution already executed"
    );

    // Assert
    expect(argGenSpy).toBeCalledTimes(1);
    expect(argGenSpy).toBeCalledWith("test arg");

    expect(TestService.prototype.create).toBeCalledTimes(1);
    expect(TestService.prototype.create).toBeCalledWith("test name");
  });

  it("Should not execute method if already executing", async () => {
    // Arrange
    const argGenSpy = jest.fn(() => ["test name"]);
    const execution = new TransactionExecution(
      TestService,
      "create",
      argGenSpy as any
    );
    TestService.prototype.create = jest
      .fn()
      .mockResolvedValue({ name: "result" });
    const client = {
      get: jest.fn(() => new TestService()),
    } as any;

    // Act
    const promise = execution.execute(client, "test arg");
    await expect(execution.execute(client, "test arg")).rejects.toThrow(
      "Transaction execution already pending"
    );
    await expect(promise).resolves;

    // Assert
    expect(argGenSpy).toBeCalledTimes(1);
    expect(argGenSpy).toBeCalledWith("test arg");

    expect(TestService.prototype.create).toBeCalledTimes(1);
    expect(TestService.prototype.create).toBeCalledWith("test name");
  });

  it("Should register error when execute fails", async () => {
    // Arrange
    const argGenSpy = jest.fn(() => ["test name"]);
    const execution = new TransactionExecution(
      TestService,
      "create",
      argGenSpy as any
    );
    TestService.prototype.create = jest
      .fn()
      .mockRejectedValue(new Error("test error"));
    const client = {
      get: jest.fn(() => new TestService()),
    } as any;

    // Act
    await expect(execution.execute(client, "test arg")).rejects.toThrow();

    // Assert
    expect(argGenSpy).toBeCalledTimes(1);
    expect(argGenSpy).toBeCalledWith("test arg");

    expect(TestService.prototype.create).toBeCalledTimes(1);
    expect(TestService.prototype.create).toBeCalledWith("test name");

    expect(execution.getStatus()).toBe("failed");
    expect(execution.getResult()).toBeUndefined();
    expect(execution.getError()!.toObject()).toStrictEqual({
      name: "unexpected",
      details: {
        error: {
          message: "test error",
        },
      },
      message: "An unexpected error occured",
      name: "unexpected",
    });
  });

  it("Should execute compensator", async () => {
    // Arrange
    const argGenSpy = jest.fn(() => ["test name"]);
    const compensator = new TransactionExecutionCompensator(
      TestService,
      "compensate",
      jest.fn((o: { name: string }) => [o.name])
    );
    const execution = new TransactionExecution(
      TestService,
      "create",
      argGenSpy as any,
      compensator
    );
    TestService.prototype.create = jest
      .fn()
      .mockRejectedValue(new Error("test error"));
    const client = {
      get: jest.fn(() => new TestService()),
    } as any;
    execution["result"] = { name: "test name" };

    // Act
    await execution.compensate(client);

    // Assert
    expect(TransactionExecutionCompensator.prototype.execute).toBeCalledTimes(
      1
    );
    expect(TransactionExecutionCompensator.prototype.execute).toBeCalledWith(
      client,
      execution["result"]
    );

    expect(execution.getStatus()).toBe("compensated");
  });

  it("Should register compensator error when compensate fails", async () => {
    // Arrange
    TransactionExecutionCompensator.prototype.execute = jest
      .fn()
      .mockRejectedValue(new Error("test error"));

    const argGenSpy = jest.fn(() => ["test name"]);
    const compensator = new TransactionExecutionCompensator(
      TestService,
      "compensate",
      jest.fn((o: { name: string } = { name: "" }) => [o.name])
    );
    const execution = new TransactionExecution(
      TestService,
      "create",
      argGenSpy as any,
      compensator
    );
    const client = {
      get: jest.fn(() => new TestService()),
    } as any;
    execution["result"] = { name: "test name" };

    // Act
    await expect(execution.compensate(client)).rejects.toThrow();

    // Assert
    expect(TransactionExecutionCompensator.prototype.execute).toBeCalledTimes(
      1
    );
    expect(TransactionExecutionCompensator.prototype.execute).toBeCalledWith(
      client,
      execution["result"]
    );

    expect(execution.getStatus()).toBe("compensation_failed");
    expect(execution.getError()!.toObject()).toStrictEqual({
      name: "unexpected",
      details: {
        error: {
          message: "test error",
        },
      },
      message: "An unexpected error occured",
      name: "unexpected",
    });
  });

  it("Should ignore compensator error when no compensator provided", async () => {
    // Arrange
    const argGenSpy = jest.fn(() => ["test name"]);
    const execution = new TransactionExecution(
      TestService,
      "create",
      argGenSpy as any
    );
    const client = {
      get: jest.fn(() => new TestService()),
    } as any;
    execution["result"] = { name: "test name" };

    // Act
    await execution.compensate(client);

    // Assert
    expect(execution.getStatus()).toBe("compensation_ignored");
  });

  it("Should clone execution", async () => {
    // Arrange
    TransactionExecutionCompensator.prototype.clone = jest
      .fn()
      .mockReturnValue({ new: "compensator" });

    const argGenSpy = jest.fn(() => ["test name"]);
    const execution = new TransactionExecution(
      TestService,
      "create",
      argGenSpy as any,
      new TransactionExecutionCompensator(TestService, "compensate", jest.fn())
    );
    execution["result"] = { name: "test name" };

    // Act
    const clone = execution.clone();

    // Assert
    expect(clone).not.toBe(execution);
    expect(clone["service"]).toBe(execution["service"]);
    expect(clone["method"]).toBe(execution["method"]);
    expect(clone["args"]).toStrictEqual(execution["args"]);
    expect(clone["compensator"]).toStrictEqual({ new: "compensator" });
    expect(clone["result"]).toBe(undefined);
    expect(clone["error"]).toBe(undefined);
    expect(clone["status"]).toBe("idle");
  });
});
