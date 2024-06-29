/**
 * @group unit
 */
import { Transaction } from "../client";
import { TransactionService } from "./Service";

describe("TransactionService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("Should execute transaction", async () => {
    // Arrange
    const runSpy = jest.fn().mockResolvedValue({ name: "result" });
    const transaction = {
      clone: jest.fn().mockReturnValue({ run: runSpy }),
    };
    const server = { prop: "server" } as any;
    Transaction.get = jest.fn().mockReturnValue(transaction);
    const service = new TransactionService();
    service["network"] = server;

    // Act
    const result = await service.run("test id", ["params1", 12]);

    // Assert
    expect(transaction.clone).toBeCalledTimes(1);
    expect(transaction.clone).toBeCalledWith();

    expect(runSpy).toBeCalledTimes(1);
    expect(runSpy).toBeCalledWith(server, "params1", 12);

    expect(result).toStrictEqual({ name: "result" });
  });

  it("Should throw error if transaction not found", async () => {
    // Arrange
    const server = { prop: "server" } as any;
    Transaction.get = jest.fn().mockReturnValue(undefined);
    const service = new TransactionService();
    service["network"] = server;

    // Act
    const promise = service.run("test id", ["params1", 12]);

    // Assert
    await expect(promise).rejects.toThrow("Transaction not found");
  });
});
