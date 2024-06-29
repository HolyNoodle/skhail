import { NodeProcess, SkhailService } from "@skhail/core";

// Define a service class
// It must extends from SkhailService
class HelloWorldService extends SkhailService {
  // A service MUST have an identifier
  static identifier = "HelloWorldService";

  // An function, MUST be async to be callable in the system
  async hello(name: string) {
    // Whatever logic
    return `Hello ${name}!`;
  }
}

const main = async () => {
  // We declare a node process with the list of service we want
  const serverProcess = new NodeProcess(process, [new HelloWorldService()]);

  // We then start the server
  await serverProcess.start();

  // We can query the server to execute the function define on our service
  const response = await serverProcess
    .getServer() // get the server
    .get(HelloWorldService) // get the service
    .hello("world"); // execute the function

  console.log(response); // Should be "Hello world!"

  // We stop the server
  await serverProcess.stop();
};

main();
