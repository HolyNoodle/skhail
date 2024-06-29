/**
 * @group unit
 */
import * as utils from "./utils";

import * as crypto from "crypto";

Object.defineProperty(global, "crypto", {
  value: {
    subtle: crypto.webcrypto.subtle,
  },
});

describe("createNewPrivateKey", () => {
  it("Should create new key", async () => {
    const store = utils.createNewKeyStore();
    const key = await utils.createNewPrivateKey(store);

    expect(key).toBeDefined();
    expect(store.get(key.kid)).toStrictEqual(key);
  });

  it("Should create same key twice with passPhrase", async () => {
    const store = utils.createNewKeyStore();
    const firstKey = await utils.createNewPrivateKey(store, "test my sentence");
    const secondKey = await utils.createNewPrivateKey(
      store,
      "test my sentence"
    );

    expect(firstKey).toBeDefined();
    expect(secondKey).toBeDefined();
    expect(firstKey).toStrictEqual(secondKey);
  });

  it("Should not create same key twice with different passPhrase", async () => {
    const store = utils.createNewKeyStore();
    const firstKey = await utils.createNewPrivateKey(store, "test my sentence");
    const secondKey = await utils.createNewPrivateKey(
      store,
      "test my sentences"
    );

    expect(firstKey).toBeDefined();
    expect(secondKey).toBeDefined();
    expect(firstKey).not.toStrictEqual(secondKey);
  });
});

describe("sign", () => {
  it("Should sign", async () => {
    const store = utils.createNewKeyStore();
    const key = await utils.createNewPrivateKey(store);

    const token = await utils.sign({ test: "name" }, key);

    const info = await utils.verify(token, key);
    expect(info).toMatchObject({
      test: "name",
    });
  });
});

describe("verify", () => {
  it("Should verify with public key", async () => {
    const store = utils.createNewKeyStore();
    const privateKey = await utils.createNewPrivateKey(store);
    const publicKey = await utils.readKey(await utils.exportKey(privateKey));

    const token = await utils.sign({ test: "name" }, privateKey);

    const info = await utils.verify(token, publicKey);
    expect(info).toMatchObject({
      test: "name",
    });
  });
});

describe("decode", () => {
  it("Should decode token", async () => {
    const store = utils.createNewKeyStore();
    const privateKey = await utils.createNewPrivateKey(store);

    const token = await utils.sign({ test: "name" }, privateKey);

    const info = await utils.decode(token);
    expect(info).toMatchObject({
      test: "name",
    });
  });
});

describe("readStore", () => {
  it("Should decode token", async () => {
    const store = utils.createNewKeyStore();

    await utils.createNewPrivateKey(store);

    const jsonStore = store.toJSON();

    const newStore = await utils.readStore(JSON.stringify(jsonStore));

    expect(store.toJSON()).toStrictEqual(newStore.toJSON());
  });
});

describe("encrypt/decrypt", () => {
  let privateKey: any;
  let publicKey: any;

  beforeAll(async () => {
    const store = utils.createNewKeyStore();

    privateKey = await utils.createNewPrivateKey(store);

    const publicKeyString = await utils.exportKey(privateKey);

    publicKey = await utils.readKey(publicKeyString);
  });

  it("Should encrypt and decrypt data", async () => {
    const encrypted = await utils.encrypt("test", publicKey);

    const result = await utils.decrypt(encrypted, privateKey);

    expect(result.toString()).toBe("test");

    expect(encrypted).not.toBe("test");
  });

  it("Should fail to decrypt with wrong key", async () => {
    const store = utils.createNewKeyStore();

    const encrypted = await utils.encrypt("test", publicKey);

    const wrongKey = await utils.createNewPrivateKey(
      store,
      "I am not the right passphrase !"
    );

    await expect(utils.decrypt(encrypted, wrongKey)).rejects.toThrow(
      "no key found"
    );
    expect(encrypted).not.toBe("test");
  });
});
