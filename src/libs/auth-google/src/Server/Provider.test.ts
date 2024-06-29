/**
 * @group unit
 */
import { KeyUtils } from "@skhail/auth";
import { GoogleAuthProvider } from "./Provider";

export enum AppClaims {
  TEST = "test",
  TEST2 = "test2",
}

describe("GoogleAuthProvider", () => {
  it("Should instantiate GoogleAuthProvider", async () => {
    const provider = new GoogleAuthProvider({
      clientId: "client id",
      client: {
        verifyIdToken: jest.fn().mockResolvedValue({ getPayload: jest.fn() }),
      } as any,
    });

    expect(provider).toBeInstanceOf(GoogleAuthProvider);
  });

  it("Should return type", async () => {
    // Arrange
    const provider = new GoogleAuthProvider({
      clientId: "client id",
      client: {
        verifyIdToken: jest.fn().mockResolvedValue({ getPayload: jest.fn() }),
      } as any,
    });

    // Act
    const type = provider.getType();

    // Assert
    expect(type).toBe("google");
  });

  it("Should verify token", async () => {
    // Arrange
    const verifyIdToken = jest.fn().mockResolvedValue({
      getPayload: jest.fn().mockReturnValue({ sub: "test_id" }),
    });
    const provider = new GoogleAuthProvider({
      clientId: "client id",
      client: {
        verifyIdToken,
      } as any,
    });

    // Act
    const result = await provider.verifyToken("test token");

    // Assert
    expect(result).toBe("test_id");

    expect(verifyIdToken).toHaveBeenCalledTimes(1);
    expect(verifyIdToken).toHaveBeenCalledWith({
      audience: "client id",
      idToken: "test token",
    });
  });

  it("Should fail when token is invalid", async () => {
    // Arrange
    const verifyIdToken = jest.fn().mockResolvedValue({
      getPayload: jest.fn().mockReturnValue(undefined),
    });
    const provider = new GoogleAuthProvider({
      clientId: "client id",
      client: {
        verifyIdToken,
      } as any,
    });

    // Act
    // Assert
    await expect(provider.verifyToken("test token")).rejects.toThrow(
      "Invalid token"
    );
  });
});
