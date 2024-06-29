import WebSocket from "isomorphic-ws";
import { ReadableStream } from "@skhail/stream-isomorphic";

export class ReadableSocketStream {
  private lockPromise?: Promise<void>;
  public bytesReceived = 0;
  public readonly readable: ReadableStream<ArrayBuffer>;

  constructor(socket: WebSocket) {
    this.readable = new ReadableStream({
      start: (controller) => {
        // Listen on sender socket to send data
        socket.onmessage = (message: WebSocket.MessageEvent) => {
          controller.enqueue(message.data as ArrayBuffer);
          this.bytesReceived += (message.data as ArrayBuffer).byteLength;

          // If we did not pause yet and we have no memory left in the controller
          if (
            !this.lockPromise &&
            controller.desiredSize !== null &&
            controller.desiredSize < 1
          ) {
            // Signal the sender to pause the stream
            socket.send("pau");

            this.lockPromise = new Promise<void>((resolve) => {
              // Check every 5ms the state of the controller
              const timer = setInterval(() => {
                // If we did not resume yet and there is memory available in the controller
                if (
                  this.lockPromise &&
                  controller.desiredSize !== null &&
                  controller.desiredSize > 0
                ) {
                  // Signal the sender to resume the stream
                  socket.send("res");
                  clearInterval(timer);

                  this.lockPromise = undefined;
                  resolve();
                }
              }, 5);
            });
          }
        };
        socket.onerror = (err) => {
          controller.error(err);
        };
        socket.onclose = () => {
          controller.close();
        };
      },
    });
  }
}
