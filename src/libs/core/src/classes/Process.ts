import { IEmitter, ILifeCycle, ILogger, ISkhailServer } from "../types";
import { getError } from "./Error";
import { InMemoryEventEmitter } from "./Event";
import { ConsoleLogger } from "./Logger/ConsoleLogger";
import { MultiLogger } from "./Logger/MultiLogger";
import { InMemoryQueue } from "./Queue";
import { SkhailServer, SkhailServerOptions } from "./Server";
import { SkhailService } from "./Service";

export interface ISkhailProcess {
  registerDependency: (dep: ILifeCycle) => void;
  getServer: () => ISkhailServer<any>;
  start: (options: Partial<SkhailServerOptions<any>>) => Promise<void>;
  stop: () => Promise<void>;
}

export type NodeProcessOptions = Omit<
  SkhailServerOptions<any>,
  "services" | "manage" | "event" | "logger"
> & {
  loggers?: ILogger[];
  event?: true | IEmitter;
  timeBeforeShuttingDown: number;
};

const defaultOptions: NodeProcessOptions = {
  queue: new InMemoryQueue(),
  loggers: [new ConsoleLogger()],
  timeBeforeShuttingDown: 5000,
};

export class NodeProcess implements ISkhailProcess {
  private readonly deps: ILifeCycle[];
  private server: ISkhailServer<any>;
  private timeoutId?: NodeJS.Timer;
  private options: NodeProcessOptions;
  private logger: ILogger;

  constructor(
    private readonly process: NodeJS.Process,
    services: SkhailService<any>[],
    options: Partial<NodeProcessOptions> = defaultOptions
  ) {
    this.logger = new MultiLogger(options.loggers ?? defaultOptions.loggers!);
    this.deps = [];

    this.options = { ...defaultOptions, ...options };

    process.on("SIGTERM", this.exitProcess.bind(this) as any);
    process.on("SIGINT", this.exitProcess.bind(this) as any);

    process.on("uncaughtException", (e: any) => {
      this.logger.error(
        "NodeJS Process: Uncaught exception",
        getError(e, undefined, {
          name: "unexpected",
          message: "Critical unexpected error, terminating application",
        }).toObject()
      );
    });

    const manage = process.env.SKHAIL_SERVICES?.split(",").map((service) =>
      service.trim()
    );

    const instance = process.env.SKHAIL_INSTANCE;
    instance && this.logger.setInstance(instance);

    const event =
      options.event === true ? new InMemoryEventEmitter() : options.event;

    this.server = new SkhailServer({
      ...defaultOptions,
      ...options,
      event,
      services,
      logger: this.logger,
      manage,
    });
  }

  getServer(): ISkhailServer<any> {
    return this.server;
  }

  registerDependency(dep: ILifeCycle): void {
    this.deps.push(dep);
  }

  private async exitProcess(code: number = 0): Promise<void> {
    if (this.timeoutId !== undefined) {
      return;
    }

    this.timeoutId = setTimeout(
      () => this.process.exit(code),
      this.options.timeBeforeShuttingDown
    );
    this.logger.info(
      `process will exit in ${
        this.options.timeBeforeShuttingDown / 1000
      } seconds, cleaning up server`
    );

    try {
      await this.stop();
    } catch (e) {
      this.logger.info(
        "Unexpected error while exiting the process",
        getError(e, undefined, {
          name: "unexpected",
          message:
            "Critical unexpected error, continuing application termination",
        }).toObject()
      );
    }

    clearTimeout(this.timeoutId);
    this.timeoutId = undefined;

    this.logger.info("Process finished before timeout");

    this.process.exit(code);
  }

  async start(): Promise<void> {
    for (const dep of this.deps) {
      try {
        await dep.prepare?.();
      } catch (e) {
        this.logger.error("Error while preparing dependencies", {
          dependency: dep.constructor.name,
          error: getError(e).toObject(),
        });

        throw e;
      }
    }

    return this.server.start();
  }

  async stop(): Promise<void> {
    await this.server.stop();

    for (const dep of this.deps.reverse()) {
      try {
        await dep.cleanup?.();
      } catch (e) {
        this.logger.error("Error while cleaning up dependencies", {
          dependency: dep.constructor.name,
          error: getError(e).toObject(),
        });
      }
    }
  }
}
