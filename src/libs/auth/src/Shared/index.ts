import {
  ContextOptions,
  SkhailService,
  ServiceFunctions,
  ISkhailClient,
} from "@skhail/core";

export type ProtectionMethod = <
  Service extends SkhailService<ProtectorContext>
>(
  infos: AuthInfo,
  args: any[],
  service: Service
) => Promise<void>;

export type ProtectionOptions<
  Service extends SkhailService<ContextType>,
  ContextType extends ContextOptions
> = {
  [Key in keyof ServiceFunctions<Service, ContextType>]?:
    | boolean
    | string[]
    | ProtectionMethod;
};

export interface ProtectorContext extends ContextOptions {
  token: string;
  authInfo?: AuthInfo;
}

export interface IExternalCredentials {
  id: string;
  claims: string[];
}

export interface AuthInfo extends IExternalCredentials {
  iat?: number;
  exp: number;
}

export abstract class IAuthenticationService extends SkhailService<
  ProtectorContext,
  {
    created: [string];
    login: [string];
  }
> {
  static identifier = "AuthenticationService";

  abstract login(loginInfo: {
    provider: string;
    token: string;
  }): Promise<string>;
  abstract getKey(): Promise<string>;
  abstract getSubProcessToken(
    claims: string[],
    expiration?: number
  ): Promise<string>;
}

export interface AuthenticationProvider {
  getType(): string;
  verifyToken(token: string): Promise<string>;
}

export interface ClientAuthProvider {
  getType(): string;
  login(client: ISkhailClient<ProtectorContext>): Promise<string>;
}
