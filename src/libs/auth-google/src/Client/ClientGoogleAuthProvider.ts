import { ClientAuthProvider } from "@skhail/auth";

export class ClientGoogleAuthProvider implements ClientAuthProvider {
  constructor(
    private options: {
      idToken: string;
    }
  ) {}

  getType(): string {
    return "google";
  }
  async login(): Promise<string> {
    return this.options.idToken;
  }
}
