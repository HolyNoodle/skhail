import {
  IRequestContext,
  ILogger,
  EventOptions,
  ContextOptions,
  Middleware,
  Constructor,
  ServiceFunctions,
} from "../../types";
import { SkhailNetwork } from "../Network";

export abstract class SkhailService<
  ContextType extends ContextOptions = ContextOptions,
  EventType extends EventOptions = {}
> {
  constructor() {
    if (!(this.constructor as any).identifier) {
      throw new Error(
        "SkhailService needs to implement static property 'identifier'."
      );
    }
  }

  protected static identifier: string;
  protected static alwaysManaged: boolean = false;
  protected static middlewares: Middleware<any>[] = [];

  ready?(): Promise<void>;
  prepare?(): Promise<void>;
  cleanup?(): Promise<void>;

  protected logger!: ILogger;
  protected context!: IRequestContext<ContextType>;
  protected network!: SkhailNetwork<ContextType, EventType>;

  static getMiddlewares() {
    return this.middlewares;
  }

  static isManaged() {
    return this.alwaysManaged;
  }

  getLogger() {
    return this.logger;
  }

  setLogger(logger: ILogger) {
    this.logger = logger;
  }

  setNetwork(network: SkhailNetwork<ContextType, EventType>) {
    this.network = network;
  }

  setContext(context: IRequestContext<ContextType>) {
    this.context = context;
  }

  get<Service extends SkhailService<ContextType, {}>>(
    type: Constructor<Service>,
    context?: ContextType | undefined
  ): ServiceFunctions<Service, ContextType> {
    return this.network.get(type, context);
  }
}
