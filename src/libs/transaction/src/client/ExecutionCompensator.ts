import {
  Constructor,
  SkhailError,
  ServiceFunctions,
  getError,
  SkhailService,
  SkhailNetwork,
} from "@skhail/core";

export class TransactionExecutionCompensator<
  TransactionArgs extends any[],
  ExecutionReturn extends any,
  Service extends Constructor<SkhailService>,
  Method extends keyof ServiceFunctions<InstanceType<Service>, any>,
  Args extends Parameters<ServiceFunctions<InstanceType<Service>, any>[Method]>
> {
  private error?: SkhailError;

  constructor(
    private service: Service,
    private method: Method,
    private argGenerator: (
      args: ExecutionReturn,
      ...txArgs: TransactionArgs
    ) => Args
  ) {}

  async execute(
    network: SkhailNetwork<any, any>,
    executionReturn: ExecutionReturn,
    ...txArgs: TransactionArgs
  ): Promise<void> {
    const args = this.argGenerator(executionReturn, ...txArgs);

    const service = network.get(this.service) as ServiceFunctions<
      InstanceType<Service>,
      any
    >;
    const serviceMethod = service[this.method];

    try {
      await serviceMethod(...args);
    } catch (e) {
      this.error = getError(e);

      throw this.error;
    }
  }

  getError() {
    return this.error;
  }
  clone() {
    return new TransactionExecutionCompensator(
      this.service,
      this.method,
      this.argGenerator
    );
  }
}
