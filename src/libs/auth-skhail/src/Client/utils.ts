import { KeyUtils } from "@skhail/auth";

export const getPrivateKey = async ({
  privateKey,
  passphrase,
}: {
  privateKey?: KeyUtils.Key;
  passphrase?: string;
}) => {
  if (passphrase && !privateKey) {
    const store = KeyUtils.createNewKeyStore();
    return await KeyUtils.createNewPrivateKey(store, passphrase);
  }

  return privateKey;
};

export type AuthClientOptions = {
  id: string;
  loginTokenExpiration?: number;
} & (
  | {
      privateKey: KeyUtils.Key;
      token?: never;
      passphrase?: never;
    }
  | {
      privateKey?: never;
      token: string;
      passphrase?: never;
    }
  | {
      privateKey?: never;
      token?: never;
      passphrase: string;
    }
);
