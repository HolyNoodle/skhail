import { Middleware, SkhailError } from "@skhail/core";
import { AuthInfo, KeyUtils } from "@skhail/auth";
import { AuthMiddleware } from "@skhail/auth/dist/server";
import { IInternalCredentials, ISkhailAuthenticationService } from "../Shared";

export interface SkhailClientRepository {
  get(id: string): Promise<IInternalCredentials | undefined>;
  create?(client: IInternalCredentials): Promise<void>;
  delete(id: string): Promise<void>;
}

export type SkhailAuthenticationServiceOptions = {
  privateKey: KeyUtils.Key;
  repository?: SkhailClientRepository;
  loginTokenExpiration?: number;
  internalClients?: IInternalCredentials[];
};

export class SkhailAuthenticationService extends ISkhailAuthenticationService {
  static middlewares: Middleware<any, any>[] = [
    new AuthMiddleware<ISkhailAuthenticationService>({
      register: true,
      login: true,
      unregister: true,
    }),
  ];

  constructor(private options: SkhailAuthenticationServiceOptions) {
    super();
  }

  async unregister(clientInfo: { id: string }) {
    const { id: credentialId } = this.context?.data?.authInfo ?? {};

    if (!credentialId) {
      throw new SkhailError({
        name: "denied",
        message: "You must be logged in to perform this action",
      });
    }

    if (clientInfo.id === credentialId) {
      throw new SkhailError({
        name: "denied",
        message: "Can't unregister your own credentials",
      });
    }

    await this.options.repository?.delete(clientInfo.id);

    await this.network.emit("deleted", [clientInfo.id]);
  }

  async register(clientInfo: { id: string; publicKey: string }): Promise<void> {
    if (!this.options.repository?.create) {
      throw new SkhailError({
        name: "denied",
        message: "Registration is disabled",
      });
    }

    const internalClient = this.options.internalClients?.find(
      (client) => client.id === clientInfo.id
    );
    const credentials =
      internalClient ?? (await this.options.repository.get(clientInfo.id));

    if (credentials) {
      throw new SkhailError({
        name: "denied",
        message: "Id already exists",
      });
    }

    const newCredentials: IInternalCredentials = {
      id: clientInfo.id,
      publicKey: clientInfo.publicKey,
    };

    await this.options.repository.create(newCredentials);

    await this.network.emit("created", [newCredentials.id]);
  }

  async login(loginInfo: { id: string; signedToken: string }): Promise<string> {
    const internalCred = this.options.internalClients?.find(
      (cred) => cred.id === loginInfo.id
    );
    const credentials =
      internalCred ?? (await this.options.repository?.get(loginInfo.id));

    if (!credentials) {
      throw new SkhailError({
        name: "denied",
        message: "Wrong credentials",
      });
    }

    const key = await KeyUtils.readKey(credentials.publicKey);
    await KeyUtils.verify<AuthInfo>(loginInfo.signedToken, key);

    return KeyUtils.sign(
      { id: credentials.id },
      this.options.privateKey,
      this.options.loginTokenExpiration ?? 5000
    );
  }
}
