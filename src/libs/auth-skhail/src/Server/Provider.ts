import { AuthenticationProvider, KeyUtils } from "@skhail/auth";

export class SkhailAuthProvider implements AuthenticationProvider {
  constructor(
    private options: {
      privateKey: KeyUtils.Key;
    }
  ) {}

  getType(): string {
    return "skhail";
  }

  async verifyToken(token: string): Promise<string> {
    const info = await KeyUtils.verify<{ id: string }>(
      token,
      this.options.privateKey
    );

    return info.id;
  }
}
