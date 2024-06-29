import {
  Constructor,
  SkhailService,
  SkhailError,
  ServiceFunctions,
  getError,
  SkhailNetwork,
} from "@skhail/core";
import { TransactionExecutionCompensator } from "./ExecutionCompensator";

export class TransactionExecution<
  TransactionArgs extends any[],
  Service extends Constructor<SkhailService>,
  Method extends keyof ServiceFunctions<InstanceType<Service>, any>,
  Args extends Parameters<ServiceFunctions<InstanceType<Service>, any>[Method]>,
  Return extends Awaited<
    ReturnType<ServiceFunctions<InstanceType<Service>, any>[Method]>
  >
> {
  private status:
    | "idle"
    | "pending"
    | "success"
    | "failed"
    | "compensated"
    | "compensation_ignored"
    | "compensation_failed" = "idle";
  private result?: Return;
  private error?: SkhailError;

  constructor(
    private service: Service,
    private method: Method,
    private argGenerator: (...args: TransactionArgs) => Args,
    private compensator?: TransactionExecutionCompensator<
      TransactionArgs,
      Return,
      any,
      any,
      any
    >
  ) {}

  async execute(
    network: SkhailNetwork<any, any>,
    ...txArgs: TransactionArgs
  ): Promise<void> {
    if (this.status === "success") {
      throw new Error("Transaction execution already executed");
    }

    if (this.status === "pending") {
      throw new Error("Transaction execution already pending");
    }

    this.status = "pending";
    const args = this.argGenerator(...txArgs);

    const service = network.get(this.service) as ServiceFunctions<
      InstanceType<Service>,
      any
    >;
    const serviceMethod = service[this.method];
    try {
      const result = await serviceMethod(...args);

      this.status = "success";
      this.result = result;
    } catch (e) {
      this.status = "failed";

      this.error = getError(e);

      throw this.error;
    }
  }

  async compensate(
    network: SkhailNetwork<any, any>,
    ...txArgs: TransactionArgs
  ): Promise<void> {
    if (!this.compensator) {
      this.status = "compensation_ignored";
      return;
    }

    try {
      await this.compensator.execute(network, this.result!, ...txArgs);
      this.status = "compensated";
    } catch (ex) {
      this.status = "compensation_failed";

      this.error = getError(ex);

      throw this.error;
    }
  }

  getResult() {
    return this.result;
  }
  getStatus() {
    return this.status;
  }
  getError() {
    return this.error;
  }

  clone() {
    return new TransactionExecution(
      this.service,
      this.method,
      this.argGenerator,
      this.compensator?.clone()
    );
  }
}
