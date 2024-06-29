import { NodeProcess, SkhailService } from "@skhail/core";
import { HTTPInterface } from "@skhail/http";

// This import is not from the root package. This is to separate browser/server elements
// The HTTPInterface is built to be used in browser and nodejs
// But the APIService requires nodejs http libs
import { APIService } from "@skhail/http/dist/server";

class HelloWorldService extends SkhailService {
  static identifier = "HelloWorldService";

  async hello(name: string) {
    return `Hello ${name}!`;
  }
}

const start = async () => {
  const serverProcess = new NodeProcess(process, [
    new HelloWorldService(),
    new APIService(), // We add the ApiService from @skhail/http
  ]);

  await serverProcess.start();

  // As we are going to contact the server through a service
  // We declare the http client that will contact the service
  const client = new HTTPInterface();

  // We start the client to initiate the connection to the server
  await client.start();

  // We use the client instead to get the service
  const response = await client.get(HelloWorldService).hello("world");

  console.log(response);

  // We stop the client
  await client.stop();
  await serverProcess.stop();
};

start();
