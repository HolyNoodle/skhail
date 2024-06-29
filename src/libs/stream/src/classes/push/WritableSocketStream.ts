import WebSocket from "isomorphic-ws";
import { WritableStream } from "@skhail/stream-isomorphic";

export class WritableSocketStream {
  private lockPromise?: Promise<void>;
  public bytesSent = 0;
  public readonly writable: WritableStream<ArrayBuffer>;

  constructor(socket: WebSocket) {
    this.writable = new WritableStream<ArrayBuffer>({
      start: (controller) => {
        this.bytesSent = 0;
        socket.onerror = (err) => {
          controller.error(err);
        };

        // Listening to event from the receiver
        socket.onmessage = (msg) => {
          // If receiver ask for pause
          if (msg.toString() === "pau" && !this.lockPromise) {
            this.lockPromise = new Promise<void>((resolve) => {
              socket.onmessage = (msg) => {
                // If receive ask for resume and we did not already resume stream
                if (msg.toString() === "res" && this.lockPromise) {
                  // Resume stream
                  this.lockPromise = undefined;
                  resolve();
                }
              };
            });
          }
        };
      },
      close: () => {
        socket.close();
      },
      write: async (chunk) => {
        // If stream is paused by receiver, wait for it to be resumed
        await this.lockPromise;

        socket.send(chunk);
        this.bytesSent += chunk.byteLength;
      },
    });
  }
}
