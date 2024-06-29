import { ProtectorContext } from "@skhail/auth";
import { SkhailService } from "@skhail/core";

export abstract class ISkhailAuthenticationService extends SkhailService<
  ProtectorContext,
  {
    created: [string];
    login: [string];
    deleted: [string];
  }
> {
  static identifier = "InternalAuthenticationService";

  abstract register(clientInfo: {
    id: string;
    publicKey: string;
  }): Promise<void>;
  abstract unregister(clientInfo: { id: string }): Promise<void>;
  abstract login(loginInfo: {
    id: string;
    signedToken: string;
  }): Promise<string>;
}

export interface IInternalCredentials {
  id: string;
  publicKey: string;
}
