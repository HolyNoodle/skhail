/**
 * @group unit
 */
import { SkhailService, getError } from "@skhail/core";

import { TransactionExecution } from "./Execution";
import { Transaction } from "./Transaction";
import { TransactionExecutionCompensator } from "./ExecutionCompensator";

jest.mock("./Execution");
jest.mock("./ExecutionCompensator");

class TestService extends SkhailService {
  static identifier = "TestService";

  async create(name: string) {
    return { name };
  }
  async fails(name: string) {
    throw new Error("test error");
  }
  async compensate(_: string) {}
}

describe("Transaction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it("Should register transaction", () => {
    // Arrange
    // Act
    const transaction = new Transaction<[string]>("test tx");

    // Assert
    expect(Transaction.get("test tx")).toBe(transaction);
  });

  it("Should register transaction step", () => {
    // Arrange
    const transaction = new Transaction<[string]>("test tx");

    // Act
    transaction.step({
      service: TestService,
      method: "create",
      func: () => ["test name"],
    });

    // Assert
    expect(TransactionExecution).toBeCalledTimes(1);
    expect(TransactionExecution).toBeCalledWith(
      TestService,
      "create",
      expect.any(Function),
      undefined
    );
  });

  it("Should register transaction step with compensator", () => {
    // Arrange
    const transaction = new Transaction<[string]>("test tx");

    // Act
    transaction.step({
      service: TestService,
      method: "create",
      func: () => ["test name"],
      compensate: {
        service: TestService,
        method: "compensate",
        func: () => ["test name"],
      },
    });

    // Assert
    expect(TransactionExecutionCompensator).toBeCalledTimes(1);
    expect(TransactionExecutionCompensator).toBeCalledWith(
      TestService,
      "compensate",
      expect.any(Function)
    );

    expect(TransactionExecution).toBeCalledTimes(1);
    expect(TransactionExecution).toBeCalledWith(
      TestService,
      "create",
      expect.any(Function),
      expect.any(TransactionExecutionCompensator)
    );
  });

  it("Should execute transaction", async () => {
    // Arrange
    TransactionExecution.prototype.getResult = jest
      .fn()
      .mockReturnValue({ name: "result" });
    TransactionExecution.prototype.getStatus = jest
      .fn()
      .mockReturnValue("success");
    const transaction = new Transaction<[string]>("test tx").step({
      service: TestService,
      method: "create",
      func: () => ["test name"],
    });
    const client = {
      get: jest.fn(() => new TestService()),
    } as any;

    // Act
    const result = await transaction.run(client, "test args");

    // Assert
    expect(TransactionExecution.prototype.execute).toBeCalledTimes(1);
    expect(TransactionExecution.prototype.execute).toBeCalledWith(
      client,
      "test args"
    );

    expect(TransactionExecution.prototype.getResult).toBeCalledTimes(1);
    expect(TransactionExecution.prototype.getResult).toBeCalledWith();

    expect(result).toStrictEqual([{ name: "result" }]);
  });

  it("Should compensate step when execution fails", async () => {
    // Arrange
    TransactionExecution.prototype.getResult = jest
      .fn()
      .mockReturnValue({ name: "result" });

    TransactionExecution.prototype.getError = jest
      .fn()
      .mockReturnValue(getError(new Error("test error")));

    TransactionExecution.prototype.getStatus = jest
      .fn()
      .mockReturnValue("success")
      .mockReturnValueOnce("failed");

    const transaction = new Transaction<[string]>("test tx");
    transaction.step({
      service: TestService,
      method: "fails",
      func: () => ["test fails"],
    });
    transaction.step({
      service: TestService,
      method: "create",
      func: () => ["test name"],
      compensate: {
        service: TestService,
        method: "compensate",
        func: () => ["test compensate"],
      },
    });
    const client = {
      get: jest.fn(() => new TestService()),
    } as any;

    // Act
    await expect(transaction.run(client, "test args")).rejects.toThrow(
      "Transaction failed, compensation success"
    );

    // Assert
    expect(TransactionExecution.prototype.execute).toBeCalledTimes(2);
    expect(TransactionExecution.prototype.execute).toHaveBeenNthCalledWith(
      1,
      client,
      "test args"
    );
    expect(TransactionExecution.prototype.execute).toHaveBeenNthCalledWith(
      2,
      client,
      "test args"
    );

    expect(TransactionExecution.prototype.compensate).toBeCalledTimes(1);
    expect(TransactionExecution.prototype.compensate).toBeCalledWith(
      client,
      "test args"
    );
  });

  it("Should fail when compensation fails", async () => {
    // Arrange
    TransactionExecution.prototype.getResult = jest
      .fn()
      .mockReturnValue({ name: "result" });

    TransactionExecution.prototype.getError = jest
      .fn()
      .mockReturnValue(getError(new Error("test error")));

    TransactionExecution.prototype.getStatus = jest
      .fn()
      .mockReturnValue("success")
      .mockReturnValueOnce("failed")
      .mockReturnValueOnce("success")
      .mockReturnValueOnce("compensation_failed")
      .mockReturnValueOnce("compensation_failed");

    TransactionExecution.prototype.compensate = jest
      .fn()
      .mockRejectedValue(getError(new Error("test compensate error")));

    const transaction = new Transaction<[string]>("test tx");
    transaction.step({
      service: TestService,
      method: "fails",
      func: () => ["test fails"],
    });
    transaction.step({
      service: TestService,
      method: "create",
      func: () => ["test name"],
      compensate: {
        service: TestService,
        method: "compensate",
        func: () => ["test compensate"],
      },
    });
    const client = {
      get: jest.fn(() => new TestService()),
    } as any;

    // Act
    await expect(transaction.run(client, "test args")).rejects.toThrow(
      "Transaction failed, compensation failed"
    );

    // Assert
    expect(TransactionExecution.prototype.execute).toBeCalledTimes(2);
    expect(TransactionExecution.prototype.execute).toHaveBeenNthCalledWith(
      1,
      client,
      "test args"
    );
    expect(TransactionExecution.prototype.execute).toHaveBeenNthCalledWith(
      2,
      client,
      "test args"
    );

    expect(TransactionExecution.prototype.compensate).toBeCalledTimes(1);
    expect(TransactionExecution.prototype.compensate).toBeCalledWith(
      client,
      "test args"
    );
  });

  it("Should clone transaction", () => {
    // Arrange
    TransactionExecution.prototype.clone = jest
      .fn()
      .mockReturnValue({ prop: "clone" });

    const transaction = new Transaction<[string]>("test tx");
    transaction.step({
      service: TestService,
      method: "create",
      func: () => ["test name"],
    });

    // Act
    const clone = transaction.clone();

    // Assert
    expect(clone).not.toBe(transaction);
    expect(clone.getId()).toBe(transaction.getId());
    expect(clone["steps"]).toStrictEqual([{ prop: "clone" }]);

    expect(TransactionExecution.prototype.clone).toHaveBeenCalledTimes(1);
  });
});
