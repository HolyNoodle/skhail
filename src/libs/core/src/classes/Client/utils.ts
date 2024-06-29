import {
  Constructor,
  ContextOptions,
  IEnveloppe,
  ILogger,
  IQueue,
  IRequestContext,
  ServiceFunctions,
} from "../../types";
import { SkhailError } from "../Error";
import { v4 } from "uuid";
import { SkhailService } from "../Service";

function wrapServiceCall<Context extends ContextOptions>(
  queue: IQueue<Context>,
  service: string,
  method: string,
  logger: ILogger,
  context?: Context,
  forwardedContext?: IRequestContext<Context>
): (...any: any[]) => Promise<any> {
  return async function serviceCall(...args) {
    const tid = forwardedContext?.tid || v4();

    logger.setTransactionId(tid);
    logger.trace("Service call", {
      service,
      method,
    });
    const enveloppe: IEnveloppe<Context> = {
      service,
      method,
      args,
      context: {
        tid,
        data: context || forwardedContext?.data,
        parent: forwardedContext,
      },
    };

    logger.debug("Enqueue enveloppe");
    const response = await queue.enqueue(enveloppe);
    logger.trace("Service response received", {
      service,
      method,
    });

    if (response.success === false) {
      throw new SkhailError(response.error);
    }

    return response.response;
  };
}

export function createServiceProxy<
  Service extends SkhailService<Context>,
  Context extends ContextOptions
>(
  type: Constructor<Service>,
  logger: ILogger,
  queue: IQueue<Context>,
  context?: Context,
  forwardedContext?: IRequestContext<Context>
): ServiceFunctions<Service, Context> {
  return new Proxy({} as ServiceFunctions<Service, Context>, {
    get(_, method: string) {
      return wrapServiceCall(
        queue,
        type.identifier,
        method,
        logger,
        context,
        forwardedContext
      );
    },
  });
}
