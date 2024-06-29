import * as jose from "node-jose";
import * as forge from "node-forge";

export type Key = jose.JWK.Key;

export async function readKey(key: Buffer | string): Promise<Key> {
  return await jose.JWK.asKey(key.toString(), "json");
}

export function exportKey(jwkKey: Key, isPrivate: boolean = false) {
  return JSON.stringify(jwkKey.toJSON(isPrivate));
}

export function createNewKeyStore() {
  return jose.JWK.createKeyStore();
}

export function encrypt(value: string, publicKey: Key) {
  const encrypt = jose.JWE.createEncrypt(publicKey);
  encrypt.update(value);

  return encrypt.final();
}

export async function decrypt(value: string, privateKey: Key) {
  const decrypt = jose.JWE.createDecrypt(privateKey);

  return (await decrypt.decrypt(value)).payload;
}

export async function readStore(store: Buffer | string) {
  return await jose.JWK.asKeyStore(store.toString());
}

export async function createNewPrivateKey(
  store: jose.JWK.KeyStore,
  passPhrase?: string
) {
  let seedString = passPhrase;

  if (seedString === undefined) {
    seedString = Math.random().toString(36).substring(7);
  }

  const seed = Buffer.from(seedString, "utf-8").toString("hex");
  const prng = forge.random.createInstance();
  prng.seedFileSync = () => seed;

  const key = forge.pki.rsa.generateKeyPair({
    bits: 2048,
    prng,
  });

  const pem = forge.pki.privateKeyToPem(key.privateKey);
  const joseKey = await jose.JWK.asKey(pem, "pem");

  await store.add(joseKey);

  return joseKey;
}

export async function sign(payload: any, key: Key, expiration: number = 3600) {
  const iat = Math.round(Date.now() / 1000);
  const exp = iat + expiration;
  const signer = jose.JWS.createSign(
    {
      alg: "RS256",
    },
    key
  );
  signer.update(JSON.stringify({ ...payload, iat, exp }));

  const signed: any = await signer.final();

  return `${signed.signatures[0].protected}.${signed.payload}.${signed.signatures[0].signature}`;
}

export async function verify<T>(token: string, key: Key) {
  const result = await jose.JWS.createVerify(key, {
    algorithms: ["RS256"],
  }).verify(token);

  return JSON.parse(result.payload.toString()) as T;
}

export function decode<T>(token: string) {
  const base64Url = token.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const jsonPayload = decodeURIComponent(
    Buffer.from(base64, "base64")
      .toString("utf-8")
      .split("")
      .map(function (c) {
        return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
      })
      .join("")
  );

  return JSON.parse(jsonPayload) as T;
}
