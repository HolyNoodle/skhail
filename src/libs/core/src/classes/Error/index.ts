import { ErrorCode, ISkhailError } from "../../types";

export class SkhailError<ErrorType extends string = ErrorCode>
  extends Error
  implements ISkhailError<ErrorType>
{
  static stack: boolean = false;
  readonly name: ErrorType;
  readonly stack?: string;

  details?: any;

  constructor({
    message = "An unexpected error occured",
    name = "unexpected" as any,
    details = {},
    stack,
  }: Partial<ISkhailError<ErrorType>> = {}) {
    super(message);

    Object.setPrototypeOf(this, new.target.prototype);

    this.name = name;
    this.details = details;
    this.stack = stack;
  }

  toObject(): ISkhailError {
    return Object.getOwnPropertyNames(this).reduce(
      (aggregator, propertyName) =>
        SkhailError.stack || propertyName !== "stack"
          ? {
              ...aggregator,
              [propertyName]: this[propertyName as keyof this],
            }
          : aggregator,
      {}
    ) as ISkhailError;
  }

  toString() {
    return JSON.stringify(this.toObject());
  }

  mergeDetails(details: any = {}) {
    Object.assign(this.details, details);
  }
}

!(Error.prototype as any).toObject &&
  Object.defineProperty(Error.prototype, "toObject", {
    value: function () {
      return Object.getOwnPropertyNames(this).reduce(
        (aggregator, propertyName) =>
          SkhailError.stack || propertyName !== "stack"
            ? {
                ...aggregator,
                [propertyName]: this[propertyName],
              }
            : aggregator,
        {}
      );
    },
  });

export function getError<ErrorType extends ErrorCode = ErrorCode>(
  error: any,
  details: any = {},
  {
    name = "unexpected" as any,
    message = "An unexpected error occured",
  }: { name?: ErrorType; message?: string } = {}
): SkhailError<ErrorType> {
  if (error instanceof SkhailError) {
    error.mergeDetails(details);

    return error;
  }

  if (typeof error === "string") {
    if (message === "An unexpected error occured") {
      return new SkhailError({
        name,
        message: error,
        details,
      });
    } else {
      return new SkhailError({
        name,
        message,
        details: {
          ...details,
          error: { message: error },
        },
      });
    }
  }

  return new SkhailError({
    name,
    message,
    details: {
      ...details,
      error: error.toObject?.() || error,
    },
  });
}

export const getAppError = <AppErrorType extends string>() => {
  return SkhailError<ErrorCode | AppErrorType>;
};
