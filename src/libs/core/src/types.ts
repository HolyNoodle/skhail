import { SkhailService } from "./classes/Service";

export type ErrorCode = "denied" | "unexpected" | "not_found";

export interface ISkhailError<ErrorType extends string = ErrorCode> {
  name: ErrorType;
  message: string;
  details?: any;
  stack?: string;
}

export enum LogLevel {
  DEBUG,
  TRACE,
  INFO,
  WARNING,
  ERROR,
}

export type EmitterListener = (...args: any[]) => Promise<void>;

export interface IEmitter extends ILifeCycle {
  setLogger(logger: ILogger): void;
  on(group: string, event: string, listener: EmitterListener): Promise<void>;
  off(group: string, event: string, listener: EmitterListener): Promise<void>;
  emit(event: string, args: any[]): Promise<void>;
}

export interface LogMessage {
  level: LogLevel;
  tid?: string;
  message: string;
  instance: string;
  scope: string;
  details?: Object & any;
  date: number;
}

export interface ILogger extends ILifeCycle {
  getInstance(): string;
  clone(): ILogger;
  setInstance(instance: string): void;
  setScope(scope: string): void;
  setTransactionId(tid: string): void;
  log(message: LogMessage): void;
  trace(message: string, details?: {}): void;
  debug(message: string, details?: {}): void;
  info(message: string, details?: {}): void;
  warning(message: string, details?: {}): void;
  error(message: string, details?: {}): void;
}

export interface IEnveloppe<Context extends ContextOptions> {
  service: string;
  method: string;
  args: any[];
  context: IRequestContext<Context>;
}

export type IEnveloppeResponse =
  | { tid: string } & (
      | {
          success: true;
          response?: any;
        }
      | {
          success: false;
          error: ISkhailError;
        }
    );

export type EnveloppeHandler<Context extends ContextOptions> = (
  enveloppe: IEnveloppe<Context>
) => Promise<IEnveloppeResponse>;

export type EventOptions = {
  [key: string]: any[];
};

export type ContextOptions = {
  [key: string]: any;
};

export interface IQueue<Context extends ContextOptions> extends ILifeCycle {
  setLogger(logger: ILogger): void;
  setHandler(
    service: string,
    handler: EnveloppeHandler<Context>
  ): Promise<void>;
  enqueue(enveloppe: IEnveloppe<Context>): Promise<IEnveloppeResponse>;
}
export interface QueueWrapper<ContextType extends ContextOptions> {
  get<Service extends SkhailService<ContextType>>(
    type: Constructor<Service>,
    context?: ContextType,
    forwardedContext?: IRequestContext<ContextType>
  ): ServiceFunctions<Service, ContextType>;
}
export interface ISkhailClient<ContextType extends ContextOptions>
  extends QueueWrapper<ContextType> {
  start(): Promise<void>;
  stop(): Promise<void>;
}
export interface ISkhailServer<ContextType extends ContextOptions> {
  start(): Promise<void>;
  stop(): Promise<void>;

  get<
    Service extends SkhailService<ContextType, EventType>,
    EventType extends EventOptions
  >(
    type: Constructor<Service>,
    context?: ContextType,
    forwardedContext?: IRequestContext<ContextType>
  ): ServiceFunctions<Service, ContextType>;

  getQueue(): IQueue<ContextType>;
  getEmitter(): IEmitter | undefined;
  getClient(): ISkhailClient<ContextType>;
}

export interface Middleware<
  ContextIn extends ContextOptions,
  ContextOut extends ContextOptions = ContextIn
> {
  id: string;
  prepare?: (service: SkhailService<ContextIn>) => Promise<void>;
  cleanup?: (service: SkhailService<ContextIn>) => Promise<void>;
  process: (
    enveloppe: IEnveloppe<ContextIn>,
    service: SkhailService<ContextOut>
  ) => Promise<ContextOut | undefined>;
}

export type ServiceClassDescriptor = {
  identifier: string;
  getMiddlewares: () => Middleware<any, any>[];
  isManaged: () => boolean;
};
export type AbstractConstructor<
  Service = any,
  Args extends any[] = any[]
> = (abstract new (...args: Args) => Service) & ServiceClassDescriptor;
export type DefinedConstructor<
  Service = any,
  Args extends any[] = any[]
> = (new (...args: Args) => Service) & ServiceClassDescriptor;
export type Constructor<Service = any, Args extends any[] = any[]> =
  | AbstractConstructor<Service, Args>
  | DefinedConstructor<Service, Args>;

export interface IRequestContext<Context extends ContextOptions> {
  tid: string;
  origin?: string;
  data?: Context;
  parent?: IRequestContext<Context>;
}

export type EventFunction<EventDataType extends Array<any>> = (
  ...args: EventDataType
) => Promise<void> | void;

export type ServiceFunction = (...args: any[]) => Promise<any>;
export type ServiceFunctions<
  Service extends SkhailService<ContextType>,
  ContextType extends ContextOptions
> = {
  [Key in keyof Service as Service[Key] extends ServiceFunction
    ? Key
    : never]: Service[Key] extends ServiceFunction ? Service[Key] : never;
};

export abstract class ILifeCycle {
  abstract prepare?(): Promise<void>;
  abstract ready?(): Promise<void>;
  abstract cleanup?(): Promise<void>;
}

export abstract class IEventEmitter<EventType extends EventOptions> {
  abstract emit<Event extends keyof EventType>(
    event: Event,
    args: EventType[Event]
  ): void;
}
export abstract class IEventListener {
  abstract on<
    Service extends SkhailService<any, EventType>,
    EventType extends EventOptions,
    Event extends keyof EventType
  >(
    service: Constructor<Service>,
    event: Event,
    listener: EventFunction<EventType[Event]>
  ): void;
  abstract off<
    Service extends SkhailService<any, EventType>,
    EventType extends EventOptions,
    Event extends keyof EventType
  >(
    service: Constructor<Service>,
    event: Event,
    listener: EventFunction<EventType[Event]>
  ): void;
}
