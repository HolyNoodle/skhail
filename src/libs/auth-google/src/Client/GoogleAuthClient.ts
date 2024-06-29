import { ISkhailClient } from "@skhail/core";

import { ProtectorContext, AuthClient } from "@skhail/auth";

import { ClientGoogleAuthProvider } from "./ClientGoogleAuthProvider";

export class GoogleAuthClient<
  Context extends ProtectorContext
> extends AuthClient<Context> {
  constructor(
    client: ISkhailClient<Context>,
    skhailOptions: { idToken: string; token?: string }
  ) {
    super(client, {
      token: skhailOptions.token,
      providers: [
        new ClientGoogleAuthProvider({ idToken: skhailOptions.idToken }),
      ],
    });
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
    return super.login("google");
  }
}
