/**
 * @group unit
 */
import { faultProofRetry } from "./faultProofRetry";
import { SkhailError } from "@skhail/core";

describe("faultProofRetry", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  it("should resolve where the function succeeds", async () => {
    // Arrange
    const fn = jest.fn().mockResolvedValue("result");
    const errorHandler = jest.fn();

    // Act
    const result = await faultProofRetry("action", fn, errorHandler, 5, 10);

    // Assert
    expect(result).toBe("result");
    expect(fn).toHaveBeenCalledTimes(1);
    expect(errorHandler).toHaveBeenCalledTimes(0);
  });

  it("Should call the error handler when the function fails", async () => {
    // Arrange
    const fn = jest.fn().mockRejectedValue(new Error("test error"));
    const errorHandler = jest.fn();

    // Act
    const promise = faultProofRetry("action", fn, errorHandler, 0, 1);

    // Assert
    await expect(promise).rejects.toThrow("Max attempts reached while action");
    expect(fn).toHaveBeenCalledTimes(1);
    expect(errorHandler).toHaveBeenCalledTimes(1);
    expect(errorHandler).toHaveBeenCalledWith(expect.any(SkhailError), 1);
  });

  it("Should retry the function when it fails", async () => {
    // Arrange
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error("test error"))
      .mockResolvedValue("result");
    const errorHandler = jest.fn();

    // Act
    const promise = faultProofRetry("action", fn, errorHandler, 0, 2);

    await jest.advanceTimersToNextTimerAsync();
    const result = await promise;

    // Assert
    expect(result).toBe("result");
    expect(fn).toHaveBeenCalledTimes(2);
    expect(errorHandler).toHaveBeenCalledTimes(1);
  });

  it("Should retry the function with default parameters", async () => {
    // Arrange
    const fn = jest.fn().mockRejectedValue(new Error("test error"));
    const errorHandler = jest.fn();
    let error: any;

    // Act
    const promise = faultProofRetry("action", fn, errorHandler).catch((e) => {
      error = e;
    });

    for (let i = 0; i < 120; i++) {
      await jest.advanceTimersToNextTimerAsync();
    }

    // Assert
    expect(error.toObject()).toStrictEqual({
      details: {},
      message: "Max attempts reached while action",
      name: "unexpected",
    });
    expect(fn).toHaveBeenCalledTimes(120);
    expect(errorHandler).toHaveBeenCalledTimes(120);
  });
});
