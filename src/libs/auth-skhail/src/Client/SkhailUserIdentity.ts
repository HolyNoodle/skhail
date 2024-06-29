import { KeyUtils } from "@skhail/auth";

export class SkhailUserIdentity {
  constructor(
    private readonly id: string,
    private readonly privateKey: KeyUtils.Key
  ) {}

  getId(): string {
    return this.id;
  }

  getPublicKey(): string {
    return KeyUtils.exportKey(this.privateKey, false);
  }

  sign(payload: any): Promise<string> {
    return KeyUtils.sign(payload, this.privateKey);
  }

  decrypt(data: string): Promise<Buffer> {
    return KeyUtils.decrypt(data, this.privateKey);
  }

  async encrypt(data: string) {
    const publicKeyString = await KeyUtils.exportKey(this.privateKey, false);
    const publicKey = await KeyUtils.readKey(publicKeyString);

    return KeyUtils.encrypt(data, publicKey);
  }

  async verify(data: string) {
    const publicKeyString = await KeyUtils.exportKey(this.privateKey, false);
    const publicKey = await KeyUtils.readKey(publicKeyString);

    return KeyUtils.verify(data, publicKey);
  }
}
