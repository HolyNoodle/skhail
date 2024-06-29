import { ContextOptions, EventOptions } from "@skhail/core";
import { IHTTPService } from "./IHTTPService";

export abstract class IAPIService<
  ContextType extends ContextOptions = {},
  Events extends EventOptions = {}
> extends IHTTPService<ContextType, Events> {
  static identifier = "HTTPAPIService";
}
