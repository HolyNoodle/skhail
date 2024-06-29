/**
 * @group unit
 */
import { SkhailUserIdentity } from "./SkhailUserIdentity";

import * as auth from "@skhail/auth";

describe("SkhailUserIdentity", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create a new instance", () => {
    const identity = new SkhailUserIdentity("test", {} as any);
    expect(identity).toBeDefined();
  });

  it("should return the id", () => {
    const identity = new SkhailUserIdentity("test", {} as any);
    expect(identity.getId()).toBe("test");
  });

  it("should return the public key", async () => {
    const identity = new SkhailUserIdentity("test", "privateKey" as any);

    const spy = jest
      .spyOn(auth.KeyUtils, "exportKey")
      .mockReturnValue("public");

    expect(await identity.getPublicKey()).toBe("public");

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("privateKey", false);
  });

  it("should sign data", async () => {
    const identity = new SkhailUserIdentity("test", "privateKey" as any);

    const spy = jest
      .spyOn(auth.KeyUtils, "sign")
      .mockResolvedValue("signature");

    expect(await identity.sign("data")).toBe("signature");

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("data", "privateKey");
  });

  it("should decrypt data", async () => {
    const identity = new SkhailUserIdentity("test", "privateKey" as any);

    const spy = jest
      .spyOn(auth.KeyUtils, "decrypt")
      .mockResolvedValue(Buffer.from("decrypted"));

    expect(await identity.decrypt("encrypted")).toEqual(
      Buffer.from("decrypted")
    );

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("encrypted", "privateKey");
  });

  it("should encrypt data", async () => {
    const identity = new SkhailUserIdentity("test", "privateKey" as any);

    const spyExport = jest
      .spyOn(auth.KeyUtils, "exportKey")
      .mockResolvedValue("publicKey" as never);

    const spyRead = jest
      .spyOn(auth.KeyUtils, "readKey")
      .mockResolvedValue("publicKey" as any);

    const spyEncrypt = jest
      .spyOn(auth.KeyUtils, "encrypt")
      .mockResolvedValue("encrypted");

    expect(await identity.encrypt("data")).toBe("encrypted");

    expect(spyExport).toHaveBeenCalledTimes(1);
    expect(spyExport).toHaveBeenCalledWith("privateKey", false);

    expect(spyRead).toHaveBeenCalledTimes(1);
    expect(spyRead).toHaveBeenCalledWith("publicKey");

    expect(spyEncrypt).toHaveBeenCalledTimes(1);
    expect(spyEncrypt).toHaveBeenCalledWith("data", "publicKey");
  });

  it("should verify data", async () => {
    const identity = new SkhailUserIdentity("test", "privateKey" as any);

    const spyExport = jest
      .spyOn(auth.KeyUtils, "exportKey")
      .mockResolvedValue("publicKey" as never);

    const spyRead = jest
      .spyOn(auth.KeyUtils, "readKey")
      .mockResolvedValue("publicKey" as any);

    const spyVerify = jest
      .spyOn(auth.KeyUtils, "verify")
      .mockResolvedValue("verified");

    expect(await identity.verify("data")).toBe("verified");

    expect(spyExport).toHaveBeenCalledTimes(1);
    expect(spyExport).toHaveBeenCalledWith("privateKey", false);

    expect(spyRead).toHaveBeenCalledTimes(1);
    expect(spyRead).toHaveBeenCalledWith("publicKey");

    expect(spyVerify).toHaveBeenCalledTimes(1);
    expect(spyVerify).toHaveBeenCalledWith("data", "publicKey");
  });
});
