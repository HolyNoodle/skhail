# Introduction

`@skhail/transaction` is a lib to use with `skhail` systems.

It's based on the **Saga** pattern in order to provide a way to help ensure data integrity inside distributed system.

The Saga pattern relies on three main things:

- An orchestrator: here, the `TransactionService`. It runs transactions.
- Transaction: List of operations to perform
- Compensation: If any operation of a transaction fails, you need to compensate all successful operations of the transaction

## Creating a Transaction

Let's imagine a process where we manage a pay as you consume TodoList app. So each todo you create increase the price the user will pay. With each new todo list item, we need to increase the price. But if the creation of the todo list item fails we shouldn't charge the user, so we need to decrement. Same the other way, if charging the customer fails, we shouldn't create the item.

For that we use a transaction. It represents the different steps that need to succeed and their way to compensate it (optional) if ever we need to rollback.

**A transaction must have a unique id across all services**. So choose wisely how you will name them. As they are transversale, they will most probably using multiple different domains. Something like `{service_name}:{action_name}` doesn't seem right.

```js
import { Transaction } from "@skhail/transaction";

// We create a transaction with a unique ID
export const createTodoTx = new Transaction<
  [{ todo: string; done: boolean }, string], // Reprents the arguments the transaction will require to run
>("create-todo")
  .step({
    // We add operations to the transaction
    // In our example we want to create the todo list item
    service: TodoListService,
    method: "create", // (item: { todo: string; done: boolean; }) => Promise<{ todo: string; done: boolean; id: string; }>
    func: (todoItem) => [todoItem],

    // Operation to revert the create operation
    compensate: {
      service: TodoListService,
      method: "delete", // (id: string) => Promise<void>

      // As the delete method requires a string id but the create method returns a full object with an id we map the return parameter
      func: (createdTodoItem) => [createdTodoItem.id]
    }
  })
  .step({
    // In our example we also want to increse the number of todolist item to invoice
    service: InvoiceService,
    method: "increment", // (userId: string) => Promise<number>
    func: (_, userId) => [userId],

    // To compensate the increment we use the decrement operation
    compensate: {
      service: InvoiceService,
      method: "decrement", // (userId: string) => Promise<number>
      func: (_, _, userId) => [userId], // First parameter is the number returned by increment operation
    }
  });
```

From there, we are able to run all operations. If any fails, all the successful ones will be compensated so data integrity is ensured across the services.

I know, `func` is a lame name but I don't want to use `argGenerator`. But that's basically it. It should only do simple mappings from transaction arguments and the service method arguments. Also the compensation has, as first parameter, the response from the step it compensates.

## Executing a Transaction

### Service

Transactions run on the TransactionService. It shouldn't do any heavy lifting, just storing the arguments and responses from the operations and runs the argGenerator. It also, and mainly, coordinates the different operations to do simultaneously.

**Mind the import `@skhail/transaction/server`**

```js
import { TransactionService } from "@skhail/transaction/server";

const server = new SkhailServer({
  //...
  services: [
    //...
    new TransactionService(),
  ],
});
```

The service actually doesn't store anything on the long run. If it's stopped, it won't compute anything and will leave things as they are, optimistically everything should be fine. But there is some chances that compensations are required and not run or that some steps have not been triggered.

Some work need to be done on that to provide a higher quality transaction system. One that can be brought down and brought up without breaking everything.

### Client

As all services, you'll need a client to interact with the service (but you can still call it directly if you want to).

```js
import { TransactionClient } from "@skhail/transaction";

import { createTodoTx } from "shared/transactions"; // Wherever you host your transactions

const createTodo = (client, todoListItem, userId) => {
  const transactionClient = new TransactionClient(client);

  const [createResult, incrementResult] = await transactionClient.run(
    createTodoTx,
    todoListItem,
    userId
  );

  return { todo: createResult, count: incrementResult };
}
```

The transaction client is instanciated with a `SkhailClient` (`SkhailServer` works too). This means that frontend can trigger transactions.
The client will return the result array of all the steps in order they've been defined.
