import { ISkhailClient, SkhailError, getError } from "@skhail/core";

import { ProtectorContext, KeyUtils, AuthClient } from "@skhail/auth";

import { ISkhailAuthenticationService } from "../Shared";
import { AuthClientOptions, getPrivateKey } from "./utils";
import { ClientSkhailAuthProvider } from "./SkhailClientAuthProvider";
import { SkhailUserIdentity } from "./SkhailUserIdentity";

export class SkhailAuthClient<
  Context extends ProtectorContext
> extends AuthClient<Context> {
  private privateKey?: KeyUtils.Key;

  constructor(
    client: ISkhailClient<Context>,
    private skhailOptions: AuthClientOptions
  ) {
    super(client, {
      token: skhailOptions.token,
      providers: [new ClientSkhailAuthProvider(skhailOptions)],
    });

    this.privateKey = skhailOptions.privateKey;
  }

  private async getPrivateKey() {
    this.privateKey =
      this.privateKey ?? (await getPrivateKey(this.skhailOptions));

    return this.privateKey;
  }

  /**
   * Request the server to register this client id and public key pair
   * @returns Result of the register action
   */
  async register() {
    const privateKey = await this.getPrivateKey();
    if (!privateKey) {
      throw getError("No private key provided can't register");
    }

    const publicKey = await KeyUtils.exportKey(privateKey);

    return super
      .get(ISkhailAuthenticationService)
      .register({ id: this.skhailOptions.id, publicKey });
  }

  /**
   * Will send a login request and refresh requested permissions
   * The login process will sign a token using the private key and send this to the server with the id.
   * The server will verify the signature on the sent signed id with the public key registered using the register method
   * The server will then generate a token using it's private key and send it back to the client
   * This token is used for future requests, using the get method
   *
   */
  async login() {
    return super.login("skhail");
  }

  /**
   * Retrieve the keyId and public key in order to share it
   * @returns [client_id, public_key]
   */
  async getClientInfo(): Promise<[string, string | undefined]> {
    const privateKey = await this.getPrivateKey();
    if (!privateKey) {
      return [this.skhailOptions.id, undefined];
    }

    const publicKey = await KeyUtils.exportKey(privateKey);

    return [this.skhailOptions.id, publicKey];
  }

  async getIdentity() {
    const privateKey = await this.getPrivateKey();

    if (!privateKey) {
      throw new SkhailError({
        message: "No private key provided can't get identity",
        name: "denied",
      });
    }

    return new SkhailUserIdentity(this.skhailOptions.id, privateKey);
  }
}
