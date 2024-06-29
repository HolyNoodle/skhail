/**
 * @group unit
 */
import { SkhailError, SkhailService } from "@skhail/core";

import { TransactionExecutionCompensator } from "./ExecutionCompensator";

class TestService extends SkhailService {
  static identifier = "TestService";

  async create(name: string) {}
}

describe("ExecutionCompensator", () => {
  it("Should execute compensator", async () => {
    // Arrange
    const argGenSpy = jest.fn(() => ["test"]);
    const compensator = new TransactionExecutionCompensator(
      TestService,
      "create",
      argGenSpy as any
    );
    TestService.prototype.create = jest.fn().mockResolvedValue(undefined);
    const client = {
      get: jest.fn(() => new TestService()),
    } as any;

    // Act
    await compensator.execute(client, "test return arg");

    // Assert
    expect(argGenSpy).toBeCalledTimes(1);
    expect(argGenSpy).toBeCalledWith("test return arg");

    expect(TestService.prototype.create).toBeCalledTimes(1);
    expect(TestService.prototype.create).toBeCalledWith("test");
  });

  it("Should fail and register error when method fails", async () => {
    // Arrange
    const argGenSpy = jest.fn(() => ["test"]);
    const compensator = new TransactionExecutionCompensator(
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
    await expect(
      compensator.execute(client, "test return arg")
    ).rejects.toThrow();

    // Assert
    expect(argGenSpy).toBeCalledTimes(1);
    expect(argGenSpy).toBeCalledWith("test return arg");
    expect(TestService.prototype.create).toBeCalledTimes(1);
    expect(TestService.prototype.create).toBeCalledWith("test");
    expect(compensator.getError()).toBeDefined();
    expect(compensator.getError()).toBeInstanceOf(SkhailError);
    expect(compensator.getError()!.toObject()).toStrictEqual({
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

  it("Should clone compensator", async () => {
    // Arrange
    const argGenSpy = jest.fn(() => ["test"]);
    const compensator = new TransactionExecutionCompensator(
      TestService,
      "create",
      argGenSpy as any
    );

    // Act
    const clone = compensator.clone();

    // Assert
    expect(clone).not.toBe(compensator);
    expect(clone).toBeInstanceOf(TransactionExecutionCompensator);
    expect(clone).toStrictEqual(compensator);
  });
});
