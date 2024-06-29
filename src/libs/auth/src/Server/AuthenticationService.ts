import { Middleware, SkhailError } from "@skhail/core";

import {
  AuthInfo,
  AuthenticationProvider,
  IAuthenticationService,
  IExternalCredentials,
} from "../Shared";
import { v4 } from "uuid";
import * as jose from "node-jose";
import * as utils from "../Shared/utils";
import { AuthMiddleware } from "./AuthMiddleware";

type ClaimConfiguration<Claims extends string | number | symbol> = {
  [key in Claims]: {
    default: boolean;
  };
};

export interface ClientRepository {
  get(
    provider: string,
    providerId: string
  ): Promise<IExternalCredentials | undefined>;
  create(
    provider: string,
    providerId: string,
    credentials: IExternalCredentials
  ): Promise<IExternalCredentials>;
  login?(credentials: IExternalCredentials): Promise<void>;
}

export type ProtectorServiceOptions<Claims extends string | number | symbol> = {
  privateKey: jose.JWK.Key;
  authProviders: AuthenticationProvider[];
  repository?: ClientRepository;
  claims: ClaimConfiguration<Claims>;
  tokenExpiration?: number;
  internalClients?: IExternalCredentials[];
};

export enum ProtectorClaims {
  REGISTER_CLIENTS = "protector_register_clients",
}

export class AuthenticationService<
  AuthClaims extends string | number | symbol
> extends IAuthenticationService {
  static middlewares: Middleware<any, any>[] = [
    new AuthMiddleware<IAuthenticationService>({
      login: true,
      getSubProcessToken: true,
      getKey: true,
    }),
  ];
  private defaultClaims?: string[];

  constructor(private options: ProtectorServiceOptions<AuthClaims>) {
    super();
  }

  private getCredentials(providerId: string, provider: string) {
    return this.options.repository?.get(provider, providerId);
  }

  prepare(): Promise<void> {
    this.defaultClaims = Object.keys(this.options.claims).filter((claim) => {
      return this.options.claims[claim as keyof ClaimConfiguration<AuthClaims>]
        .default;
    });

    return Promise.resolve();
  }

  override async getKey(): Promise<string> {
    return utils.exportKey(this.options.privateKey);
  }

  override async login(loginInfo: {
    provider: string;
    token: string;
  }): Promise<string> {
    const provider = this.options.authProviders.find(
      (provider) => provider.getType() === loginInfo.provider
    );

    if (!provider) {
      throw new SkhailError({
        name: "denied",
        message: "Unknown provider",
      });
    }

    const clientId = await provider.verifyToken(loginInfo.token);
    const internalClient = this.options.internalClients?.find(
      (client) => client.id === clientId
    );
    let credentials =
      internalClient ??
      (await this.getCredentials(clientId, provider.getType()));

    if (!credentials) {
      if (!this.options.repository?.create) {
        throw new SkhailError({
          name: "denied",
          message: "Wrong credentials",
        });
      }

      const obfuscatedId = v4();
      credentials = await this.options.repository.create(
        provider.getType(),
        clientId,
        {
          id: obfuscatedId,
          claims: [],
        }
      );

      if (!credentials) {
        throw new SkhailError({
          name: "unexpected",
          message: "Newly created credentials not found",
        });
      }

      this.network.emit("created", [credentials.id]);
    }

    const claims = [...(this.defaultClaims || []), ...credentials.claims];

    const authInfo: Omit<AuthInfo, "iat" | "exp"> = {
      id: credentials.id,
      claims,
    };

    this.options.repository?.login?.(authInfo);

    this.network.emit("login", [authInfo.id]);

    return utils.sign(
      authInfo,
      this.options.privateKey,
      this.options.tokenExpiration || 3600
    );
  }

  override async getSubProcessToken(
    claims: string[],
    expiration: number = 3600
  ): Promise<string> {
    const { authInfo } = this.context?.data ?? {};

    if (!authInfo) {
      throw new SkhailError({
        message: "You must be logged in to perform this action",
        name: "denied",
      });
    }

    const notOverlappingClaims = claims.filter(
      (claim) => !authInfo.claims.includes(claim)
    );

    if (notOverlappingClaims.length > 0) {
      throw new SkhailError({
        message: "You don't have permission to perform this action",
        name: "denied",
      });
    }

    return utils.sign(
      { ...authInfo, claims },
      this.options.privateKey,
      expiration
    );
  }
}
