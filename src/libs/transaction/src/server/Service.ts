import { SkhailError } from "@skhail/core";

import { ITransactionService, Transaction } from "../client";

export class TransactionService extends ITransactionService {
  async run(id: string, args: any[]) {
    const tx = Transaction.get(id)?.clone();

    if (!tx) {
      throw new SkhailError({
        message: "Transaction not found",
        name: "not_found",
        details: { id },
      });
    }

    return tx.run(this.network, ...args);
  }
}
