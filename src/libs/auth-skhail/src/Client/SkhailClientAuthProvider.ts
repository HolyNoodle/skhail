import * as jose from "node-jose";

import { ISkhailClient, getError } from "@skhail/core";

import { ClientAuthProvider, ProtectorContext, KeyUtils } from "@skhail/auth";

import { ISkhailAuthenticationService } from "../Shared";
import { AuthClientOptions, getPrivateKey } from "./utils";

export class ClientSkhailAuthProvider implements ClientAuthProvider {
  constructor(private options: AuthClientOptions) {}

  getType(): string {
    return "skhail";
  }
  async login(client: ISkhailClient<ProtectorContext>): Promise<string> {
    const privateKey = await getPrivateKey(this.options);
    if (!privateKey) {
      throw getError("No token or private key provided can't login");
    }

    const signedToken = await KeyUtils.sign(
      { rng: Math.random() },
      privateKey,
      this.options.loginTokenExpiration || 5
    );

    return client
      .get(ISkhailAuthenticationService)
      .login({ id: this.options.id, signedToken });
  }
}
