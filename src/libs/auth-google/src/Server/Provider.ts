import { OAuth2Client } from "google-auth-library";
import { AuthenticationProvider } from "@skhail/auth";

export class GoogleAuthProvider implements AuthenticationProvider {
  constructor(private options: { clientId: string; client: OAuth2Client }) {}

  getType(): string {
    return "google";
  }

  async verifyToken(token: string): Promise<string> {
    const ticket = await this.options.client.verifyIdToken({
      idToken: token,
      audience: this.options.clientId,
    });

    const payload = ticket.getPayload();

    if (!payload) {
      throw new Error("Invalid token");
    }

    const userid = payload["sub"];

    return userid;
  }
}
