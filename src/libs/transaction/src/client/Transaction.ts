import {
  Constructor,
  SkhailError,
  ServiceFunctions,
  SkhailService,
  SkhailNetwork,
} from "@skhail/core";
import { TransactionExecution } from "./Execution";
import { TransactionExecutionCompensator } from "./ExecutionCompensator";

export class Transaction<
  TransactionArgs extends any[] = [],
  TransactionReturn extends any[] = []
> {
  private static transactions = new Map<string, Transaction<any, any>>();

  private steps: TransactionExecution<TransactionArgs, any, any, any, any>[] =
    [];

  constructor(private readonly id: string) {
    Transaction.transactions.set(this.id, this);
  }

  getId() {
    return this.id;
  }

  public step<
    Service extends Constructor<SkhailService>,
    Method extends keyof ServiceFunctions<InstanceType<Service>, any>,
    Args extends Parameters<
      ServiceFunctions<InstanceType<Service>, any>[Method]
    >,
    Return extends Awaited<
      ReturnType<ServiceFunctions<InstanceType<Service>, any>[Method]>
    >,
    CompService extends Constructor<SkhailService>,
    CompMethod extends keyof ServiceFunctions<InstanceType<CompService>, any>,
    CompArgs extends Parameters<
      ServiceFunctions<InstanceType<CompService>, any>[CompMethod]
    >
  >({
    service,
    method,
    func,
    compensate,
  }: {
    service: Service;
    method: Method;
    func: (...txArgs: TransactionArgs) => Args;
    compensate?: {
      service: CompService;
      method: CompMethod;
      func: (args: Return, ...txArgs: TransactionArgs) => CompArgs;
    };
  }): Transaction<TransactionArgs, [...TransactionReturn, Return]> {
    const compensator = compensate
      ? new TransactionExecutionCompensator(
          compensate.service,
          compensate.method as any,
          compensate.func
        )
      : undefined;
    const step = new TransactionExecution<
      TransactionArgs,
      Service,
      Method,
      Args,
      Return
    >(service, method, func, compensator);

    this.steps.push(step);

    return this as any;
  }

  async run(
    network: SkhailNetwork<any, any>,
    ...txArgs: TransactionArgs
  ): Promise<TransactionReturn> {
    await Promise.allSettled(
      this.steps.map((step) => step.execute(network, ...txArgs))
    );

    const erroredSteps = this.steps.filter(
      (step) => step.getStatus() !== "success"
    );
    const isFailed = erroredSteps.length > 0;

    if (!isFailed) {
      return this.steps.map((step) => step.getResult()) as TransactionReturn;
    }

    const errors = erroredSteps.map((step) => step.getError()?.toObject());
    const stepsToCompensate = this.steps.filter(
      (step) => erroredSteps.indexOf(step) < 0
    );

    await Promise.allSettled(
      stepsToCompensate.map((step) => step.compensate(network, ...txArgs))
    );

    const isCompensationFailed = stepsToCompensate.some(
      (step) => step.getStatus() === "compensation_failed"
    );

    if (isCompensationFailed) {
      throw new SkhailError({
        message: "Transaction failed, compensation failed",
        name: "unexpected",
        details: {
          errors,
          compensationErrors: stepsToCompensate
            .filter((step) => step.getStatus() === "compensation_failed")
            .map((step) => step.getError()?.toObject()),
        },
      });
    }

    throw new SkhailError({
      message: "Transaction failed, compensation success",
      name: "unexpected",
      details: {
        errors,
      },
    });
  }

  static get(id: string) {
    return this.transactions.get(id);
  }

  clone() {
    const transaction = new Transaction<TransactionArgs, TransactionReturn>(
      this.id
    );

    transaction.steps = this.steps.map((step) => step.clone());

    return transaction;
  }
}
