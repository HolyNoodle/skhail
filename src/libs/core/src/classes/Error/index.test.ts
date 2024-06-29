/**
 * @group unit
 */

import { getError, SkhailError } from ".";

describe("SkhailError", () => {
  it("Should convert to object", () => {
    const error = new SkhailError({
      message: "test",
      name: "unexpected",
      details: { context: "test" },
    });

    expect(error.toObject()).toStrictEqual({
      message: "test",
      name: "unexpected",
      details: { context: "test" },
    });
  });

  it("Should convert to json string", () => {
    const error = new SkhailError({
      message: "test",
      name: "unexpected",
      details: { context: "test" },
    });

    expect(JSON.parse(error.toString())).toStrictEqual({
      message: "test",
      name: "unexpected",
      details: { context: "test" },
    });
  });

  it("Should create error with default properties", () => {
    const error = new SkhailError();

    expect(error.toObject()).toStrictEqual({
      message: "An unexpected error occured",
      name: "unexpected",
      details: {},
    });
  });
});

describe("Error", () => {
  it("Should convert to object", () => {
    const error = new Error("test message") as any;

    expect(error.toObject()).toStrictEqual({
      message: "test message",
    });
  });

  it("Should convert to JSON", () => {
    const error = new Error("test message") as any;

    expect(error.toObject()).toStrictEqual({
      message: "test message",
    });
  });
});

describe("getError", () => {
  it("Should return SkhailError", () => {
    const error = new SkhailError({ message: "test", name: "unexpected" });

    const result = getError(error);

    expect(result).toBe(error);
  });

  it("Should not set default properties on SkhailError", () => {
    const error = new SkhailError({ message: "test", name: "unexpected" });

    const result = getError(error, undefined, {
      name: "denied",
      message: "youyou",
    });

    expect(result.toObject()).toStrictEqual({
      message: "test",
      name: "unexpected",
      details: {},
    });
  });

  it("Should set default properties on error", () => {
    const error = new Error("test");

    const result = getError(error, undefined, {
      name: "denied",
      message: "youyou",
    });

    expect(result.toObject()).toStrictEqual({
      message: "youyou",
      name: "denied",
      details: {
        error: { message: "test" },
      },
    });
  });

  it("Should return SkhailError with details", () => {
    const error = new SkhailError({ message: "test", name: "unexpected" });

    const result = getError(error, { context: "test" });

    expect(result.toObject()).toStrictEqual({
      message: "test",
      name: "unexpected",
      details: { context: "test" },
    });
  });

  it("Should return SkhailError with merged details", () => {
    const error = new SkhailError({
      message: "test",
      name: "unexpected",
      details: { original: "context" },
    });

    const result = getError(error, { context: "test" });

    expect(result.toObject()).toStrictEqual({
      message: "test",
      name: "unexpected",
      details: {
        original: "context",
        context: "test",
      },
    });
  });

  it("Should wrap Error in SkhailError", () => {
    const error = new Error("test");

    const result = getError(error);

    expect(result.toObject()).toStrictEqual({
      message: "An unexpected error occured",
      name: "unexpected",
      details: { error: { message: "test" } },
    });
  });

  it("Should wrap string in SkhailError", () => {
    const error = "test error message";

    const result = getError(error);

    expect(result.toObject()).toStrictEqual({
      message: error,
      name: "unexpected",
      details: {},
    });
  });

  it("Should wrap string in SkhailError with default message", () => {
    const error = "test error message";

    const result = getError(error, undefined, { message: "test message" });

    expect(result.toObject()).toStrictEqual({
      message: "test message",
      name: "unexpected",
      details: { error: { message: error } },
    });
  });

  it("Should use any object when it can't be turned to error object", () => {
    const error = { other: "test error message" };

    const result = getError(error, undefined, { message: "test message" });

    expect(result.toObject()).toStrictEqual({
      message: "test message",
      name: "unexpected",
      details: { error },
    });
  });
});
