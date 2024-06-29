import { SkhailService } from "@skhail/core";
import { WebSocketGetter } from "../../utils";

export const WebSocket = WebSocketGetter();

export enum HTTPProtocols {
  HTTP = "http",
  HTTPS = "https",
}

export type WebSocketFunction = (
  socket: typeof WebSocket,
  ...args: any[]
) => void;
export type WebSocketFunctionArgs<Type> = Type extends [
  typeof WebSocket,
  ...infer args
]
  ? args
  : [];

export type WebSocketFunctions<Service> = {
  [Key in keyof Omit<
    Service,
    keyof SkhailService<any>
  > as Service[Key] extends (socket: typeof WebSocket, ...args: any[]) => void
    ? Key
    : never]: Service[Key] extends (
    socket: typeof WebSocket,
    ...args: any[]
  ) => void
    ? Service[Key]
    : never;
};
