import { v4 } from "uuid";

import { Constructor } from "../../types";
import { getError } from "../Error";

import { SkhailService } from "../Service/Service";

export abstract class BaseHelperService<
  Args extends any[]
> extends SkhailService<any> {
  protected processing: Set<string>;
  private serviceReady: boolean = false;

  abstract run(args?: Args): Promise<void>;

  constructor() {
    super();

    this.processing = new Set();
    this.executeHandler = this.executeHandler.bind(this);
  }

  private async wrapWithProcessing(cb: () => Promise<void>) {
    if (!this.serviceReady) {
      this.logger.error("Service not ready", {
        identifier: (this.constructor as Constructor).identifier,
      });

      return;
    }

    const id = v4();
    this.processing.add(id);

    try {
      this.logger.trace("Event consumer processing start", {
        identifier: (this.constructor as Constructor).identifier,
      });

      await cb();

      this.logger.trace("Event consumer processing end", {
        identifier: (this.constructor as Constructor).identifier,
      });
    } catch (e) {
      this.logger.error("Event consumer processing error", {
        error: getError(e).toObject(),
        identifier: (this.constructor as Constructor).identifier,
      });
    } finally {
      this.processing.delete(id);
    }
  }

  protected executeHandler(...args: Args) {
    return this.wrapWithProcessing(() => this.run(args));
  }

  async prepare() {
    await super.prepare?.();

    this.processing = new Set();
    this.serviceReady = true;
  }

  async cleanup() {
    await super.cleanup?.();

    this.serviceReady = false;

    await this.waitForProcessingToEnd();

    this.processing = new Set();
  }

  protected waitForProcessingToEnd() {
    return new Promise<void>((resolve) => {
      const cid = setInterval(() => {
        if (this.processing.size === 0) {
          clearInterval(cid);
          resolve();
        }
      }, 10);
    });
  }
}
