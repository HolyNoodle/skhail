/**
 * @group unit
 */
import { IAuthenticationService, KeyUtils } from "@skhail/auth";
import { GoogleAuthClient } from "./GoogleAuthClient";

import * as Provider from "./ClientGoogleAuthProvider";

describe("AuthClient", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("Should instantiate AuthClient", () => {
    const skhailClient = { skhail: "client" };
    const client = new GoogleAuthClient(skhailClient as any, {
      idToken: "test id token",
    });

    expect(client).toBeInstanceOf(GoogleAuthClient);
  });

  describe("login", () => {
    it("Should call skhail client authentication login with sign token", async () => {
      const authService = { login: jest.fn() };

      const skhailClient = {
        skhail: "client",
        get: jest.fn().mockReturnValueOnce(authService),
      };

      const client = new GoogleAuthClient(skhailClient as any, {
        idToken: "test id token",
      });

      await client.login();

      expect(skhailClient.get).toHaveBeenCalledTimes(1);
      expect(skhailClient.get).toHaveBeenNthCalledWith(
        1,
        IAuthenticationService
      );

      expect(authService.login).toHaveBeenCalledTimes(1);
      expect(authService.login).toHaveBeenCalledWith({
        provider: "google",
        token: "test id token",
      });
    });

    it("Should intanciate client from token and be able to access without login", async () => {
      const service = { register: jest.fn() };
      const skhailClient = {
        skhail: "client",
        get: jest.fn().mockReturnValue(service),
      };
      const client = new GoogleAuthClient(skhailClient as any, {
        idToken: "test id token",
        token: "test token",
      });

      await client.get(IAuthenticationService);

      expect(skhailClient.get).toHaveBeenCalledTimes(1);
      expect(skhailClient.get).toHaveBeenCalledWith(
        IAuthenticationService,
        { token: "test token" },
        undefined
      );
    });
  });
});
