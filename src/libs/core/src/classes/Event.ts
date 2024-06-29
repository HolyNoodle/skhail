import { EmitterListener, IEmitter, ILifeCycle, ILogger } from "../types";
import { getError } from "./Error";

export class InMemoryEventEmitter implements IEmitter, ILifeCycle {
  private listeners!: Map<string, Map<string, EmitterListener>>;
  protected logger!: ILogger;

  setLogger(logger: ILogger): void {
    this.logger = logger;
  }

  prepare(): Promise<void> {
    this.listeners = new Map();

    return Promise.resolve();
  }

  cleanup(): Promise<void> {
    this.listeners = new Map();

    return Promise.resolve();
  }

  on(group: string, event: string, listener: EmitterListener): Promise<void> {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Map());
    }

    const groups = this.listeners.get(event)!;

    groups.set(group, listener);

    return Promise.resolve();
  }

  off(group: string, event: string, listener: EmitterListener): Promise<void> {
    if (!this.listeners.has(event)) {
      return Promise.resolve();
    }

    const groups = this.listeners.get(event)!;

    if (!groups.has(group)) {
      return Promise.resolve();
    }

    if (groups.get(group) === listener) {
      groups.delete(group);
    }

    return Promise.resolve();
  }

  emit(event: string, args: any[]) {
    const groups = this.listeners.get(event);
    const listeners = Array.from(groups?.values() ?? []);

    const promises = listeners.map((listener) => {
      return new Promise<void>(async (resolve) => {
        try {
          await listener(...args);
        } catch (err) {
          const error = getError(err, {
            event,
          });
          this.logger?.error(
            "Unexpected error in event listener",
            error.toObject()
          );
          resolve();
          return;
        }

        resolve();
      });
    });

    return promises
      ? (Promise.all(promises) as any as Promise<void>)
      : Promise.resolve();
  }
}
