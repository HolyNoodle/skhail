import { getAppError } from "@skhail/core";

export type ValidationErrorCode = "invalid_params" | "validation_failed";

export class ValidationSkhailError extends getAppError<ValidationErrorCode>() {}
export class ValidationError extends ValidationSkhailError {
  constructor(message: string, index: number) {
    super({ name: "invalid_params", message, details: { index } });
  }
}
export class ValidationFailError extends ValidationSkhailError {
  constructor(errors: ValidationError[], service: string, method: string) {
    super({
      name: "validation_failed",
      message: "Validation middleware error.",
      details: { errors: errors.map((e) => e.toObject()), service, method },
    });
  }
}
