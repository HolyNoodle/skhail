# Introduction

`@skhail/validation` provides a middleware for validating parameters for service methods.

## Set it up

```js
import Joi from "joi";
import { ValidationMiddleware } from "@skhail/validation";

class MyService extends SkhailService {
  static middlewares = [
    new ValidationMiddleware({
      create: [Joi.string().required(), Joi.boolean()],
    }),
  ];

  list() {
    // ...
  }
  create(name: string, done: boolean = false) {
    // ...
  }
}
```

With this configuration, no validation is done when calling the `list` method. But validation is done on the `create` method

Alternatively you can provide a function to validate the params:

```js
import Joi from "joi";
import { ValidationMiddleware, ValidationError } from "@skhail/validation";

class MyService extends SkhailService {
  static middlewares = [
    new ValidationMiddleware({
      create: (name: string, done?: boolean) => {
        const errors: ValidationError[] = [];

        if (name === "") {
          errors.push(new ValidationError("Name is required", 0));
        }

        return errors;
      },
    }),
  ];

  list() {
    // ...
  }
  create(name: string, done: boolean = false) {
    // ...
  }
}
```

If the validation method return an **empty array** then the validation succeed. Else, it fails.
