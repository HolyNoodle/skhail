/**
 * @group unit
 */
import { KeyUtils } from "@skhail/auth";
import { SkhailAuthProvider } from "./Provider";

export enum AppClaims {
  TEST = "test",
  TEST2 = "test2",
}

describe("SkhailAuthProvider", () => {
  it("Should instantiate SkhailAuthProvider", async () => {
    const provider = new SkhailAuthProvider({
      privateKey: "private key" as any,
    });

    expect(provider).toBeInstanceOf(SkhailAuthProvider);
  });

  it("Should return type", async () => {
    // Arrange
    const provider = new SkhailAuthProvider({
      privateKey: "private key" as any,
    });

    // Act
    const type = provider.getType();

    // Assert
    expect(type).toBe("skhail");
  });

  it("Should verify token", async () => {
    // Arrange
    const provider = new SkhailAuthProvider({
      privateKey: "private key" as any,
    });
    const verify = jest
      .spyOn(KeyUtils, "verify")
      .mockResolvedValue({ id: "test_id" } as any);

    // Act
    const result = await provider.verifyToken("test token");

    // Assert
    expect(result).toBe("test_id");

    expect(verify).toHaveBeenCalledTimes(1);
    expect(verify).toHaveBeenCalledWith("test token", "private key");
  });
});
