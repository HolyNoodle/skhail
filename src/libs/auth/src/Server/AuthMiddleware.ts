import {
  SkhailError,
  getError,
  Middleware,
  SkhailService,
  IEnveloppe,
} from "@skhail/core";
import {
  ProtectorContext,
  ProtectionOptions,
  IAuthenticationService,
  AuthInfo,
  ProtectionMethod,
} from "../Shared";
import * as utils from "../Shared/utils";

async function getAuthInfo(
  token: string,
  publicKey: utils.Key
): Promise<AuthInfo> {
  try {
    const info = await utils.verify<AuthInfo>(token, publicKey);
    return info;
  } catch (err) {
    throw getError(err, undefined, {
      name: "denied",
      message: "Invalid authentication token",
    });
  }
}

async function checkUserClaims(
  info: AuthInfo,
  protectionOption: string[] | ProtectionMethod | boolean,
  args: any[],
  service: SkhailService<ProtectorContext>
): Promise<void> {
  if (protectionOption === true) {
    return;
  }

  if (typeof protectionOption === "function") {
    await protectionOption(info, args, service);

    return;
  }

  if (Array.isArray(protectionOption)) {
    const hasAccess = protectionOption.some((claim) =>
      info.claims.includes(claim)
    );

    if (hasAccess) {
      return;
    }
  }

  throw new SkhailError({
    name: "denied",
    message: "Insufficient user privileges",
  });
}

export class AuthMiddleware<Service extends SkhailService<ProtectorContext>>
  implements Middleware<ProtectorContext>
{
  public id = "auth";
  private publicKey?: utils.Key;
  constructor(private options: ProtectionOptions<Service, ProtectorContext>) {}

  async prepare(service: SkhailService<ProtectorContext>, depth: number = 0) {
    const maxIteration = 5;
    return new Promise<void>((resolve, reject) => {
      const exec = async () => {
        try {
          const rawPublicKey = await service
            .get(IAuthenticationService)
            .getKey();

          this.publicKey = await utils.readKey(rawPublicKey);

          resolve();
        } catch (ex: any) {
          if (depth >= maxIteration) {
            reject(Error(`Can't get key after ${depth} attempts`));

            return;
          }

          service
            .getLogger()
            .error(
              `Auth middleware failed to initialize, retrying ${depth + 1}/5`,
              ex.toObject()
            );

          setTimeout(() => {
            this.prepare(service, depth + 1)
              .then(resolve)
              .catch(reject);
          }, 500);
        }
      };

      exec().catch(reject);
    });
  }

  cleanup() {
    this.publicKey = undefined;

    return Promise.resolve();
  }

  async process(enveloppe: IEnveloppe<any>, service: SkhailService<any>) {
    const protectionOption: any =
      this.options[enveloppe.method as keyof Service];

    // Guest info
    let info: AuthInfo = {
      id: "guest",
      claims: [],
    } as any;

    if (enveloppe.context?.data?.token) {
      if (!this.publicKey) {
        throw new SkhailError({
          name: "unexpected",
          message: "Middleware not initialized, public key missing",
        });
      }

      info = await getAuthInfo(enveloppe.context?.data?.token, this.publicKey);
    }

    await checkUserClaims(info, protectionOption, enveloppe.args, service);

    return {
      token: enveloppe.context?.data?.token,
      authInfo: info,
    };
  }
}
