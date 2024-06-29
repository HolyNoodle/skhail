import { ISkhailServer } from "@skhail/core";

import { Transaction } from "./Transaction";

import { ITransactionService } from "./IService";

export class TransactionClient {
  constructor(private client: ISkhailServer<any>) {}

  run<Args extends any[], Return extends any[]>(
    transaction: Transaction<Args, Return>,
    ...args: Args
  ): Promise<Return> {
    return this.client
      .get(ITransactionService)
      .run(transaction.getId(), args) as Promise<Return>;
  }
}
