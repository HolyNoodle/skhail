import {
  Constructor,
  IRequestContext,
  ISkhailClient,
  SkhailService,
  ServiceFunctions,
  getError,
} from "@skhail/core";

import {
  AuthInfo,
  ClientAuthProvider,
  IAuthenticationService,
  ProtectorContext,
} from "../Shared";

import * as utils from "../Shared/utils";

export type AuthClientOptions = {
  token?: string;
  providers: ClientAuthProvider[];
};

export class AuthClient<Context extends ProtectorContext>
  implements ISkhailClient<Context>
{
  private token?: string;
  private listeners: Map<string, Function[]>;
  constructor(
    private client: ISkhailClient<ProtectorContext>,
    private options: AuthClientOptions
  ) {
    this.token = options.token;
    this.listeners = new Map();
  }

  on(event: "login" | "logout", listener: any) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    this.listeners.get(event)!.push(listener);
  }

  private emit(event: "login" | "logout", args: any[]) {
    this.listeners.get(event)?.forEach((listener) => {
      listener(...args);
    });
  }

  /**
   * Initialize the client
   * @returns
   */
  async start(): Promise<void> {
    await this.client.start();
  }

  /**
   * Cleanup the client's memory
   * @returns
   */
  stop(): Promise<void> {
    return this.client.stop();
  }

  /**
   * Retrieve the service communication interface
   * @param type Type of the service
   * @param context Context to provide to the requests
   * @param forwardedContext Parent context
   * @returns Service communication interface
   */
  get<Service extends SkhailService<ProtectorContext>>(
    type: Constructor<Service>,
    context?: ProtectorContext,
    forwardedContext?: IRequestContext<ProtectorContext>
  ): ServiceFunctions<Service, ProtectorContext> {
    const finalContext =
      this.token !== undefined
        ? {
            ...(context ?? {}),
            token: this.token,
          }
        : context;

    return this.client.get(type, finalContext, forwardedContext);
  }

  /**
   * Will send a login request and refresh requested permissions
   * The login process will sign a token using the private key and send this to the server with the id.
   * The server will verify the signature on the sent signed id with the public key registered using the register method
   * The server will then generate a token using it's private key and send it back to the client
   * This token is used for future requests, using the get method
   *
   * @param expiration Login information expiration time. The closest to 0, the better for security. Beware that a too low value can prevent login to happen
   */
  async login(provider: string) {
    const authProvider = this.options.providers.find(
      (authProvider) => authProvider.getType() === provider
    );

    if (!authProvider) {
      throw getError("No provider found");
    }

    if (this.token) {
      this.emit("login", [this.token]);

      return;
    }

    const loginToken = await authProvider.login(this);

    this.token = await this.client
      .get(IAuthenticationService)
      .login({ token: loginToken, provider });

    this.emit("login", [this.token]);
  }

  /**
   * Will reset the in memory token
   */
  async logout() {
    this.token = undefined;

    this.emit("logout", []);
  }

  /**
   * Decode the current token and return the information
   * @returns Client token info or undefined if not logged in
   */
  async getAuthInfo() {
    if (!this.token) {
      return undefined;
    }

    return utils.decode<AuthInfo>(this.token);
  }
}
