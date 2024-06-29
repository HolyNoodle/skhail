import { SkhailService } from "@skhail/core";

export abstract class ITransactionService extends SkhailService {
  static identifier = "SkhailTransactionService";

  abstract run(id: string, args: any[]): Promise<any[]>;
}
