import { SkhailNetwork } from "../Network";
import { DefinedConstructor, EventOptions, ILogger } from "../../types";

import { BaseHelperService } from "./BaseHelperService";

export type BatchServiceContext<T extends EventOptions> = {
  network: SkhailNetwork<any, T>;
  logger: ILogger;
};
export type BatchServiceType = "CHAIN" | "FIXED";
export type BatchServiceTimerOptions = {
  executeAtReady?: boolean;
} & (
  | {
      type: "CHAIN";
      timing: number;
    }
  | {
      type: "FIXED";
      timing: number;
      overlap?: "WAIT" | "SKIP" | "EXECUTE";
      executeNoWarning?: boolean;
    }
);

export function BatchService<OwnedEvents extends EventOptions = EventOptions>(
  identifier: string
) {
  return function <Args extends any[]>(
    timerOptions: BatchServiceTimerOptions,
    handler: (
      context: BatchServiceContext<OwnedEvents>,
      constructorArgs: Args
    ) => Promise<void>
  ): DefinedConstructor<BaseHelperService<[]>, Args> {
    return class BatchServiceMixin extends BaseHelperService<[]> {
      static identifier = identifier;
      private args: Args;
      private timerId: NodeJS.Timeout | null = null;

      constructor(...args: Args) {
        super();

        this.args = args;
      }

      async ready() {
        await super.ready?.();

        switch (timerOptions.type) {
          case "CHAIN":
            // eslint-disable-next-line no-case-declarations
            const execute = () => {
              this.timerId = setTimeout(() => {
                this.executeHandler().finally(execute);
              }, timerOptions.timing);
            };

            if (timerOptions.executeAtReady !== false) {
              this.executeHandler().finally(execute);
            } else {
              execute();
            }
            break;
          case "FIXED":
            this.timerId = setInterval(() => {
              this.executeHandler().catch((e) => {
                this.logger.error("Batch service error", {
                  error: e,
                  identifier,
                });
              });
            }, timerOptions.timing);

            if (timerOptions.executeAtReady !== false) {
              this.executeHandler().catch((e) => {
                this.logger.error("Batch service error", {
                  error: e,
                  identifier,
                });
              });
            }
            break;
        }
      }

      async cleanup() {
        if (this.timerId !== null) {
          if (timerOptions.type === "FIXED") {
            clearInterval(this.timerId);
          }
          if (timerOptions.type === "CHAIN") {
            clearTimeout(this.timerId);
          }

          this.timerId = null;
        }

        await super.cleanup?.();
      }

      async run(): Promise<void> {
        if (timerOptions.type === "FIXED" && this.processing.size !== 0) {
          if (
            (timerOptions.overlap === "EXECUTE" ||
              timerOptions.overlap === undefined) &&
            timerOptions.executeNoWarning !== true
          ) {
            this.logger.warning(
              `
              Batch service execution hasn't finished before it's next execution.
              This can be a problem as the memory used by the service may grow until the server crashes.
              To fix this, multiple possibilities are available:
               - Set the batch type option to CHAIN: next execution will be schedule after current execution
               - Set the overlap option of the FIXED type to WAIT: this execution will wait for previous execution to end before running. This can still lead to stacking executions in memory.
               - Set the overlap option of the FIXED type to SKIP: this and further executions will be skipped until the current execution is finished. 
              
               You can also disable this warning by setting the executeNoWarning option to true.
            `,
              {
                identifier,
              }
            );
          }

          if (timerOptions.overlap === "SKIP") {
            return Promise.resolve();
          }

          if (timerOptions.overlap === "WAIT") {
            await this.waitForProcessingToEnd();
          }
        }

        await handler(
          {
            network: this.network,
            logger: this.logger,
          },
          this.args
        );
      }
    };
  };
}
