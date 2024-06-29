import { Middleware, NodeProcess, SkhailService } from "@skhail/core";
import { HTTPInterface } from "@skhail/http";
import { APIService } from "@skhail/http/dist/server";
import {
  AuthenticationService,
  ProtectorContext,
  AuthMiddleware,
} from "@skhail/auth/dist/server";
import { AuthClient, KeyUtils } from "@skhail/auth";
import { SkhailAuthClient } from "@skhail/auth-skhail";
import {
  SkhailAuthenticationService,
  SkhailAuthProvider,
} from "@skhail/auth-skhail/dist/server";

// This example is more complex. Ensure you have gone through both previous examples:
// hello-world and hello-world-http

// We define an enum equivalent so it's easier to carry the claims around
enum AppClaims {
  HELLO = "hello",
}

// We must set the context type in order to help typings
// ProtectorContext carries the token and AuthInfo
class HelloWorldService extends SkhailService<ProtectorContext> {
  static identifier = "HelloWorldService";
  static middlewares: Middleware<any, any>[] = [
    new AuthMiddleware<HelloWorldService>({
      hello: [AppClaims.HELLO], // Accessible by client having the hello claim, multiple claims is processed as an OR
      protected: false, // Not accessible, by default for all methods
      public: true, // Accessible by any client, even not logged or registered
    }),
  ];

  async public(name: string) {
    return `Hello ${name}!`;
  }

  async hello() {
    // Let's use the client id
    return `Hello ${this.context.data?.authInfo?.id}!`;
  }

  async protected(name: string) {
    return `Hello ${name}!`;
  }
}

// We define a key store to store our keys
const store = KeyUtils.createNewKeyStore();

const start = async () => {
  // We create a new random private key
  const privateKey = await KeyUtils.createNewPrivateKey(store);
  // We need a private key for the admin client
  const clientPrivateKey = await KeyUtils.createNewPrivateKey(store);

  const serverProcess = new NodeProcess(process, [
    new HelloWorldService(),
    new APIService(),
    new AuthenticationService<AppClaims>({
      privateKey,
      authProviders: [
        new SkhailAuthProvider({
          privateKey,
        }),
      ],
      internalClients: [
        {
          provider: "skhail",
          id: "hello-world-client",
          claims: [AppClaims.HELLO],
        },
      ],
      claims: {
        [AppClaims.HELLO]: {
          default: true, // When loggin in, the client gets all default claims
        },
      },
    }), // We add the AuthenticationService from @skhail/http
    new SkhailAuthenticationService({
      privateKey,
      internalClients: [
        {
          id: "hello-world-client",
          publicKey: KeyUtils.exportKey(clientPrivateKey),
        },
      ],
    }),
  ]);

  await serverProcess.start();

  const httpClient = new HTTPInterface();

  // The auth client will wrap any skhail client to set up auth
  const client = new SkhailAuthClient(httpClient, {
    id: "hello-world-client", // Unique id of the client, equivalent of the login
    privateKey: clientPrivateKey, // Private key associated with the client id, equivalent of password
  });

  await client.start();

  // We can access public methods
  // The bellow lines could be achieved with any skhail client for public methods
  const responsePublic = await client.get(HelloWorldService).public("world");
  console.log(responsePublic);

  // As this client is an internal one, there is no need to register it
  // For external clients, it should be registered
  // await client.register();

  // But to access protected methods we need to register the client
  await client.login(); // After being registered we can login

  // Once logged in, we can access
  const response = await client.get(HelloWorldService).hello();

  console.log(response);

  try {
    // Accessing protected should not work
    await client.get(HelloWorldService).protected("world");

    console.log("If you see that, something went wrong");
  } catch (error) {
    console.log("As expected, it failed:", error);
  }

  await client.stop();
  await serverProcess.stop();
};

start();
