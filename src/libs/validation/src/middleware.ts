import { IEnveloppe, SkhailService, ServiceFunctions } from "@skhail/core";
import { ValidationError, ValidationFailError } from "./types";
import Joi from "joi";

export class ValidationMiddleware<Service extends SkhailService> {
  private options: Map<
    string,
    ((...args: any[]) => Promise<ValidationError[]>) | Joi.AnySchema[]
  >;

  id: string = "ValidationMiddleware";

  constructor(
    options: {
      [key in keyof ServiceFunctions<Service, any>]?:
        | Joi.AnySchema[]
        | ((
            ...args: Parameters<ServiceFunctions<Service, any>[key]>
          ) => Promise<ValidationError[]>);
    } = {}
  ) {
    this.options = new Map(Object.entries(options));
  }

  async process(enveloppe: IEnveloppe<any>) {
    const { service, method, args } = enveloppe;

    let errors: ValidationError[] = [];

    if (this.options.has(method)) {
      const validator = this.options.get(method)!;

      if (typeof validator === "function") {
        errors = await validator(...args);
      } else {
        const validationResults = (validator as Joi.AnySchema[]).map(
          (schema, index) => schema.validate(args[index])
        );

        errors = validationResults
          .map((result, index) => {
            if (!result.error) {
              return undefined;
            }

            return new ValidationError(result.error!.message, index);
          })
          .filter((e) => !!e) as ValidationError[];
      }
      if (errors.length > 0) {
        throw new ValidationFailError(errors, service, method);
      }
    }
  }
}
