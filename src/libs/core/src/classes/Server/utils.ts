import { SkhailServer } from ".";
import {
  Constructor,
  ContextOptions,
  IEnveloppe,
  IEnveloppeResponse,
  ILogger,
} from "../../types";
import { getError, SkhailError } from "../Error";
import { SkhailNetwork } from "../Network";
import { SkhailService } from "../Service";

function createServiceCopy<Service>(service: Service): Service {
  const executionCopy = Object.assign(
    Object.create(Object.getPrototypeOf(service)),
    service
  ) as Service;

  return executionCopy;
}

export function createLoggerCopy(
  logger: ILogger,
  service: Constructor,
  method?: string
): ILogger {
  const loggerCopy = logger.clone();

  loggerCopy.setScope(
    method ? [service.identifier, method].join(":") : service.identifier
  );

  return loggerCopy;
}

function getFunction(service: SkhailService<any>, method: string) {
  const methodRef = service[method as keyof SkhailService<any>];

  if (!methodRef) {
    throw new SkhailError({
      name: "not_found",
      message: "Method not found",
      details: {
        service: (service.constructor as Constructor).identifier,
        method,
      },
    });
  }

  return methodRef;
}

export function handleServiceCall<
  Service extends SkhailService<ContextType>,
  ContextType extends ContextOptions = ContextOptions
>(
  service: Service,
  server: SkhailServer<ContextType>,
  logger: ILogger
): (enveloppe: IEnveloppe<ContextType>) => Promise<IEnveloppeResponse> {
  return async (originalEnveloppe) => {
    const enveloppe = {
      ...originalEnveloppe,
      context: { ...originalEnveloppe.context },
    };

    const serviceCopy = createServiceCopy(service);
    const classObject = service.constructor as Constructor<SkhailService<any>>;

    const loggerCopy = createLoggerCopy(logger, classObject, enveloppe.method);
    loggerCopy.setTransactionId(enveloppe.context.tid);

    serviceCopy.setLogger(loggerCopy);
    const network = new SkhailNetwork(
      serviceCopy,
      loggerCopy,
      server.getClient(),
      server.getQueue(),
      server.getEmitter(),
      enveloppe.context
    );
    serviceCopy.setNetwork(network);

    const middlewares = classObject.getMiddlewares();
    if (middlewares) {
      for (let i = 0; i < middlewares.length; ++i) {
        const middleware = middlewares[i];

        try {
          const outScopeContext = await middleware.process(
            { ...enveloppe },
            service
          );
          enveloppe.context = {
            ...enveloppe.context,
            data: {
              ...(enveloppe.context.data ?? {}),
              ...(outScopeContext ?? {}),
            },
          };
        } catch (e) {
          const error = getError(
            e,
            {
              service: (service.constructor as Constructor).identifier,
              method: enveloppe.method,
              tid: enveloppe.context.tid,
            },
            {
              name: "unexpected",
              message: "An error occured while processing middlewares",
            }
          ).toObject();

          loggerCopy.error("Service call error", error);

          return {
            tid: enveloppe.context.tid,
            success: false,
            error,
          };
        }
      }
    }

    serviceCopy.setContext({ ...enveloppe.context });

    try {
      const method = getFunction(serviceCopy, enveloppe.method);

      loggerCopy.trace("Service execute");
      const result = await Reflect.apply(
        method as any,
        serviceCopy,
        enveloppe.args
      );
      loggerCopy.trace("Send service response");

      return {
        tid: enveloppe.context.tid,
        success: true,
        response: result,
      };
    } catch (e) {
      const error = getError(e, {
        service: enveloppe.service,
        method: enveloppe.method,
      }).toObject();

      loggerCopy.error("Service call error", error);

      return {
        tid: enveloppe.context.tid,
        success: false,
        error,
      };
    }
  };
}
