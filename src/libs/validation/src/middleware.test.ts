/**
 * @group unit
 */
import { ValidationMiddleware } from "./middleware";

import Joi from "joi";
import { ValidationError } from "./types";

describe("ValidationMiddleware", () => {
  it("Should process enveloppe with success", async () => {
    // Arrange
    const middleware = new ValidationMiddleware<any>({
      joi: [],
      func: () => [] as any,
    });

    // Act
    // Assert
    await expect(
      middleware.process({
        service: "service name",
        method: "joi",
        args: [],
        context: {} as any,
      })
    ).resolves.toBeUndefined();
  });

  it("Should process enveloppe and fail with Joi object", async () => {
    // Arrange
    const validateSpy = jest
      .fn()
      .mockReturnValue({ error: new Error("test error") });
    jest.spyOn(Joi, "string").mockReturnValue({
      validate: validateSpy,
    } as any);
    const middleware = new ValidationMiddleware<any>({
      joi: [Joi.string()],
      func: () => [] as any,
    });

    // Act
    await expect(
      middleware.process({
        service: "service name",
        method: "joi",
        args: ["test value"],
        context: {} as any,
      })
    ).rejects.toThrow("Validation middleware error.");

    // Assert
    expect(validateSpy).toBeCalledTimes(1);
    expect(validateSpy).toBeCalledWith("test value");
  });

  it("Should process enveloppe and succeed with Joi object", async () => {
    // Arrange
    const validateSpy = jest.fn().mockReturnValue({});
    jest.spyOn(Joi, "string").mockReturnValue({
      validate: validateSpy,
    } as any);
    const middleware = new ValidationMiddleware<any>({
      joi: [Joi.string()],
      func: () => [] as any,
    });

    // Act
    await expect(
      middleware.process({
        service: "service name",
        method: "joi",
        args: ["test value"],
        context: {} as any,
      })
    ).resolves.toBeUndefined();

    // Assert
    expect(validateSpy).toBeCalledTimes(1);
    expect(validateSpy).toBeCalledWith("test value");
  });

  it("Should process enveloppe and fail when validator when is provided", async () => {
    // Arrange
    const validateSpy = jest
      .fn()
      .mockReturnValue([new ValidationError("test error", 0)]);
    const middleware = new ValidationMiddleware<any>({
      joi: [Joi.string()],
      func: validateSpy,
    });

    // Act
    await expect(
      middleware.process({
        service: "service name",
        method: "func",
        args: ["test value", "second one"],
        context: {} as any,
      })
    ).rejects.toThrow("Validation middleware error.");

    // Assert
    expect(validateSpy).toBeCalledTimes(1);
    expect(validateSpy).toBeCalledWith("test value", "second one");
  });

  it("Should ignore enveloppe when method has no validation configuration", async () => {
    // Arrange
    const middleware = new ValidationMiddleware<any>();

    // Act
    // Assert
    await expect(
      middleware.process({
        service: "service name",
        method: "not found",
        args: [],
        context: {} as any,
      })
    ).resolves.toBeUndefined();
  });
});
