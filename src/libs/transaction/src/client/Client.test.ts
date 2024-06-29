/**
 * @group unit
 */
import { SkhailService } from "@skhail/core";

import { TransactionClient } from "./Client";
import { Transaction } from "./Transaction";
import { ITransactionService } from "./IService";

class TestService extends SkhailService {
  static identifier = "TestService";

  async create(name: string) {
    return { name };
  }
  async compensate(_: string) {}
}

describe("TransactionClient", () => {
  const transaction = new Transaction("test tx");
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("Should execute transaction service run", async () => {
    // Arrange
    const expectedResult = { name: "result" };
    const service = { run: jest.fn().mockResolvedValue(expectedResult) };
    const server = { get: jest.fn().mockReturnValue(service) } as any;
    const client = new TransactionClient(server);

    // Act
    const result = await client.run(transaction);

    // Assert
    expect(server.get).toBeCalledTimes(1);
    expect(server.get).toBeCalledWith(ITransactionService);

    expect(result).toStrictEqual({ name: "result" });
  });
});
